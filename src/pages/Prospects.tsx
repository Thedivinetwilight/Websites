import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Plus,
  RotateCcw,
  Route as RouteIcon,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import type { OutletCtx } from '../components/AppShell'
import {
  REGIONS,
  SECTORS,
  SIGNAL_META,
  allDistricts,
  inrLakhs,
  prospects,
  scoreOf,
  signalStrength,
  slugify,
} from '../lib/data'
import type { Prospect, Stage } from '../lib/types'
import { useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'
import { ScoreRing } from '../components/ScoreRing'
import { StagePill } from '../components/Meter'
import { SignalChips } from '../components/Signals'

type SortKey = 'score' | 'potential' | 'momentum' | 'name' | 'signals'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Theru score' },
  { key: 'signals', label: 'Signal strength' },
  { key: 'potential', label: 'Open potential' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'name', label: 'Name A–Z' },
]
const PAGE_SIZE = 12

export function Prospects() {
  const { openAccount } = useOutletContext<OutletCtx>()
  const ws = useWorkspace()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [district, setDistrict] = useState(params.get('district') ?? 'All')
  const [sector, setSector] = useState(params.get('sector') ?? 'All')
  const [region, setRegion] = useState<string>('All')
  const [stage, setStage] = useState<'all' | Stage>('all')
  const [savedOnly, setSavedOnly] = useState(params.get('saved') === '1')
  const [sort, setSort] = useState<SortKey>('score')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setDistrict(params.get('district') ?? 'All')
    setSector(params.get('sector') ?? 'All')
    setSavedOnly(params.get('saved') === '1')
  }, [params])

  const districtOptions = useMemo(() => allDistricts.map((d) => d.name), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = prospects.filter((p) => {
      if (district !== 'All' && p.district !== district) return false
      if (sector !== 'All' && p.sector !== sector) return false
      if (region !== 'All' && allDistricts.find((d) => d.name === p.district)?.region !== region) return false
      if (stage !== 'all' && ws.stageOf(p.id) !== stage) return false
      if (savedOnly && !ws.isSaved(p.id)) return false
      if (q) {
        const hay = `${p.name} ${p.sector} ${p.subSector} ${p.district} ${p.locality} ${p.id}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    return rows.sort((a, b) => {
      if (sort === 'potential') return b.potentialL - a.potentialL
      if (sort === 'momentum') return b.scores.momentum - a.scores.momentum
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'signals') return signalStrength(b) - signalStrength(a)
      return scoreOf(b) - scoreOf(a)
    })
  }, [query, district, sector, region, stage, savedOnly, sort, ws])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => {
    setPage(0)
  }, [query, district, sector, region, stage, savedOnly, sort])

  const activeFilters = [
    district !== 'All' ? { label: `District: ${district}`, clear: () => setDistrict('All') } : null,
    sector !== 'All' ? { label: `Sector: ${sector}`, clear: () => setSector('All') } : null,
    region !== 'All' ? { label: `Region: ${region}`, clear: () => setRegion('All') } : null,
    stage !== 'all' ? { label: `Stage: ${stage}`, clear: () => setStage('all') } : null,
    savedOnly ? { label: 'Saved only', clear: () => setSavedOnly(false) } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[]

  const clearAll = () => {
    setQuery('')
    setDistrict('All')
    setSector('All')
    setRegion('All')
    setStage('all')
    setSavedOnly(false)
    setParams({})
  }

  const exportCsv = () => {
    const header = [
      'id',
      'name',
      'sector',
      'subSector',
      'district',
      'locality',
      'employees',
      'revenue_cr',
      'score',
      'potential_l',
      'stage',
      'owner',
      'contact_name',
      'contact_role',
    ]
    const rows = filtered.map((p) => [
      p.id,
      p.name,
      p.sector,
      p.subSector,
      p.district,
      p.locality,
      p.employees,
      p.revenueCr,
      scoreOf(p),
      p.potentialL,
      ws.stageOf(p.id),
      p.owner,
      p.contact.name,
      p.contact.role,
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theru-prospects-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${filtered.length} accounts to CSV`)
  }

  const quickAction = (p: Prospect, action: 'save' | 'route') => {
    if (action === 'save') {
      const added = ws.toggleSaved(p.id)
      toast(added ? `${p.name} saved to your list` : `${p.name} removed from your list`, added ? 'success' : 'info')
    } else {
      if (ws.inRoute(p.id)) {
        ws.removeStop(p.id)
        toast(`${p.name} removed from the route`, 'info')
      } else {
        ws.addStop(p.id)
        toast(`${p.name} added to Tuesday’s route`)
      }
    }
  }

  return (
    <div className="page page--prospects">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">Prospect workspace · {prospects.length} accounts · 12 sectors</p>
          <h1 className="page-title display">Every account, with a reason to call.</h1>
          <p className="page-sub">
            Filter by district, fit or stage. Open a record to see the signals, the people and the potential behind the
            score.
          </p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--sm btn--ghost" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <Link to="/app/route" className="btn btn--sm">
            <RouteIcon size={14} /> Build a route
          </Link>
        </div>
      </header>

      <section className="panel filter-panel">
        <div className="filter-bar">
          <label className="search-input">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, locality, sector, ID…"
              aria-label="Search accounts"
            />
            {query && (
              <button className="search-input__clear" onClick={() => setQuery('')} aria-label="Clear search">
                ×
              </button>
            )}
          </label>

          <label className="field">
            <span>District</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="All">All 37 districts</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Sector</span>
            <select value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="All">All sectors</option>
              {SECTORS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Stage</span>
            <select value={stage} onChange={(e) => setStage(e.target.value as Stage | 'all')}>
              <option value="all">Any stage</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="meeting">Meeting</option>
              <option value="customer">Customer</option>
            </select>
          </label>

          <button
            className={`toggle ${savedOnly ? 'is-on' : ''}`}
            onClick={() => setSavedOnly((v) => !v)}
            aria-pressed={savedOnly}
          >
            <Bookmark size={14} /> Saved only
          </button>

          <div className="filter-bar__spacer" />

          <label className="field field--sort">
            <span>
              <SlidersHorizontal size={12} /> Sort
            </span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-sub">
          <div className="chip-row">
            {(['All', ...REGIONS] as string[]).map((r) => (
              <button
                key={r}
                className={`chip-toggle chip-toggle--sm ${region === r ? 'is-active' : ''}`}
                onClick={() => setRegion(r)}
              >
                {r === 'All' ? 'All regions' : r}
              </button>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <div className="filter-active">
              {activeFilters.map((f) => (
                <button key={f.label} className="filter-chip" onClick={f.clear}>
                  {f.label} <span aria-hidden="true">×</span>
                </button>
              ))}
              <button className="filter-clear" onClick={clearAll}>
                <RotateCcw size={12} /> Clear all
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="panel list-panel">
        <div className="list-head">
          <span className="list-count tnum">
            {filtered.length} <span>accounts</span>
          </span>
          <span className="list-summary-text">
            {inrLakhs(filtered.reduce((s, p) => s + p.potentialL, 0))} open potential ·{' '}
            {filtered.filter((p) => p.scores.momentum >= 80).length} with strong momentum
          </span>
        </div>

        <div className="prospect-table" role="table" aria-label="Accounts">
          <div className="prospect-table__head" role="row">
            <span role="columnheader">Account</span>
            <span role="columnheader">District</span>
            <span role="columnheader">Score</span>
            <span role="columnheader">Signals</span>
            <span role="columnheader">Potential</span>
            <span role="columnheader">Stage</span>
            <span role="columnheader" className="sr-only">
              Actions
            </span>
          </div>

          {pageRows.map((p) => {
            const saved = ws.isSaved(p.id)
            const routed = ws.inRoute(p.id)
            const stageValue = ws.stageOf(p.id)
            return (
              <div
                key={p.id}
                className="prospect-row"
                role="row"
                tabIndex={0}
                onClick={() => openAccount(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') openAccount(p.id)
                }}
              >
                <div className="prospect-row__account" role="cell">
                  <span className="prospect-row__name">
                    {p.name}
                    {p.spotlight && <span className="spot-dot" title="Curated demo account" />}
                  </span>
                  <span className="prospect-row__meta">
                    {p.subSector} · {p.employees} staff · <span className="tnum">{p.id}</span>
                  </span>
                  <span className="prospect-row__mobile-meta">
                    <MapPin size={11} /> {p.district} · {inrLakhs(p.potentialL)} · {stageValue}
                  </span>
                </div>
                <div className="prospect-row__district" role="cell">
                  <span>{p.district}</span>
                  <span className="muted">{p.locality}</span>
                </div>
                <div className="prospect-row__score" role="cell">
                  <ScoreRing value={scoreOf(p)} size={38} stroke={3.5} />
                  <span className="prospect-row__score-label">
                    {scoreOf(p) >= 82 ? 'Priority' : scoreOf(p) >= 72 ? 'Strong' : 'Watch'}
                  </span>
                </div>
                <div className="prospect-row__signals" role="cell">
                  <SignalChips signals={p.signals} max={2} />
                  <span className="prospect-row__signal-label">
                    {p.signals.length} signals · {p.signals[0] ? SIGNAL_META[p.signals[0].type]?.short : '—'}
                  </span>
                </div>
                <div className="prospect-row__potential tnum" role="cell">
                  {inrLakhs(p.potentialL)}
                  <span className="prospect-row__owner">{p.owner.split(' ')[0]}</span>
                </div>
                <div className="prospect-row__stage" role="cell">
                  <StagePill stage={stageValue} />
                </div>
                <div className="prospect-row__actions" role="cell" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`icon-btn ${saved ? 'is-on' : ''}`}
                    aria-label={saved ? 'Remove from list' : 'Save to list'}
                    onClick={() => quickAction(p, 'save')}
                  >
                    {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  </button>
                  <button
                    className={`icon-btn ${routed ? 'is-on' : ''}`}
                    aria-label={routed ? 'Remove from route' : 'Add to route'}
                    onClick={() => quickAction(p, 'route')}
                  >
                    {routed ? <RouteIcon size={15} /> : <Plus size={15} />}
                  </button>
                  <ChevronRight size={15} className="prospect-row__chev" aria-hidden="true" />
                </div>
              </div>
            )
          })}

          {pageRows.length === 0 && (
            <div className="empty-state empty-state--lg">
              <p className="empty-state__title">No accounts match those filters.</p>
              <p>Try a wider district, a different stage, or clear the search.</p>
              <button className="btn btn--sm btn--ghost" onClick={clearAll}>
                Clear all filters
              </button>
            </div>
          )}
        </div>

        <div className="pagination">
          <span className="pagination__count tnum">
            {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
            {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length}
          </span>
          <div className="pagination__controls">
            <button
              className="icon-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination__page tnum">
              {safePage + 1} / {pageCount}
            </span>
            <button
              className="icon-btn"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <div className="page-footnote">
        <ArrowRight size={13} /> Scores recalculate nightly from public signals. Stage and stage changes are stored in
        this browser only.
      </div>
    </div>
  )
}
