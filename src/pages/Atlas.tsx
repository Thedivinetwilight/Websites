import { useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  MapPin,
  Search,
  TrendingUp,
} from 'lucide-react'
import type { OutletCtx } from '../components/AppShell'
import { TnMap, MapLegend } from '../components/TnMap'
import { Sparkline } from '../components/Sparkline'
import { Meter } from '../components/Meter'
import { ScoreRing } from '../components/ScoreRing'
import {
  MAP_METRICS,
  metricLabel,
  type MapMetric,
} from '../lib/map'
import { REGIONS, allDistricts, inrLakhs, prospects, scoreOf, slugify } from '../lib/data'
import { useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'

type Region = 'All' | (typeof REGIONS)[number]
type SortKey = 'momentum' | 'growth' | 'accounts' | 'potential'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'momentum', label: 'Momentum' },
  { key: 'growth', label: 'Growth' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'potential', label: 'Open potential' },
]

export function Atlas() {
  const { openAccount } = useOutletContext<OutletCtx>()
  const ws = useWorkspace()
  const toast = useToast()
  const navigate = useNavigate()

  const [metric, setMetric] = useState<MapMetric>('momentum')
  const [selected, setSelected] = useState<string>('Chennai')
  const [region, setRegion] = useState<Region>('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('momentum')
  const [showAll, setShowAll] = useState(false)

  const district = allDistricts.find((d) => d.name === selected) ?? allDistricts[0]

  const topAccounts = useMemo(
    () =>
      prospects
        .filter((p) => p.district === district.name)
        .sort((a, b) => scoreOf(b) - scoreOf(a))
        .slice(0, 3),
    [district.name],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allDistricts
      .filter((d) => region === 'All' || d.region === region)
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.topSectors[0]?.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'growth') return b.growth - a.growth
        if (sort === 'accounts') return b.prospects - a.prospects
        if (sort === 'potential') return b.potentialL - a.potentialL
        return b.momentum - a.momentum
      })
  }, [region, query, sort])

  const visible = showAll ? filtered : filtered.slice(0, 9)
  const following = ws.state.following.includes(district.name)

  return (
    <div className="page page--atlas">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">District atlas · 37 districts · updated 06:30 IST</p>
          <h1 className="page-title display">Read the state before the map.</h1>
          <p className="page-sub">
            Switch the lens, pick a district, and see the accounts and sectors that make it move.
          </p>
        </div>
        <div className="page-head__actions">
          <div className="seg" role="group" aria-label="Map metric">
            {(Object.keys(MAP_METRICS) as MapMetric[]).map((m) => (
              <button
                key={m}
                className={metric === m ? 'is-active' : ''}
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
              >
                {MAP_METRICS[m].short}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="atlas-grid">
        <section className="panel atlas-map-panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">{MAP_METRICS[metric].label}</h2>
              <p className="panel__sub">{MAP_METRICS[metric].description}</p>
            </div>
            <MapLegend metric={metric} compact />
          </div>
          <TnMap
            metric={metric}
            selected={selected}
            highlight={selected}
            dimOthers
            onSelect={setSelected}
            className="atlas-map"
            ariaLabel="Tamil Nadu district atlas. Select a district to inspect it."
          />
          <div className="atlas-map__foot">
            <span className="muted">Hover for a value · click to select</span>
            <span className="atlas-map__count tnum">{metricLabel(selected, metric)}</span>
          </div>
        </section>

        <aside className="panel atlas-detail">
          <div className="atlas-detail__head">
            <div>
              <span className="pill pill--quiet">{district.region} region</span>
              <h2 className="atlas-detail__name">{district.name}</h2>
              <p className="atlas-detail__character">{district.character}</p>
            </div>
            <button
              className={`icon-btn ${following ? 'is-on' : ''}`}
              aria-label={following ? 'Unfollow district' : 'Follow district'}
              title={following ? 'Unfollow district' : 'Follow district'}
              onClick={() => {
                ws.toggleFollowing(district.name)
                toast(following ? `Stopped following ${district.name}` : `Following ${district.name}`, 'info')
              }}
            >
              {following ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          </div>

          <div className="atlas-detail__stats">
            <div>
              <span className="mini-label">Momentum</span>
              <strong className="tnum">{district.momentum}</strong>
            </div>
            <div>
              <span className="mini-label">Growth YoY</span>
              <strong className="tnum up">+{district.growth}%</strong>
            </div>
            <div>
              <span className="mini-label">Accounts</span>
              <strong className="tnum">{district.prospects}</strong>
            </div>
            <div>
              <span className="mini-label">Potential</span>
              <strong className="tnum">{inrLakhs(district.potentialL)}</strong>
            </div>
          </div>

          <div className="atlas-detail__spark">
            <div className="atlas-detail__spark-head">
              <span className="mini-label">12-month pulse</span>
              <span className="tnum muted">{district.signalCount} signals</span>
            </div>
            <Sparkline data={district.pulse} width={320} height={44} area strokeWidth={2} />
            <div className="atlas-detail__months">
              <span>Nov ’25</span>
              <span>Feb</span>
              <span>May</span>
              <span>Aug</span>
              <span>Nov ’26</span>
            </div>
          </div>

          <div className="atlas-detail__sectors">
            <div className="atlas-detail__spark-head">
              <span className="mini-label">Sector mix</span>
              <span className="muted">{district.topSectors[0]?.name} leads</span>
            </div>
            {district.topSectors.map((s) => (
              <div key={s.name} className="atlas-sector">
                <span className="atlas-sector__name">{s.name}</span>
                <Meter
                  value={s.count}
                  max={district.topSectors[0].count}
                  tone={s.name === district.topSectors[0].name ? 'jade' : 'turmeric'}
                />
                <span className="atlas-sector__count tnum">{s.count}</span>
              </div>
            ))}
          </div>

          <div className="atlas-detail__accounts">
            <div className="atlas-detail__spark-head">
              <span className="mini-label">Highest-signal accounts</span>
              <span className="muted">{district.hotspot}</span>
            </div>
            <ul>
              {topAccounts.map((p) => (
                <li key={p.id}>
                  <button className="atlas-account" onClick={() => openAccount(p.id)}>
                    <ScoreRing value={scoreOf(p)} size={32} stroke={3} />
                    <span className="atlas-account__body">
                      <span className="atlas-account__name">{p.name}</span>
                      <span className="atlas-account__meta">
                        {p.subSector} · {inrLakhs(p.potentialL)}
                      </span>
                    </span>
                    <ArrowUpRight size={14} className="atlas-account__arrow" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="atlas-detail__actions">
            <button className="btn btn--sm btn--ghost" onClick={() => navigate(`/app/districts/${slugify(district.name)}`)}>
              Open district desk <ArrowRight size={14} />
            </button>
            <Link to={`/app/prospects?district=${encodeURIComponent(district.name)}`} className="link-arrow">
              All {district.prospects} accounts
            </Link>
          </div>
        </aside>
      </div>

      <section className="panel atlas-list-panel" id="districts">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">All districts</h2>
            <p className="panel__sub">
              {filtered.length} districts · sorted by {SORTS.find((s) => s.key === sort)?.label.toLowerCase()}
            </p>
          </div>
          <div className="atlas-list__tools">
            <label className="search-input search-input--sm">
              <Search size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a district or sector…"
                aria-label="Filter districts"
              />
            </label>
            <div className="seg seg--sm">
              {(['All', ...REGIONS] as Region[]).map((r) => (
                <button key={r} className={region === r ? 'is-active' : ''} onClick={() => setRegion(r)}>
                  {r}
                </button>
              ))}
            </div>
            <select className="select select--sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort districts">
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="district-grid">
          {visible.map((d) => {
            const isFollowed = ws.state.following.includes(d.name)
            return (
              <button
                key={d.name}
                className={`district-card ${d.name === selected ? 'is-selected' : ''}`}
                onClick={() => navigate(`/app/districts/${slugify(d.name)}`)}
                onMouseEnter={() => setSelected(d.name)}
              >
                <div className="district-card__top">
                  <span className="district-card__name">{d.name}</span>
                  <span className="district-card__region">{d.region}</span>
                </div>
                <div className="district-card__pulse">
                  <Sparkline data={d.pulse} width={112} height={26} area />
                  <span className="district-card__growth tnum">
                    <TrendingUp size={11} /> +{d.growth}%
                  </span>
                </div>
                <div className="district-card__stats">
                  <span>
                    <strong className="tnum">{d.prospects}</strong> accounts
                  </span>
                  <span className="tnum">{inrLakhs(d.potentialL)}</span>
                </div>
                <div className="district-card__sector">
                  <span>{d.topSectors[0]?.name}</span>
                  {isFollowed && <BookmarkCheck size={12} />}
                </div>
              </button>
            )
          })}
        </div>

        {filtered.length > 9 && (
          <div className="panel__foot">
            <span className="panel__foot-note">
              Showing {visible.length} of {filtered.length}
            </span>
            <button className="link-arrow" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
            </button>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="empty-state">
            <p>No districts match “{query}”.</p>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => {
                setQuery('')
                setRegion('All')
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>



      <div className="atlas-footnote">
        <MapPin size={13} /> District boundaries: DataMeet (MIT) · account counts and momentum are synthetic demo values.
      </div>
    </div>
  )
}
