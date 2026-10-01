import { useState, type FormEvent } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { ErrorState, Loading, PageIntro } from '@/components/content'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { post, type Friend } from '@/lib/api'
import { useResource } from '@/lib/use-resource'
import { usePreferences } from '@/lib/preferences'
import { imageURL } from '@/lib/api'

export default function Friends() {
  const { t } = usePreferences()
  const { data, loading, error: loadError } = useResource<{ friends: Friend[] }>('/friends')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setStatus('')
    setError('')
    try {
      const result = await post<{ message: string }>(
        '/friends',
        Object.fromEntries(new FormData(form).entries()),
      )
      setStatus(result.message)
      form.reset()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <PageIntro
        index="04"
        label="GOOD COMPANY"
        title="Better work,"
        emphasis="together."
        description="A small corner of the web for people and places worth knowing."
      />
      <section className="section-pad friends-section">
        <div className="shell">
          <p className="section-label">{t('THE DIRECTORY')}</p>
          {loading && <Loading />}
          {loadError && <ErrorState message={loadError} />}
          {data &&
            (data.friends.length ? (
              <div className="friend-grid">
                {data.friends.map((friend) => (
                  <a
                    className="friend-card"
                    key={friend.ID}
                    href={friend.URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="friend-avatar">
                      {friend.Logo ? (
                        <img
                          src={imageURL(friend.Logo)}
                          alt=""
                          loading="lazy"
                          width="54"
                          height="54"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        friend.Name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h2>{friend.Name}</h2>
                      <p>{friend.Description}</p>
                    </div>
                    <ArrowUpRight size={20} />
                  </a>
                ))}
              </div>
            ) : (
              <p className="empty-note">
                {t('A good directory starts with the first connection.')}
              </p>
            ))}
        </div>
      </section>
      <section className="section-pad friend-apply">
        <div className="shell contact-grid">
          <div className="contact-aside">
            <p className="section-label">{t('SAY HELLO')}</p>
            <h2>
              {t('Have a site')}
              <br />
              {t('to share')}
              <span className="accent">?</span>
            </h2>
            <p>
              {t(
                'Send over the link. Applications are reviewed before they appear in the directory.',
              )}
            </p>
          </div>
          <Card className="contact-card">
            <CardContent>
              <form className="site-form" onSubmit={submit}>
                <div className="form-field">
                  <Label htmlFor="friend-name">{t('Site name')}</Label>
                  <Input
                    id="friend-name"
                    name="name"
                    placeholder={t('Your site’s name')}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="friend-url">{t('Website URL')}</Label>
                  <Input
                    id="friend-url"
                    name="url"
                    type="url"
                    placeholder="https://example.com"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="friend-logo">
                    {t('Logo URL')} <span className="optional">{t('(optional)')}</span>
                  </Label>
                  <Input
                    id="friend-logo"
                    name="logo"
                    type="url"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="friend-description">{t('A short introduction')}</Label>
                  <Textarea
                    id="friend-description"
                    name="description"
                    rows={3}
                    placeholder={t('What’s it about?')}
                    maxLength={200}
                  />
                </div>
                {error && (
                  <p role="alert" className="form-message error">
                    {error}
                  </p>
                )}
                {status && (
                  <p role="status" className="form-message success">
                    {status}
                  </p>
                )}
                <Button type="submit" className="submit-button" disabled={pending}>
                  {pending ? t('Submitting...') : t('Submit site')} <ArrowUpRight size={17} />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
