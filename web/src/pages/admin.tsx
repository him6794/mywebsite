import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  FileText,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ErrorState, Loading } from '@/components/content'
import { post, put, remove, type AdminItem, type Session } from '@/lib/api'
import { useResource } from '@/lib/use-resource'
import { usePreferences } from '@/lib/preferences'

const MarkdownPreview = lazy(() => import('@/components/markdown-preview'))

type Resource = 'posts' | 'projects' | 'experience' | 'skills' | 'friends' | 'comments' | 'contacts'
type Field = {
  name: string
  label: string
  type?: 'textarea' | 'number' | 'url' | 'select'
  required?: boolean
}
type Config = {
  label: string
  singular: string
  fields: Field[]
  icon: typeof FileText
  create: boolean
}
const configs: Record<Resource, Config> = {
  posts: {
    label: 'Posts',
    singular: 'Post',
    icon: FileText,
    create: true,
    fields: [
      { name: 'Title', label: 'Title', required: true },
      { name: 'Slug', label: 'URL slug (leave blank to generate)' },
      { name: 'Tags', label: 'Tags (comma-separated)' },
      { name: 'Content', label: 'Article (Markdown)', type: 'textarea', required: true },
    ],
  },
  projects: {
    label: 'Projects',
    singular: 'Project',
    icon: FolderGit2,
    create: true,
    fields: [
      { name: 'Title', label: 'Title', required: true },
      { name: 'Description', label: 'Description', type: 'textarea' },
      { name: 'Image', label: 'Image URL or static path' },
      { name: 'GithubURL', label: 'Source URL', type: 'url' },
      { name: 'DemoURL', label: 'Demo URL', type: 'url' },
    ],
  },
  experience: {
    label: 'Experience',
    singular: 'Experience',
    icon: Briefcase,
    create: true,
    fields: [
      { name: 'Title', label: 'Role', required: true },
      { name: 'Company', label: 'Organisation' },
      { name: 'Period', label: 'Period' },
      { name: 'Description', label: 'Description', type: 'textarea' },
      { name: 'Order', label: 'Display order', type: 'number' },
    ],
  },
  skills: {
    label: 'Skills',
    singular: 'Skill',
    icon: Wrench,
    create: true,
    fields: [
      { name: 'Name', label: 'Name', required: true },
      { name: 'Category', label: 'Category' },
      { name: 'Icon', label: 'Icon class (optional)' },
    ],
  },
  friends: {
    label: 'Friends',
    singular: 'Friend',
    icon: Users,
    create: false,
    fields: [
      { name: 'Name', label: 'Site name', required: true },
      { name: 'URL', label: 'Website URL', type: 'url', required: true },
      { name: 'Logo', label: 'Logo URL', type: 'url' },
      { name: 'Description', label: 'Description', type: 'textarea' },
      { name: 'Status', label: 'Status', type: 'select' },
    ],
  },
  comments: {
    label: 'Comments',
    singular: 'Comment',
    icon: MessageCircle,
    create: false,
    fields: [],
  },
  contacts: { label: 'Messages', singular: 'Message', icon: Mail, create: false, fields: [] },
}
const resources = Object.keys(configs) as Resource[]

function asRecord(item: AdminItem): Record<string, unknown> {
  return item as unknown as Record<string, unknown>
}
function itemTitle(item: AdminItem, resource: Resource, fallback = 'Untitled'): string {
  const value = asRecord(item)
  return String(
    value[
      resource === 'skills'
        ? 'Name'
        : resource === 'comments'
          ? 'AuthorName'
          : resource === 'contacts'
            ? 'Subject'
            : 'Title'
    ] ||
      value.Name ||
      fallback,
  )
}

function Overview() {
  const { t } = usePreferences()
  const { data, loading, error } = useResource<{
    posts: number
    projects: number
    pendingFriends: number
    pendingComments: number
    unreadContacts: number
    visitsToday: number
    totalVisits: number
  }>('/admin/overview')
  const entries: { label: string; value: number; to?: string }[] = data
    ? [
        { label: 'Published posts', value: data.posts, to: 'posts' },
        { label: 'Projects', value: data.projects, to: 'projects' },
        { label: 'Friend requests', value: data.pendingFriends, to: 'friends' },
        { label: 'Comments to review', value: data.pendingComments, to: 'comments' },
        { label: 'Unread messages', value: data.unreadContacts, to: 'contacts' },
        { label: 'Visits today', value: data.visitsToday },
        { label: 'Total visits', value: data.totalVisits },
      ]
    : []
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="section-label">{t('OVERVIEW')}</p>
          <h1>{t('Your workspace.')}</h1>
          <p>{t('Everything in one place, without the noise.')}</p>
        </div>
        <Link to="/" className="text-link">
          {t('View site')} <ArrowUpRight size={16} />
        </Link>
      </div>
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <div className="overview-grid">
          {entries.map((entry) =>
            entry.to ? (
              <Link key={entry.label} to={`/admin/${entry.to}`} className="overview-tile">
                <span>{t(entry.label)}</span>
                <strong>{entry.value}</strong>
                <ArrowUpRight size={17} />
              </Link>
            ) : (
              <div key={entry.label} className="overview-tile">
                <span>{t(entry.label)}</span>
                <strong>{entry.value}</strong>
              </div>
            ),
          )}
        </div>
      )}
    </>
  )
}

