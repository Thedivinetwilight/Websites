import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bell,
  Bookmark,
  ChevronDown,
  Compass,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  RotateCcw,
  Route as RouteIcon,
  Search,
  Users,
  X,
} from 'lucide-react'
import { Brand } from './Brand'
import { CommandPalette } from './CommandPalette'
import { ProspectDrawer } from './ProspectDrawer'
import { TourCard, TOUR_STOPS } from './Tour'
import { useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'
import { TOTALS } from '../lib/data'

const NAV = [
  { to: '/app', label: 'Morning brief', icon: LayoutDashboard, end: true, section: 'Workspace' },
  { to: '/app/map', label: 'District atlas', icon: MapIcon, section: 'Workspace' },
  { to: '/app/prospects', label: 'Prospects', icon: Users, section: 'Workspace' },
  { to: '/app/route', label: 'Route planner', icon: RouteIcon, section: 'Field work' },
  { to: '/app/list', label: 'My list', icon: Bookmark, section: 'Field work' },
]

const TITLES: Record<string, string> = {
  '/app': 'Morning brief',
  '/app/map': 'District atlas',
  '/app/prospects': 'Prospects',
  '/app/route': 'Route planner',
  '/app/list': 'My list',
}

const DEMO_TODAY = new Date('2026-11-01T09:12:00+05:30')

export function AppShell() {
  const ws = useWorkspace()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const accountId = params.get('account')

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [tourIndex, setTourIndex] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const sectionKey = location.pathname.startsWith('/app/districts')
    ? '/app/map'
    : NAV.find((n) => (n.end ? n.to === location.pathname : location.pathname.startsWith(n.to)))?.to ?? '/app'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setNavOpen(false)
    setMenuOpen(false)
  }, [location.pathname, location.search])

  // Deep link used by the marketing site's "Start the guided tour" button.
  useEffect(() => {
    if (params.get('tour') === '1') {
      setTourIndex(0)
      const next = new URLSearchParams(params)
      next.delete('tour')
      navigate(
        { pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : '' },
        { replace: true },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const openAccount = (id: string) => {
    navigate({ pathname: location.pathname, search: `?account=${id}` })
  }
  const closeAccount = () => {
    const next = new URLSearchParams(params)
    next.delete('account')
    navigate({ pathname: location.pathname, search: next.toString() ? `?${next}` : '' }, { replace: true })
  }

  const startTour = () => {
    setTourIndex(0)
    navigate(TOUR_STOPS[0].path)
  }

  const resetDemo = () => {
    ws.reset()
    setMenuOpen(false)
    toast('Demo workspace reset to its starting state', 'info')
    navigate('/app')
  }

  const badges: Record<string, number> = {
    '/app/route': ws.state.route.length,
    '/app/list': ws.state.saved.length,
  }

  const sidebar = (
    <div className="sidebar__inner">
      <div className="sidebar__brand-row">
        <Link to="/" className="sidebar__brand" aria-label="Theru home">
          <Brand tone="light" />
        </Link>
        <span className="sidebar__env">Demo</span>
      </div>

      <button
        className="workspace-card"
        onClick={() => toast('This demo includes one workspace — Southern Market', 'info')}
      >
        <span className="workspace-card__mark">SM</span>
        <span className="workspace-card__body">
          <span className="workspace-card__name">Southern Market</span>
          <span className="workspace-card__meta">{TOTALS.accounts} accounts · Tamil Nadu</span>
        </span>
        <ChevronDown size={14} className="workspace-card__chev" />
      </button>

      <nav className="sidebar__nav" aria-label="Workspace">
        {['Workspace', 'Field work'].map((section) => (
          <div key={section} className="sidebar__section">
            <p className="sidebar__section-label">{section}</p>
            {NAV.filter((n) => n.section === section).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
              >
                <item.icon size={16} strokeWidth={1.9} />
                <span>{item.label}</span>
                {badges[item.to] ? <span className="nav-item__badge tnum">{badges[item.to]}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar__section">
          <p className="sidebar__section-label">Demo</p>
          <button className="nav-item nav-item--button" onClick={startTour}>
            <Compass size={16} strokeWidth={1.9} />
            <span>Guided tour</span>
          </button>
          <button
            className="nav-item nav-item--button"
            onClick={() => {
              setPaletteOpen(true)
            }}
          >
            <Search size={16} strokeWidth={1.9} />
            <span>Search workspace</span>
            <kbd className="nav-item__kbd">⌘K</kbd>
          </button>
        </div>
      </nav>

      <div className="sidebar__foot">
        <div className="data-note">
          <span className="data-note__dot" />
          <div>
            <p className="data-note__title">Synthetic demo data</p>
            <p className="data-note__body">
              {TOTALS.signals.toLocaleString('en-IN')} signals across {TOTALS.districts} districts, refreshed daily.
            </p>
          </div>
        </div>
        <button className="sidebar__reset" onClick={resetDemo}>
          <RotateCcw size={13} /> Reset demo state
        </button>
      </div>
    </div>
  )

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Primary">
        {sidebar}
      </aside>

      <div className={`mobile-nav-layer ${navOpen ? 'is-open' : ''}`}>
        <button className="mobile-nav-scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />
        <div className="mobile-nav">
          <button className="mobile-nav__close" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
          {sidebar}
        </div>
      </div>

      <div className="app__body">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-btn topbar__menu" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <span className="topbar__crumb">
              Southern Market
              <span className="topbar__slash">/</span>
              <strong>{TITLES[sectionKey] ?? 'Workspace'}</strong>
            </span>
          </div>

          <div className="topbar__right">
            <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
              <Search size={15} />
              <span className="search-trigger__label">Search accounts, districts…</span>
              <kbd className="kbd">⌘K</kbd>
            </button>
            <span className="topbar__date hide-sm">
              {DEMO_TODAY.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <button
              className="icon-btn topbar__bell"
              aria-label="Notifications"
              onClick={() => toast('12 new signals in Tiruppur and Chengalpattu since yesterday', 'info')}
            >
              <Bell size={17} />
              <span className="topbar__bell-dot" />
            </button>
            <div className="user-menu" ref={menuRef}>
              <button
                className="avatar avatar--button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                PR
              </button>
              {menuOpen && (
                <div className="user-pop" role="menu">
                  <div className="user-pop__head">
                    <span className="avatar avatar--sm">PR</span>
                    <div>
                      <p className="user-pop__name">Priya Raman</p>
                      <p className="user-pop__role">Head of Growth · Demo workspace</p>
                    </div>
                  </div>
                  <button className="user-pop__item" onClick={startTour} role="menuitem">
                    <Compass size={14} /> Guided tour
                  </button>
                  <button className="user-pop__item" onClick={resetDemo} role="menuitem">
                    <RotateCcw size={14} /> Reset demo
                  </button>
                  <Link to="/" className="user-pop__item" role="menuitem">
                    <span aria-hidden="true">←</span> Back to the site
                  </Link>
                  <p className="user-pop__note">All accounts and people in this workspace are fictional.</p>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-main" id="main">
          <Outlet context={{ openAccount }} />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onStartTour={startTour} />
      {accountId && <ProspectDrawer id={accountId} onClose={closeAccount} />}
      {tourIndex !== null && (
        <TourCard
          stops={TOUR_STOPS}
          index={tourIndex}
          onIndex={setTourIndex}
          onClose={() => {
            setTourIndex(null)
            toast('Tour closed. Reset the demo any time from the sidebar.', 'info')
          }}
        />
      )}
    </div>
  )
}

export interface OutletCtx {
  openAccount: (id: string) => void
}
