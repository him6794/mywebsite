import { Suspense, useLayoutEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/content'
import { usePreferences } from '@/lib/preferences'
import { imageURL } from '@/lib/api'

const revealSelector =
  '.page-hero, main > section:not(.hero), .project-card, .writing-row, .timeline-entry, .post-list-item, .friend-card, .overview-tile'

const links = [
  { to: '/portfolio', label: 'Work' },
  { to: '/experience', label: 'Expertise' },
  { to: '/blog', label: 'Writing' },
  { to: '/friends', label: 'Friends' },
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { language, theme, toggleLanguage, toggleTheme, t } = usePreferences()

  useLayoutEffect(() => {
    const main = document.getElementById('main-content')
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!main || motionPreference.matches || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )

    const observe = (node: Node) => {
      if (!(node instanceof HTMLElement)) return
      if (node.matches(revealSelector) && !node.classList.contains('scroll-reveal')) {
        node.classList.add('scroll-reveal')
        observer.observe(node)
      }
      node.querySelectorAll<HTMLElement>(revealSelector).forEach((element) => {
        if (!element.classList.contains('scroll-reveal')) {
          element.classList.add('scroll-reveal')
          observer.observe(element)
        }
      })
    }

    observe(main)
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(observe))
    })
    mutations.observe(main, { childList: true, subtree: true })

    const showAll = () => {
      if (motionPreference.matches) {
        observer.disconnect()
        main.querySelectorAll<HTMLElement>('.scroll-reveal').forEach((element) => {
          element.classList.add('is-visible')
        })
      }
    }
    motionPreference.addEventListener('change', showAll)

    return () => {
      motionPreference.removeEventListener('change', showAll)
      mutations.disconnect()
      observer.disconnect()
    }
  }, [location.pathname])

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('Skip to content')}
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link
            className="brand"
            to="/"
            onClick={() => setOpen(false)}
            aria-label={t('Justin, home')}
          >
            <img
              className="brand-mark"
              src={imageURL('/static/img/profile.jpg')}
              alt=""
              width="34"
              height="34"
            />
            <span className="brand-name">
              JUSTIN<span className="brand-divider">/</span>ENGINEER
            </span>
          </Link>
          <nav
            id="site-navigation"
            className={`site-nav${open ? ' is-open' : ''}`}
            aria-label={t('Main navigation')}
          >
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {t(label)}
              </NavLink>
            ))}
            <NavLink
              to="/contact"
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-contact${isActive ? ' active' : ''}`}
            >
              {t('Get in touch')} <ArrowUpRight size={16} />
            </NavLink>
          </nav>
          <div className="header-tools">
            <Button
              className="language-toggle"
              variant="outline"
              size="sm"
              type="button"
              aria-label={t(
                language === 'en'
                  ? 'Switch language to Traditional Chinese'
                  : 'Switch language to English',
              )}
              title={t(
                language === 'en'
                  ? 'Switch language to Traditional Chinese'
                  : 'Switch language to English',
              )}
              onClick={toggleLanguage}
            >
              {language === 'en' ? '繁中' : 'EN'}
            </Button>
            <Button
              className="theme-toggle"
              variant="outline"
              size="icon"
              type="button"
              aria-label={t(theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode')}
              title={t(theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode')}
              aria-pressed={theme === 'dark'}
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>
            <Button
              className="menu-toggle"
              variant="outline"
              size="icon"
              type="button"
              aria-controls="site-navigation"
              aria-expanded={open}
              aria-label={t(open ? 'Close menu' : 'Open menu')}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>
      </header>
      <main id="main-content" className="page-transition" key={location.pathname} tabIndex={-1}>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer">
        <div className="shell footer-top">
          <div>
            <p className="eyebrow">{t('A NOTE FROM JUSTIN')}</p>
            <p className="footer-heading">
              {t('Good work starts')}
              <br />
              {t('with a conversation.')}
            </p>
          </div>
          <Link className="footer-link" to="/contact">
            {t('Let’s talk')} <ArrowUpRight size={30} strokeWidth={1.4} />
          </Link>
        </div>
        <div className="shell footer-bottom">
          <span>
            © {new Date().getFullYear()} Justin. {t('Built with intention.')}
          </span>
          <span>{t('Made for the web, not for show.')}</span>
          <a href="https://github.com/him6794" target="_blank" rel="noopener noreferrer">
            GitHub <ArrowDownRight size={14} />
          </a>
        </div>
      </footer>
    </>
  )
}
