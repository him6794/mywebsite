import { useEffect, useRef, useState } from 'react'
import { usePreferences } from '@/lib/preferences'

type WidgetOptions = {
  sitekey: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: WidgetOptions) => string
      remove: (id: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => {
      if (window.turnstile) resolve()
      else {
        script.remove()
        scriptPromise = null
        reject(new Error('Security check is unavailable.'))
      }
    }
    script.onerror = () => {
      script.remove()
      scriptPromise = null
      reject(new Error('Security check could not load. Please try again.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string
  onToken: (token: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const { t } = usePreferences()

  useEffect(() => {
    if (!siteKey) return
    let active = true
    let widgetId = ''
    loadScript()
      .then(() => {
        if (!active || !container.current || !window.turnstile) return
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => {
            onToken('')
            setError('Security check failed. Please refresh and try again.')
          },
        })
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message)
      })
    return () => {
      active = false
      if (widgetId) window.turnstile?.remove(widgetId)
    }
  }, [siteKey, onToken])

  if (!siteKey) return null
  return (
    <div className="turnstile-check">
      <div ref={container} />
      {error && (
        <p role="alert" className="form-message error">
          {t(error)}
        </p>
      )}
    </div>
  )
}
