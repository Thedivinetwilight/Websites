import { useMemo } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  MapPin,
  Plus,
  Route as RouteIcon,
  Users,
} from 'lucide-react'
import type { OutletCtx } from '../components/AppShell'
import { TnMap } from '../components/TnMap'
import { Sparkline } from '../components/Sparkline'
import { Meter } from '../components/Meter'
import { ScoreRing } from '../components/ScoreRing'
import { SignalChips } from '../components/Signals'
import { allDistricts, inrLakhs, prospects, scoreOf, slugify } from '../lib/data'
import { useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'

export function DistrictPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { openAccount } = useOutletContext<OutletCtx>()
  const ws = useWorkspace()
  const toast = useToast()

  const district = allDistricts.find((d) => slugify(d.name) === slug)

  const accounts = useMemo(
    () =>
      prospects
        .filter((p) => p.district === district?.name)
        .sort((a, b) => scoreOf(b) - scoreOf(a)),
    [district?.name],
  )

  const nearby = useMemo(
    () => allDistricts.filter((d) => d.region === district?.region && d.name !== district?.name).slice(0, 5),
    [district?.name, district?.region],
  )

  if (!district) {
    return (
      <div className="page">
        <div className="empty-state empty-state--lg">
          <p className="empty-state__title">District not found.</p>
          <Link to="/app/map" className="btn btn--sm btn--ghost">
            Back to the atlas
          </Link>
        </div>
      </div>
    )
  }

  const following = ws.state.following.includes(district.name)
  const savedHere = accounts.filter((p) => ws.isSaved(p.id)).length
  const routedHere = accounts.filter((p) => ws.inRoute(p.id)).length

  return (
    <div className="page page--district">
      <button className="back-link" onClick={() => navigate('/app/map')}>
        <ArrowLeft size={14} /> District atlas
      </button>

      <header className="district-head">
        <div className="district-head__copy">
          <p className="page-eyebrow">
            {district.region} region · {district.hotspot} cluster
          </p>
          <h1 className="page-title display">{district.name} district desk.</h1>
          <p className="district-head__character">{district.character}</p>
          <div className="district-head__actions">
            <button
              className={`btn btn--sm ${following ? 'btn--ghost' : ''}`}
              onClick={() => {
                ws.toggleFollowing(district.name)
                toast(following ? `Stopped following ${district.name}` : `Following ${district.name}`, 'info')
              }}
            >
              {following ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              {following ? 'Following' : 'Follow district'}
            </button>
            <Link to={`/app/prospects?district=${encodeURIComponent(district.name)}`} className="btn btn--sm btn--ghost">
              <Users size={14} /> All {accounts.length} accounts
            </Link>
            <Link to="/app/route" className="btn btn--sm btn--ghost">
              <RouteIcon size={14} /> Route
            </Link>
          </div>
        </div>

        <div className="district-head__map">
          <TnMap
            metric="momentum"
            selected={district.name}
            highlight={district.name}
            dimOthers
            showLabels={false}
            showTooltip={false}
            interactive={false}
          />
        </div>
      </header>

      <section className="district-stats">
        <div className="district-stat">
          <span className="mini-label">Momentum</span>
          <strong className="tnum">{district.momentum}</strong>
          <span className="district-stat__meta">
            <span className="up">+{district.growth}%</span> year on year
          </span>
        </div>
        <div className="district-stat">
          <span className="mini-label">12-month pulse</span>
          <Sparkline data={district.pulse} width={120} height={30} area />
          <span className="district-stat__meta">{district.signalCount} signals tracked</span>
        </div>
        <div className="district-stat">
          <span className="mini-label">Accounts mapped</span>
          <strong className="tnum">{accounts.length}</strong>
          <span className="district-stat__meta">{savedHere} saved · {routedHere} on route</span>
        </div>
        <div className="district-stat">
          <span className="mini-label">Open potential</span>
          <strong className="tnum">{inrLakhs(district.potentialL)}</strong>
          <span className="district-stat__meta">across {district.topSectors.length} leading sectors</span>
        </div>
        <div className="district-stat">
          <span className="mini-label">Median account</span>
          <strong className="tnum">
            {Math.round(accounts.reduce((s, p) => s + p.employees, 0) / Math.max(1, accounts.length))}
          </strong>
          <span className="district-stat__meta">employees · mostly SME</span>
        </div>
      </section>

      <div className="district-grid-2">
        <section className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Sector mix</h2>
              <p className="panel__sub">Where {district.name}’s mapped businesses cluster</p>
            </div>
          </div>
          <div className="district-sectors">
            {district.topSectors.map((s, i) => (
              <div key={s.name} className="district-sector">
                <span className="district-sector__rank tnum">0{i + 1}</span>
                <div className="district-sector__body">
                  <div className="district-sector__top">
                    <span>{s.name}</span>
                    <span className="tnum">{s.count} accounts</span>
                  </div>
                  <Meter value={s.count} max={district.topSectors[0].count} tone={i === 0 ? 'jade' : 'turmeric'} height={6} />
                </div>
              </div>
            ))}
          </div>
          <div className="district-quote">
            <MapPin size={14} />
            <p>
              Field note: buyers here respond to <strong>{district.topSectors[0]?.name.toLowerCase()}</strong> references
              first. Lead with a local customer story, then the numbers.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Nearby district desks</h2>
              <p className="panel__sub">Same region, different rhythm</p>
            </div>
            <Link to="/app/map" className="link-arrow">
              Atlas
            </Link>
          </div>
          <ul className="nearby-list">
            {nearby.map((d) => (
              <li key={d.name}>
                <button className="nearby-row" onClick={() => navigate(`/app/districts/${slugify(d.name)}`)}>
                  <span className="nearby-row__body">
                    <span className="nearby-row__name">{d.name}</span>
                    <span className="nearby-row__meta">
                      {d.prospects} accounts · momentum {d.momentum}
                    </span>
                  </span>
                  <Sparkline data={d.pulse} width={56} height={20} area />
                  <span className="nearby-row__growth tnum">+{d.growth}%</span>
                  <ArrowUpRight size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="district-switch">
            <span className="mini-label">Jump to another region</span>
            <div className="chip-row">
              {['North', 'Central', 'West', 'South'].map((r) => (
                <Link
                  key={r}
                  to="/app/map"
                  className={`chip-toggle chip-toggle--sm ${r === district.region ? 'is-active' : ''}`}
                >
                  {r}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <div>
            <h2 className="panel__title">Top accounts in {district.name}</h2>
            <p className="panel__sub">Ranked by Theru score · click to open the dossier</p>
          </div>
          <Link to={`/app/prospects?district=${encodeURIComponent(district.name)}`} className="link-arrow">
            Open workspace <ArrowRight size={13} />
          </Link>
        </div>
        <div className="district-accounts">
          {accounts.slice(0, 8).map((p) => (
            <div
              key={p.id}
              className="district-account"
              role="button"
              tabIndex={0}
              onClick={() => openAccount(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && openAccount(p.id)}
            >
              <ScoreRing value={scoreOf(p)} size={42} stroke={4} />
              <div className="district-account__body">
                <span className="district-account__name">{p.name}</span>
                <span className="district-account__meta">
                  {p.locality} · {p.subSector} · {p.employees} staff
                </span>
                <SignalChips signals={p.signals} max={2} />
              </div>
              <span className="district-account__potential tnum">{inrLakhs(p.potentialL)}</span>
              <div className="district-account__actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`icon-btn ${ws.isSaved(p.id) ? 'is-on' : ''}`}
                  aria-label="Toggle saved"
                  onClick={() => {
                    const added = ws.toggleSaved(p.id)
                    toast(added ? 'Saved to your list' : 'Removed from your list', added ? 'success' : 'info')
                  }}
                >
                  <Bookmark size={14} />
                </button>
                <button
                  className={`icon-btn ${ws.inRoute(p.id) ? 'is-on' : ''}`}
                  aria-label="Toggle route"
                  onClick={() => {
                    if (ws.inRoute(p.id)) {
                      ws.removeStop(p.id)
                      toast('Removed from the route', 'info')
                    } else {
                      ws.addStop(p.id)
                      toast('Added to Tuesday’s route')
                    }
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
