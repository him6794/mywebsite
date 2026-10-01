import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './site.css'
import 'lenis/dist/lenis.css'
import App from './App.tsx'
import { initializeAppearance, PreferencesProvider } from '@/lib/preferences'

initializeAppearance()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </StrictMode>,
)