function Editor({
  resource,
  item,
  onSave,
  onCancel,
}: {
  resource: Resource
  item: AdminItem | null
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = usePreferences()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [markdown, setMarkdown] = useState(String(item ? (asRecord(item).Content ?? '') : ''))
  const [preview, setPreview] = useState(false)
  const config = configs[resource]
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<
      string,
      string | number
    >
    if (resource === 'experience') fields.Order = Number(fields.Order) || 0
    try {
      if (item) await put(`/admin/${resource}/${item.ID}`, fields)
      else await post(`/admin/${resource}`, fields)
      onSave()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }
  return (
    <Card className="editor-card">
      <CardHeader>
        <CardTitle>
          {t(item ? 'Edit {item}' : 'New {item}', {
            item: t(config.singular).toLowerCase(),
          })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="site-form" onSubmit={submit}>
          {config.fields.map((field) => (
            <div className="form-field" key={field.name}>
              <Label htmlFor={`edit-${field.name}`}>{t(field.label)}</Label>
              {field.type === 'textarea' ? (
                <>
                  <Textarea
                    id={`edit-${field.name}`}
                    name={field.name}
                    rows={field.name === 'Content' ? 15 : 4}
                    defaultValue={String(item ? (asRecord(item)[field.name] ?? '') : '')}
                    onChange={
                      field.name === 'Content'
                        ? (event) => setMarkdown(event.target.value)
                        : undefined
                    }
                    required={field.required}
                  />
                  {field.name === 'Content' && (
                    <>
                      <Button
                        className="preview-toggle"
                        type="button"
                        variant="outline"
                        onClick={() => setPreview((value) => !value)}
                      >
                        {t(preview ? 'Hide preview' : 'Preview article')}
                      </Button>
                      {preview && (
                        <Suspense fallback={<Loading />}>
                          <MarkdownPreview content={markdown} />
                        </Suspense>
                      )}
                    </>
                  )}
                </>
              ) : field.type === 'select' ? (
                <select
                  className="admin-select"
                  id={`edit-${field.name}`}
                  name={field.name}
                  defaultValue={String(
                    item ? (asRecord(item)[field.name] ?? 'pending') : 'pending',
                  )}
                >
                  <option value="pending">{t('Pending')}</option>
                  <option value="approved">{t('Approved')}</option>
                </select>
              ) : (
                <Input
                  id={`edit-${field.name}`}
                  name={field.name}
                  type={field.type || 'text'}
                  defaultValue={String(item ? (asRecord(item)[field.name] ?? '') : '')}
                  required={field.required}
                />
              )}
            </div>
          ))}
          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}
          <div className="editor-actions">
            <Button type="submit" disabled={pending}>
              {pending ? t('Saving...') : t('Save changes')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('Cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Collection({ resource }: { resource: Resource }) {
  const { t } = usePreferences()
  const config = configs[resource]
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useResource<{ items: AdminItem[] }>(
    `/admin/${resource}?v=${version}`,
  )
  const [editing, setEditing] = useState<AdminItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<AdminItem | null>(null)
  const [actionError, setActionError] = useState('')
  function refresh() {
    setEditing(null)
    setVersion((v) => v + 1)
  }
  async function update(item: AdminItem, change: Record<string, boolean | string>) {
    setActionError('')
    try {
      await put(`/admin/${resource}/${item.ID}`, { ...asRecord(item), ...change })
      refresh()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }
  async function deleteItem() {
    if (!deleting) return
    setActionError('')
    try {
      await remove(`/admin/${resource}/${deleting.ID}`)
      setDeleting(null)
      refresh()
    } catch (err) {
      setActionError((err as Error).message)
      setDeleting(null)
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="section-label">
            {t('CONTENT / {section}', { section: t(config.label).toUpperCase() })}
          </p>
          <h1>
            {t(config.label)}
            <span className="accent">.</span>
          </h1>
          <p>{t('Manage {items} on your site.', { items: t(config.label).toLowerCase() })}</p>
        </div>
        {config.create && (
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> {t('Add {item}', { item: t(config.singular).toLowerCase() })}
          </Button>
        )}
      </div>
      {editing && (
        <Editor
          key={editing === 'new' ? 'new' : editing.ID}
          resource={resource}
          item={editing === 'new' ? null : editing}
          onSave={refresh}
          onCancel={() => setEditing(null)}
        />
      )}
      {actionError && (
        <p role="alert" className="form-message error">
          {actionError}
        </p>
      )}
      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <Card className="collection-card">
          <CardContent>
            <div className="table-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(config.singular)}</TableHead>
                    <TableHead>{t('Details')}</TableHead>
                    <TableHead className="actions-head">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.length ? (
                    data.items.map((item) => {
                      const value = asRecord(item)
                      const detail =
                        resource === 'posts'
                          ? String(value.Slug || '')
                          : resource === 'experience'
                            ? String(value.Company || '')
                            : resource === 'skills'
                              ? String(value.Category || '')
                              : resource === 'contacts'
                                ? String(value.Name || '')
                                : resource === 'comments'
                                  ? t('Post #{id}', { id: String(value.PostID) })
                                  : String(value.Description || value.URL || '')
                      return (
                        <TableRow key={item.ID}>
                          <TableCell>
                            <div className="item-title">
                              {itemTitle(item, resource, t('Untitled'))}
                            </div>
                            {resource === 'comments' && (
                              <p className="item-preview">{String(value.Content || '')}</p>
                            )}
                            {resource === 'contacts' && (
                              <p className="item-preview">{String(value.Message || '')}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="item-detail">{detail}</span>
                            {resource === 'friends' && (
                              <Badge
                                variant={value.Status === 'approved' ? 'secondary' : 'outline'}
                              >
                                {t(String(value.Status))}
                              </Badge>
                            )}
                            {resource === 'comments' && (
                              <Badge variant={value.IsApproved ? 'secondary' : 'outline'}>
                                {t(value.IsApproved ? 'Approved' : 'Pending')}
                              </Badge>
                            )}
                            {resource === 'contacts' && (
                              <Badge variant={value.IsRead ? 'secondary' : 'outline'}>
                                {t(value.IsRead ? 'Read' : 'Unread')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="row-actions">
                              {config.fields.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditing(item)}
                                  aria-label={`${t('Edit')} ${itemTitle(item, resource, t('Untitled'))}`}
                                >
                                  <Pencil size={14} /> {t('Edit')}
                                </Button>
                              )}
                              {resource === 'friends' && value.Status !== 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => update(item, { Status: 'approved' })}
                                >
                                  {t('Approve')}
                                </Button>
                              )}
                              {resource === 'comments' && (
                                <Button
                                  size="sm"
                                  onClick={() => update(item, { IsApproved: !value.IsApproved })}
                                >
                                  {t(value.IsApproved ? 'Unapprove' : 'Approve')}
                                </Button>
                              )}
                              {resource === 'contacts' && (
                                <Button
                                  size="sm"
                                  onClick={() => update(item, { IsRead: !value.IsRead })}
                                >
                                  {t(value.IsRead ? 'Mark unread' : 'Mark read')}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleting(item)}
                                aria-label={`${t('Delete')} ${itemTitle(item, resource, t('Untitled'))}`}
                              >
                                <Trash2 size={15} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="empty-note">
                        {t('Nothing here yet.')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('Delete {item}?', { item: t(config.singular).toLowerCase() })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone. “{item}” will be removed permanently.', {
                item: deleting ? itemTitle(deleting, resource, t('Untitled')) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteItem}>
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function Admin() {
  const { t } = usePreferences()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: session, loading } = useResource<Session>('/session')
  const segment = location.pathname.split('/')[2]
  const resource = resources.includes(segment as Resource) ? (segment as Resource) : null
  async function logout() {
    await post('/logout', {})
    navigate('/login')
  }
  if (loading) return <Loading />
  if (!session?.authenticated) return <Navigate to="/login" replace />
  return (
    <section className="admin-area">
      <div className="shell admin-grid">
        <aside className="admin-sidebar">
          <div className="sidebar-heading">
            <p className="section-label">{t('WORKSPACE')}</p>
            <strong>{session.username}</strong>
          </div>
          <nav aria-label={t('Admin navigation')}>
            <Link className={!resource ? 'active' : ''} to="/admin">
              <LayoutDashboard size={17} /> {t('Overview')}
            </Link>
            {resources.map((key) => {
              const Icon = configs[key].icon
              return (
                <Link key={key} to={`/admin/${key}`} className={resource === key ? 'active' : ''}>
                  <Icon size={17} /> {t(configs[key].label)}
                </Link>
              )
            })}
          </nav>
          <button className="logout-link" onClick={logout}>
            <LogOut size={17} /> {t('Sign out')}
          </button>
          <Link className="back-link" to="/">
            <ArrowLeft size={16} /> {t('Back to site')}
          </Link>
        </aside>
        <div className="admin-content" key={resource || 'overview'}>
          {resource ? <Collection resource={resource} /> : <Overview />}
        </div>
      </div>
    </section>
  )
}
