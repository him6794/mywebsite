import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { post } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

export default function Login() {
  const { t } = usePreferences()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await post('/login', Object.fromEntries(new FormData(event.currentTarget).entries()))
      navigate('/admin')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="login-section">
      <Card className="login-card">
        <CardHeader>
          <LockKeyhole size={23} />
          <p className="section-label">{t('PRIVATE AREA')}</p>
          <CardTitle className="login-title">{t('Welcome back.')}</CardTitle>
          <p>{t('Sign in to manage your site.')}</p>
        </CardHeader>
        <CardContent>
          <form className="site-form" onSubmit={submit}>
            <div className="form-field">
              <Label htmlFor="username">{t('Username')}</Label>
              <Input id="username" name="username" autoComplete="username" required />
            </div>
            <div className="form-field">
              <Label htmlFor="password">{t('Password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p role="alert" className="form-message error">
                {error}
              </p>
            )}
            <Button className="submit-button" disabled={pending} type="submit">
              {pending ? t('Signing in...') : t('Sign in')} <ArrowRight size={17} />
            </Button>
          </form>
          <Link className="back-link" to="/">
            {t('← Back to site')}
          </Link>
        </CardContent>
      </Card>
    </section>
  )
}
