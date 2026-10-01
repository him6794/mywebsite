import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState, Loading } from '@/components/content'
import { Turnstile } from '@/components/turnstile'
import { dateLabel, imageURL, post as send, type Post, type PostDetail } from '@/lib/api'
import { useResource } from '@/lib/use-resource'
import { usePreferences } from '@/lib/preferences'

function PostNext({
  item,
  label,
  arrow,
}: {
  item: Post | null
  label: string
  arrow: 'left' | 'right'
}) {
  if (!item) return <span />
  return (
    <Link to={`/blog/${item.slug}`} className="post-nav-link">
      <span>
        {arrow === 'left' ? <ArrowLeft size={17} /> : null}
        {label}
        {arrow === 'right' ? <ArrowRight size={17} /> : null}
      </span>
      <strong>{item.title}</strong>
    </Link>
  )
}

export default function PostPage() {
  const { language, t } = usePreferences()
  const { slug } = useParams()
  const { data, loading, error } = useResource<{
    post: PostDetail
    previous: Post | null
    next: Post | null
  }>(`/posts/${encodeURIComponent(slug || '')}`)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [formError, setFormError] = useState('')
  const [token, setToken] = useState('')
  const [checkVersion, setCheckVersion] = useState(0)
  const {
    data: config,
    loading: configLoading,
    error: configError,
  } = useResource<{ turnstileSiteKey: string }>('/config')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setStatus('')
    setFormError('')
    try {
      const result = await send<{ message: string }>(
        `/posts/${encodeURIComponent(slug || '')}/comments`,
        { ...Object.fromEntries(new FormData(form).entries()), 'cf-turnstile-response': token },
      )
      setStatus(result.message)
      form.reset()
      setToken('')
      setCheckVersion((value) => value + 1)
    } catch (err) {
      setFormError((err as Error).message)
      if (config?.turnstileSiteKey) {
        setToken('')
        setCheckVersion((value) => value + 1)
      }
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="article-section section-pad">
      <div className="shell article-shell">
        <Link className="back-link" to="/blog">
          <ArrowLeft size={16} /> {t('All writing')}
        </Link>
        {loading && <Loading />}
        {error && <ErrorState message={error} />}
        {data && (
          <>
            <header className="article-header">
              <p className="section-label">
                {t('FIELD NOTE')} <span className="label-index">/</span>{' '}
                {dateLabel(data.post.createdAt, language)}
              </p>
              <h1>{data.post.title}</h1>
              <div className="article-meta">
                <span>{t('By {author}', { author: data.post.author || 'Justin' })}</span>
                <span>{data.post.tags || t('Writing')}</span>
              </div>
            </header>
            <article className="markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target={href?.startsWith('http') ? '_blank' : undefined}
                      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {children}
                    </a>
                  ),
                  img: ({ src, alt }) => (
                    <img src={imageURL(src || '')} alt={alt || ''} loading="lazy" />
                  ),
                }}
              >
                {data.post.content}
              </ReactMarkdown>
            </article>
            <div className="post-navigation">
              <PostNext item={data.next} label={t('Newer article')} arrow="left" />
              <PostNext item={data.previous} label={t('Older article')} arrow="right" />
            </div>
            <section className="comments-section" aria-labelledby="comments-title">
              <div className="comments-heading">
                <p className="section-label">{t('THE CONVERSATION')}</p>
                <h2 id="comments-title">
                  {t('Comments')} <span>({data.post.comments.length})</span>
                </h2>
              </div>
              {data.post.comments.length ? (
                <div className="comment-list">
                  {data.post.comments.map((comment) => (
                    <article className="comment" key={comment.id}>
                      <div className="comment-avatar" aria-hidden="true">
                        {comment.authorName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="comment-top">
                          <strong>{comment.authorName}</strong>
                          <span>{dateLabel(comment.createdAt)}</span>
                        </div>
                        <p>{comment.content}</p>
                        <button
                          type="button"
                          className="reply-link"
                          onClick={() => {
                            const input = document.getElementById(
                              'comment-content',
                            ) as HTMLTextAreaElement | null
                            if (input) {
                              input.value = `@${comment.authorName} ${input.value}`
                              input.focus()
                            }
                          }}
                        >
                          {t('Reply')} <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-comments">{t('Be the first to join the conversation.')}</p>
              )}
              <h3>{t('Leave a comment')}</h3>
              <form className="site-form comment-form" onSubmit={submit}>
                <div className="form-two">
                  <div className="form-field">
                    <Label htmlFor="comment-name">{t('Name')}</Label>
                    <Input name="authorName" id="comment-name" required maxLength={80} />
                  </div>
                  <div className="form-field">
                    <Label htmlFor="comment-email">
                      {t('Email')} <span className="optional">{t('(not published)')}</span>
                    </Label>
                    <Input
                      name="authorEmail"
                      id="comment-email"
                      type="email"
                      required
                      maxLength={120}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <Label htmlFor="comment-content">{t('Comment content')}</Label>
                  <Textarea
                    name="content"
                    id="comment-content"
                    rows={4}
                    required
                    maxLength={5000}
                  />
                </div>
                {config?.turnstileSiteKey && (
                  <Turnstile
                    key={checkVersion}
                    siteKey={config.turnstileSiteKey}
                    onToken={setToken}
                  />
                )}
                {configError && (
                  <p className="form-message error" role="alert">
                    {t('Security check unavailable: {error}', { error: configError })}
                  </p>
                )}
                {formError && (
                  <p role="alert" className="form-message error">
                    {formError}
                  </p>
                )}
                {status && (
                  <p role="status" className="form-message success">
                    {status}
                  </p>
                )}
                <Button
                  className="submit-button"
                  type="submit"
                  disabled={
                    pending ||
                    configLoading ||
                    !!configError ||
                    (!!config?.turnstileSiteKey && !token)
                  }
                >
                  {pending ? t('Submitting...') : t('Submit comment')} <ArrowUpRight size={17} />
                </Button>
              </form>
            </section>
          </>
        )}
      </div>
    </section>
  )
}
