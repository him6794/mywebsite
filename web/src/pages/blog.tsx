import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Search, Shuffle, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState, Loading, PageIntro } from '@/components/content'
import { api, dateLabel, excerpt, type Post } from '@/lib/api'
import { useResource } from '@/lib/use-resource'
import { usePreferences } from '@/lib/preferences'

function BlogSearch({ query, onSearch }: { query: string; onSearch: (search: string) => void }) {
  const { t } = usePreferences()
  const [search, setSearch] = useState(query)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(search)
  }
  return (
    <form className="blog-search" onSubmit={submit} role="search">
      <Search size={19} aria-hidden="true" />
      <Input
        aria-label={t('Search posts')}
        placeholder={t('Search articles...')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Button type="submit">{t('Search')}</Button>
    </form>
  )
}

export default function Blog() {
  const { language, t } = usePreferences()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const tag = params.get('tag') || ''
  const [randomError, setRandomError] = useState('')
  const navigate = useNavigate()
  const { data, loading, error } = useResource<{ posts: Post[]; tags: string[] }>(
    `/posts?${params.toString()}`,
  )
  function submit(search: string) {
    const next = new URLSearchParams(params)
    if (search.trim()) next.set('q', search.trim())
    else next.delete('q')
    setParams(next)
  }
  function selectTag(nextTag: string) {
    const next = new URLSearchParams(params)
    if (nextTag) next.set('tag', nextTag)
    else next.delete('tag')
    setParams(next)
  }
  async function randomPost() {
    setRandomError('')
    try {
      const { slug } = await api<{ slug: string }>('/posts/random')
      navigate(`/blog/${slug}`)
    } catch (err) {
      setRandomError((err as Error).message)
    }
  }
  return (
    <>
      <PageIntro
        index="03"
        label="NOTES & IDEAS"
        title="Thinking"
        emphasis="out loud."
        description="Notes on building things, figuring things out, and everything in between."
      />
      <section className="section-pad blog-section">
        <div className="shell blog-layout">
          <div>
            <BlogSearch key={query} query={query} onSearch={submit} />
            <div className="filter-row">
              <span>{t('FILTER /')}</span>
              <button
                type="button"
                className={!tag ? 'selected' : ''}
                onClick={() => selectTag('')}
              >
                {t('All topics')}
              </button>
              {data?.tags.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={tag === item ? 'selected' : ''}
                  onClick={() => selectTag(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            {(query || tag) && (
              <button type="button" className="clear-filter" onClick={() => setParams({})}>
                <X size={14} /> {t('Clear filters')}
              </button>
            )}
            {loading && <Loading />}
            {error && <ErrorState message={error} />}
            {data &&
              (data.posts.length ? (
                <div className="post-list">
                  {data.posts.map((post) => (
                    <article className="post-list-item" key={post.id}>
                      <p className="post-date">
                        {dateLabel(post.createdAt, language)} <span>·</span>{' '}
                        {post.tags || t('NOTES')}
                      </p>
                      <h2>
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      </h2>
                      <p>{excerpt(post.content, 180)}</p>
                      <Link className="text-link" to={`/blog/${post.slug}`}>
                        {t('Read article')} <ArrowRight size={17} />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-note">
                  {t('No articles match your search. Try a different term.')}
                </div>
              ))}
          </div>
          <aside className="blog-aside">
            <p className="section-label">{t('EXPLORATION')}</p>
            <h2>
              {t('Something')}
              <br />
              {t('unexpected?')}
            </h2>
            <p>{t('Take a different path through the archive.')}</p>
            <Button variant="outline" onClick={randomPost}>
              <Shuffle size={16} /> {t('Surprise me')}
            </Button>
            {randomError && (
              <p role="alert" className="form-message error">
                {randomError}
              </p>
            )}
            {tag && <Badge variant="secondary">{t('Browsing: {tag}', { tag })}</Badge>}
          </aside>
        </div>
      </section>
    </>
  )
}
