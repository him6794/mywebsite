import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Code2 } from 'lucide-react'
import { PageIntro } from '@/components/content'
import { Turnstile } from '@/components/turnstile'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { post } from '@/lib/api'
import { useResource } from '@/lib/use-resource'
import { usePreferences } from '@/lib/preferences'

export default function Contact() {
  const { t } = usePreferences()
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
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
    const fields = Object.fromEntries(new FormData(form).entries())
    setPending(true)
    setError('')
    setStatus('')
    try {
      const result = await post<{ message: string }>('/contact', {
        ...fields,
        'cf-turnstile-response': token,
      })
      setStatus(result.message)
      form.reset()
      setToken('')
      setCheckVersion((value) => value + 1)
    } catch (err) {
      setError((err as Error).message)
      if (config?.turnstileSiteKey) {
        setToken('')
        setCheckVersion((value) => value + 1)
      }
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <PageIntro
        index="05"
        label="GET IN TOUCH"
        title="Let’s make"
        emphasis="something good."
        description="Have a question, a project, or just an idea worth sharing? I’d love to hear it."
      />
      <section className="section-pad contact-section">
        <div className="shell contact-grid">
          <div className="contact-aside">
            <p className="section-label">{t('A DIRECT LINE')}</p>
            <h2>
              {t('Start wherever')}
              <br />
              {t('you are')}
              <span className="accent">.</span>
            </h2>
            <p>
              {t(
                'A little context goes a long way, but you don’t need a perfect brief to get in touch. Tell me what’s on your mind.',
              )}
            </p>
            <a
              className="text-link"
              href="https://github.com/him6794"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Code2 size={18} /> {t('Find me on GitHub')} <ArrowUpRight size={16} />
            </a>
          </div>
          <Card className="contact-card">
            <CardContent>
              <form className="site-form" onSubmit={submit}>
                <div className="form-two">
                  <div className="form-field">
                    <Label htmlFor="contact-name">{t('Your name')}</Label>
                    <Input
                      id="contact-name"
                      name="name"
                      placeholder={t('How should I address you?')}
                      required
                      maxLength={80}
                    />
                  </div>
                  <div className="form-field">
                    <Label htmlFor="contact-email">{t('Email address')}</Label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      maxLength={120}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <Label htmlFor="contact-subject">{t('What’s this about?')}</Label>
                  <Input
                    id="contact-subject"
                    name="subject"
                    placeholder={t('A few words about your idea')}
                    required
                    maxLength={200}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="contact-message">{t('Your message')}</Label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    placeholder={t('Tell me a little more...')}
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
                {error && (
                  <p className="form-message error" role="alert">
                    {error}
                  </p>
                )}
                {status && (
                  <p className="form-message success" role="status">
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
                  {pending ? t('Sending...') : t('Send message')} <ArrowUpRight size={17} />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
