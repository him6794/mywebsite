import { lazy, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Layout } from '@/components/layout'
import { Loading } from '@/components/content'
import { api } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

const Home = lazy(() => import('@/pages/home'))
const Portfolio = lazy(() => import('@/pages/portfolio'))
const Experience = lazy(() => import('@/pages/experience'))
const Blog = lazy(() => import('@/pages/blog'))
const Post = lazy(() => import('@/pages/post'))
const Friends = lazy(() => import('@/pages/friends'))
const Contact = lazy(() => import('@/pages/contact'))
const Login = lazy(() => import('@/pages/login'))
const Admin = lazy(() => import('@/pages/admin'))

function isPublicPage(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return (
    ['/', '/portfolio', '/experience', '/blog', '/friends', '/contact'].includes(path) ||
    (/^\/blog\/[^/]+$/.test(path) && path !== '/blog/random')
  )
}

function PageTitle() {
  const location = useLocation()
  const { t } = usePreferences()
  const lenis = useRef<Lenis | null>(null)
  const visitedPathname = useRef<string | null>(null)

  useEffect(() => {
    const pathname = location.pathname
    if (visitedPathname.current === pathname) return
    visitedPathname.current = pathname
    if (isPublicPage(pathname)) {
      void api('/visit', { method: 'POST' }).catch(() => undefined)
    }
  }, [location.pathname])

  useEffect(() => {
    const instance = new Lenis({
      anchors: true,
      autoRaf: true,
      lerp: 0.04,
      respectReducedMotion: true,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      wheelMultiplier: 0.9,
    })
    lenis.current = instance
    return () => {
      instance.destroy()
      lenis.current = null
    }
  }, [])

  useEffect(() => {
    const section = location.pathname.split('/')[1]
    const title =
      (
        {
          portfolio: 'Work',
          experience: 'Expertise',
          blog: 'Writing',
          friends: 'Friends',
          contact: 'Contact',
          login: 'Sign in',
          admin: 'Workspace',
        } as Record<string, string>
      )[section] || 'Software engineer'
    document.title = `${t(title)} — Justin`
  }, [location.pathname, t])
  useEffect(() => {
    if (lenis.current) lenis.current.scrollTo(0, { immediate: true })
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])
  return null
}

function RandomRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    api<{ slug: string }>('/posts/random')
      .then(({ slug }) => navigate(`/blog/${slug}`, { replace: true }))
      .catch(() => navigate('/blog', { replace: true }))
  }, [navigate])
  return <Loading />
}

function LogoutRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    api('/logout', { method: 'POST' }).finally(() => navigate('/', { replace: true }))
  }, [navigate])
  return <Loading />
}

function NotFound() {
  const { t } = usePreferences()
  return (
    <section className="not-found shell">
      <p className="section-label">{t('404 / WRONG TURN')}</p>
      <h1>
        {t('Nothing here')}
        <span className="accent">.</span>
      </h1>
      <p>{t('The page you’re looking for may have moved.')}</p>
      <Link className="text-link" to="/">
        {t('Back to the beginning ↗')}
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <PageTitle />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="experience" element={<Experience />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/random" element={<RandomRedirect />} />
          <Route path="blog/:slug" element={<Post />} />
          <Route path="friends" element={<Friends />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="logout" element={<LogoutRedirect />} />
          <Route path="admin" element={<Admin />} />
          <Route path="admin/:section" element={<Admin />} />
          <Route path="admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
