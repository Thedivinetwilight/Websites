import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  WifiOff,
} from 'lucide-react'
import type { OutletCtx } from '../components/AppShell'
import { REGIONS, SIGNAL_META, inrLakhs, scoreOf } from '../lib/data'
import type { Prospect, Stage } from '../lib/types'
import { useDataset, useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'
import { ApiError, searchAccounts, type AccountQuery } from '../lib/api'
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
  const data = useDataset()
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

  const [rows, setRows] = useState<Prospect[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState({ potentialL: 0, strongMomentum: 0 })
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [listError, setListError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setDistrict(params.get('district') ?? 'All')
    setSector(params.get('sector') ?? 'All')
    setSavedOnly(params.get('saved') === '1')
  }, [params])

  const districtOptions = useMemo(() => data.allDistricts.map((d) => d.name), [])

  // Every filter change goes through the API — the server owns search,
  // filtering, sorting and pagination (see GET /api/accounts).
  const filters: AccountQuery = useMemo(
    () => ({
      q: query.trim() || undefined,
      district: district === 'All' ? undefined : district,
      sector: sector === 'All' ? undefined : sector,
      region: region === 'All' ? undefined : region,
      stage,
      saved: savedOnly,
      sort,
    }),
    [query, district, sector, region, stage, savedOnly, sort],
  )

  const queryKey = JSON.stringify(filters)

  useEffect(() => {
    setPage(0)
  }, [queryKey])

  const fetchPage = useCallback(
    async (pageIndex: number, signal: AbortSignal) => {
      setListStatus('loading')
      setListError(null)
      try {
        const result = await searchAccounts(
          { ...filters, limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE },
          signal,
        )
        if (signal.aborted) return
        setRows(result.data)
        setTotal(result.page.total)
        setSummary(result.summary)
        setListStatus('ready')
      } catch (error) {
        if (signal.aborted) return
        setListStatus('error')
        setListError(
          error instanceof ApiError ? error.message : 'The account search could not be completed.',
        )
      }
    },
    [filters],
  )

  useEffect(() => {
    const controller = new AbortController()
    const handle = window.setTimeout(() => {
      void fetchPage(page, controller.signal)
    }, query ? 220 : 0)

    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [fetchPage, page, query, retryToken])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)

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

  const [exporting, setExporting] = useState(false)

  const exportCsv = async () => {
    setExporting(true)
    try {
      const result = await searchAccounts({ ...filters, limit: 500, offset: 0 })
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
      const csvRows = result.data.map((p) => [
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
      const csv = [header, ...csvRows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `theru-prospects-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast(`Exported ${result.data.length} accounts to CSV`)
    } catch (error) {
      toast(`Export failed. ${error instanceof ApiError ? error.message : 'Try again.'}`, 'error')
    } finally {
      setExporting(false)
    }
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
          <p className="page-eyebrow">Prospect workspace · {data.totals.accounts} accounts · {data.sectors.length} sectors</p>
          <h1 className="page-title display">Every account, with a reason to call.</h1>
          <p className="page-sub">
            Filter by district, fit or stage. Open a record to see the signals, the people and the potential behind the
            score.
          </p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--sm btn--ghost" onClick={exportCsv} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
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
              {data.sectors.map((s) => (
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
            {total} <span>{total === 1 ? 'account' : 'accounts'}</span>
            {listStatus === 'loading' && <span className="list-count__pulse" aria-label="Updating results" />}
          </span>
          <span className="list-summary-text">
            {inrLakhs(summary.potentialL)} open potential · {summary.strongMomentum} with strong momentum
            {listStatus === 'error' && <span className="list-summary-error"> · search unavailable</span>}
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

          {rows.map((p) => {
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

          {listStatus === 'loading' &&
            rows.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="prospect-row prospect-row--skeleton" aria-hidden="true">
                <div className="prospect-row__account">
                  <span className="skeleton skeleton--name" />
                  <span className="skeleton skeleton--meta" />
                </div>
                <span className="skeleton skeleton--cell" />
                <span className="skeleton skeleton--ring" />
                <span className="skeleton skeleton--cell" />
                <span className="skeleton skeleton--cell" />
                <span className="skeleton skeleton--pill" />
                <span />
              </div>
            ))}

          {listStatus === 'error' && (
            <div className="empty-state empty-state--lg" role="alert">
              <p className="empty-state__title">
                <WifiOff size={16} /> Account search is unavailable.
              </p>
              <p>{listError ?? 'The demo API did not respond.'}</p>
              <button className="btn btn--sm btn--ghost" onClick={() => setRetryToken((n) => n + 1)}>
                <RotateCcw size={14} /> Try again
              </button>
            </div>
          )}

          {listStatus === 'ready' && rows.length === 0 && (
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
            {total === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min(total, (safePage + 1) * PAGE_SIZE)} of {total}
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
        <ArrowRight size={13} /> Synthetic demo records — scores are illustrative and fixed. Saves, stages, notes and
        routes are stored in the local SQLite demo database, not in a browser.
      </div>
    </div>
  )
}
