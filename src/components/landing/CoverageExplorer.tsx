import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { inrLakhs, slugify } from '../../lib/data'
import { useDataset } from '../../lib/store'
import { MAP_METRICS, metricLabel, type MapMetric } from '../../lib/map'
import { TnMap, MapLegend } from '../TnMap'
import { Sparkline } from '../Sparkline'

type SortKey = 'momentum' | 'growth' | 'accounts' | 'potential'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'momentum', label: 'Momentum' },
  { key: 'growth', label: 'Growth' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'potential', label: 'Potential' },
]

export function CoverageExplorer() {
  const { allDistricts } = useDataset()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [metric, setMetric] = useState<MapMetric>('momentum')
  const [sort, setSort] = useState<SortKey>('momentum')
  const [hovered, setHovered] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allDistricts
      .filter((d) => !q || d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        if (sort === 'growth') return b.growth - a.growth
        if (sort === 'accounts') return b.prospects - a.prospects
        if (sort === 'potential') return b.potentialL - a.potentialL
        return b.momentum - a.momentum
      })
  }, [query, sort])

  const openDistrict = (name: string) => navigate(`/app/districts/${slugify(name)}`)

  return (
    <section className="coverage section" id="coverage">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" /> Coverage
            </p>
            <h2 className="display section-title">
              37 districts.
              <br />
              Not just the <em>metros.</em>
            </h2>
          </div>
          <div className="section-intro">
            <p>
              Tamil Nadu is not one market. It is a state of thirty-seven, each with its own growth curve, cluster and
              buying season. Open any district to see the accounts, signals and sectors behind the number.
            </p>
            <span className="coverage__count tnum">
              {allDistricts.reduce((s, d) => s + d.prospects, 0)} synthetic accounts · 12 sectors · demo dataset
            </span>
          </div>
        </div>

        <div className="coverage__layout">
          <div className="coverage__map-col">
            <div className="coverage__metric-row">
              <div className="coverage__metrics" role="group" aria-label="Map metric">
                {(Object.keys(MAP_METRICS) as MapMetric[]).map((m) => (
                  <button
                    key={m}
                    className={`chip-toggle ${metric === m ? 'is-active' : ''}`}
                    onClick={() => setMetric(m)}
                    aria-pressed={metric === m}
                  >
                    {MAP_METRICS[m].short}
                  </button>
                ))}
              </div>
              <MapLegend metric={metric} compact className="coverage__legend" />
            </div>
            <div className="coverage__map-card">
              <TnMap
                metric={metric}
                onSelect={openDistrict}
                highlight={hovered}
                dimOthers={Boolean(hovered)}
                className="coverage__map"
                ariaLabel="Tamil Nadu district map. Select a district to open its desk."
              />
              <div className="coverage__map-foot">
                <span className="coverage__hint">{MAP_METRICS[metric].description}</span>
                <span className="coverage__hint coverage__hint--action">Click a district to open its desk →</span>
              </div>
            </div>
          </div>

          <div className="coverage__table-col">
            <div className="coverage__toolbar">
              <label className="search-input">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a district…"
                  aria-label="Find a district"
                />
              </label>
              <label className="sort-select">
                <span>Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="coverage__table" role="table" aria-label="Districts">
              <div className="coverage__thead" role="row">
                <span role="columnheader">District</span>
                <span role="columnheader">12-month pulse</span>
                <span role="columnheader">Growth</span>
                <span role="columnheader">Accounts</span>
                <span role="columnheader">Potential</span>
              </div>
              {rows.map((d) => (
                <button
                  key={d.name}
                  className="coverage__row"
                  role="row"
                  onClick={() => openDistrict(d.name)}
                  onMouseEnter={() => setHovered(d.name)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="coverage__district" role="cell">
                    <span className="coverage__district-name">{d.name}</span>
                    <span className="coverage__district-meta">
                      {d.region} · {d.topSectors[0]?.name}
                    </span>
                  </span>
                  <span className="coverage__pulse" role="cell">
                    <Sparkline data={d.pulse} width={84} height={24} area />
                  </span>
                  <span className="coverage__growth tnum" role="cell">
                    <span className="up">+{d.growth}%</span>
                  </span>
                  <span className="coverage__accounts tnum" role="cell">
                    {d.prospects}
                  </span>
                  <span className="coverage__potential tnum" role="cell">
                    {inrLakhs(d.potentialL)}
                    <ArrowRight size={13} className="coverage__row-arrow" />
                  </span>
                </button>
              ))}
              {rows.length === 0 && <p className="coverage__empty">No districts match “{query}”.</p>}
            </div>

            <div className="coverage__foot">
              <span className="muted">
                {rows.length === 37 ? 'All 37 districts' : `${rows.length} districts`}, sorted by{' '}
                {SORTS.find((s) => s.key === sort)?.label.toLowerCase()}
                {rows.length > 8 ? ' · scroll the list' : ''}.
              </span>
              <button className="link-arrow" onClick={() => navigate('/app/map')}>
                Open the full atlas <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="coverage__strip">
          {(() => {
            const fastest = allDistricts.reduce((a, b) => (b.growth > a.growth ? b : a))
            const crore = allDistricts.filter((d) => d.potentialL >= 100)
            const noisiest = allDistricts.reduce((a, b) => (b.signalCount > a.signalCount ? b : a))
            const fittest = allDistricts.reduce((a, b) => (b.avgScore > a.avgScore ? b : a))
            return [
              { label: 'Fastest-growing district', value: fastest.name, meta: `+${fastest.growth}% YoY · ${fastest.hotspot} belt` },
              {
                label: 'Districts above ₹1 Cr',
                value: `${crore.length} of 37`,
                meta: `${inrLakhs(crore.reduce((sum, d) => sum + d.potentialL, 0))} of open potential`,
              },
              {
                label: 'Most signals tracked',
                value: noisiest.name,
                meta: `${noisiest.signalCount} signals · ${noisiest.topSectors[0]?.name}`,
              },
              {
                label: 'Highest average fit',
                value: fittest.name,
                meta: `Score ${fittest.avgScore} across ${fittest.prospects} accounts`,
              },
            ].map((s) => (
              <div key={s.label} className="coverage__strip-item">
                <span className="mini-label">{s.label}</span>
                <span className="coverage__strip-value">{s.value}</span>
                <span className="coverage__strip-meta">{s.meta}</span>
              </div>
            ))
          })()}
        </div>
      </div>
    </section>
  )
}
