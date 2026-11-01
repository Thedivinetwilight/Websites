import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bookmark,
  Compass,
  CornerDownLeft,
  LayoutDashboard,
  Map as MapIcon,
  Route as RouteIcon,
  Search,
  Users,
} from 'lucide-react'
import { inrLakhs, scoreOf, slugify } from '../lib/data'
import { useDataset } from '../lib/store'

const PAGES = [
  { label: 'Morning brief', hint: 'Overview', path: '/app', icon: LayoutDashboard },
  { label: 'District atlas', hint: 'Map', path: '/app/map', icon: MapIcon },
  { label: 'Prospects', hint: 'All accounts', path: '/app/prospects', icon: Users },
  { label: 'Route planner', hint: 'This week', path: '/app/route', icon: RouteIcon },
  { label: 'My list', hint: 'Pipeline', path: '/app/list', icon: Bookmark },
]

interface Result {
  id: string
  label: string
  meta: string
  path: string
  group: string
  icon?: typeof Search
}

export function CommandPalette({
  open,
  onClose,
  onStartTour,
}: {
  open: boolean
  onClose: () => void
  onStartTour: () => void
}) {
  const { allDistricts, prospects } = useDataset()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('is-locked')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('is-locked')
    }
  }, [open, onClose])

  useEffect(() => {
    onClose()
    // close whenever the route changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pageResults: Result[] = PAGES.filter(
      (p) => !q || p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q),
    ).map((p) => ({
      id: `page-${p.path}`,
      label: p.label,
      meta: p.hint,
      path: p.path,
      group: 'Jump to',
      icon: p.icon,
    }))

    if (!q) {
      const top = prospects
        .slice()
        .sort((a, b) => scoreOf(b) - scoreOf(a))
        .slice(0, 4)
        .map<Result>((p) => ({
          id: p.id,
          label: p.name,
          meta: `${p.district} · score ${scoreOf(p)} · ${inrLakhs(p.potentialL)}`,
          path: `/app/prospects?account=${p.id}`,
          group: 'High signal today',
        }))
      return [
        ...pageResults,
        ...top,
        {
          id: 'tour',
          label: 'Start the guided tour',
          meta: '5 stops',
          path: '#tour',
          group: 'Actions',
          icon: Compass,
        },
      ]
    }

    const districtResults: Result[] = allDistricts
      .filter((d) => d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q))
      .slice(0, 4)
      .map((d) => ({
        id: `district-${d.name}`,
        label: d.name,
        meta: `${d.prospects} accounts · ${d.growth}% growth`,
        path: `/app/districts/${slugify(d.name)}`,
        group: 'Districts',
        icon: MapIcon,
      }))

    const accountResults: Result[] = prospects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sector.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          p.locality.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      )
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        label: p.name,
        meta: `${p.district} · ${p.sector} · score ${scoreOf(p)}`,
        path: `/app/prospects?account=${p.id}`,
        group: 'Accounts',
      }))

    return [...pageResults.slice(0, 2), ...districtResults, ...accountResults].slice(0, 12)
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>()
    results.forEach((r) => {
      if (!map.has(r.group)) map.set(r.group, [])
      map.get(r.group)!.push(r)
    })
    return [...map.entries()]
  }, [results])

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped])

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, flat.length - 1)))
  }, [flat.length])

  const run = (r: Result) => {
    if (r.path === '#tour') {
      onClose()
      onStartTour()
      return
    }
    const [pathname, search] = r.path.split('?')
    navigate({ pathname, search: search ? `?${search.replace('?', '')}` : '' })
    onClose()
  }

  if (!open) return null

  return (
    <div className="palette-layer" role="presentation" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search the workspace"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="palette__input-row">
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search accounts, districts or pages…"
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, flat.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && flat[active]) {
                e.preventDefault()
                run(flat[active])
              }
            }}
            aria-label="Search accounts, districts or pages"
          />
          <kbd className="kbd">esc</kbd>
        </div>

        <div className="palette__body">
          {grouped.length === 0 && (
            <div className="palette__empty">
              <p>No matches for “{query}”.</p>
              <p className="muted">Try a district name, a sector, or an account ID like TH-1000.</p>
            </div>
          )}
          {grouped.map(([group, items]) => (
            <div key={group} className="palette__group">
              <p className="palette__group-label">{group}</p>
              {items.map((item) => {
                const index = flat.indexOf(item)
                const isActive = index === active
                return (
                  <button
                    key={item.id}
                    className={`palette__item ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(item)}
                  >
                    <span className="palette__icon">
                      {item.icon ? <item.icon size={15} /> : <Users size={15} />}
                    </span>
                    <span className="palette__text">
                      <span className="palette__label">{item.label}</span>
                      <span className="palette__meta">{item.meta}</span>
                    </span>
                    {isActive && <CornerDownLeft size={13} className="palette__enter" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="palette__foot">
          <span>
            <kbd className="kbd kbd--sm">↑</kbd>
            <kbd className="kbd kbd--sm">↓</kbd> to move
          </span>
          <span>
            <kbd className="kbd kbd--sm">↵</kbd> to open
          </span>
          <span className="palette__foot-note">Demo workspace · 421 accounts</span>
        </div>
      </div>
    </div>
  )
}
