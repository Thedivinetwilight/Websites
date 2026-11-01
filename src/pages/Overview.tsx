import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Plus,
  Route as RouteIcon,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { OutletCtx } from '../components/AppShell'
import { SIGNAL_META, compact, daysLabel, inrLakhs, scoreOf, signalStrength } from '../lib/data'
import { useWorkspace } from '../lib/store'
import type { Prospect } from '../lib/types'
import { useToast } from '../lib/toast'
import { ScoreRing } from '../components/ScoreRing'
import { Sparkline } from '../components/Sparkline'
import { Meter, StagePill } from '../components/Meter'
import { SignalChips, SignalIcon } from '../components/Signals'
import { planRoute, clock, durationLabel, dateLabelLong } from '../lib/route'
import { TnMap } from '../components/TnMap'
import { slugify } from '../lib/data'
import { useDataset } from '../lib/store'

const FILTERS = ['All', 'Growth', 'Export', 'Credit', 'Hiring'] as const

export function Overview() {
  const {
    prospects,
    sectors: SECTORS,
    totals: TOTALS,
    topMovers: TOP_MOVERS,
    allDistricts,
    brief: briefAccounts,
    byId,
  } = useDataset()
  const { openAccount } = useOutletContext<OutletCtx>()
  const ws = useWorkspace()
  const toast = useToast()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')

  const brief = useMemo(() => {
    if (filter === 'All') return briefAccounts
    const key = filter.toLowerCase()
    return briefAccounts.filter((p) => p.signals.some((s) => s.type === key))
  }, [filter])

  const fastest = TOP_MOVERS[0]
  const route = useMemo(
    () => planRoute(ws.state.route.map((id) => byId(id)).filter(Boolean) as Prospect[]),
    [ws.state.route, byId],
  )
  const plan = route

  const savedPotential = ws.savedProspects.reduce((sum, p) => sum + p.potentialL, 0)
  const newSignals = prospects.reduce(
    (sum, p) => sum + p.signals.filter((s) => s.daysAgo <= 7).length,
    0,
  )
  const focusPotential = briefAccounts.reduce((sum, p) => sum + p.potentialL, 0)

  const weekHistogram = useMemo(() => {
    const buckets = Array.from({ length: 8 }, () => 0)
    prospects.forEach((p) =>
      p.signals.forEach((s) => {
        if (s.daysAgo <= 56) buckets[7 - Math.floor(s.daysAgo / 7)] += 1
      }),
    )
    return buckets
  }, [])

  const latestSignals = useMemo(() => {
    const rows: { id: string; name: string; district: string; type: string; label: string; daysAgo: number }[] = []
    prospects.forEach((p) =>
      p.signals.slice(0, 2).forEach((s) => {
        rows.push({ id: p.id, name: p.name, district: p.district, type: s.type, label: s.label, daysAgo: s.daysAgo })
      }),
    )
    return rows.sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 6)
  }, [])

  const watching = ws.state.following
    .map((name) => allDistricts.find((d) => d.name === name))
    .filter(Boolean)
    .slice(0, 3)

  const lead = briefAccounts[0]
  const leadSignal = lead.signals[0]

  return (
    <div className="page page--overview">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">Sunday, 1 November 2026 · Day 214 of the fiscal year</p>
          <h1 className="page-title display">Good morning, Priya.</h1>
          <p className="page-sub">
            Six accounts earned a call today. Three districts moved overnight.
          </p>
        </div>
        <div className="page-head__actions">
          <Link to="/app/prospects" className="btn btn--sm btn--ghost">
            Browse all accounts
          </Link>
          <Link to="/app/route" className="btn btn--sm">
            Start Tuesday’s route <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="brief-hero">
        <div className="brief-hero__map" aria-hidden="true">
          <TnMap metric="momentum" showLabels={false} showTooltip={false} interactive={false} />
        </div>
        <div className="brief-hero__content">
          <p className="brief-hero__eyebrow">
            <Sparkles size={13} /> Today’s read · demo brief
          </p>
          <h2 className="brief-hero__title">
            The west is moving. <em>{lead.name}</em> is today’s first call.
          </h2>
          <ul className="brief-hero__points">
            <li>
              <span className="brief-hero__marker" />
              <span>
                <strong>{lead.name}</strong> scores {scoreOf(lead)} after a fresh signal:{' '}
                {leadSignal ? leadSignal.label.toLowerCase() : 'new activity'} ({daysLabel(leadSignal?.daysAgo ?? 3).toLowerCase()}).
              </span>
            </li>
            <li>
              <span className="brief-hero__marker" />
              <span>
                <strong>{fastest.name}</strong> is the fastest-moving district at{' '}
                <span className="accent">+{fastest.growth}%</span>, with {fastest.prospects} mapped accounts.
              </span>
            </li>
            <li>
              <span className="brief-hero__marker" />
              <span>
                {plan.stops.length} stops on Tuesday’s route across {new Set(plan.stops.map((s) => s.prospect.district)).size}{' '}
                districts — {plan.totalKm} km door to door.
              </span>
            </li>
          </ul>
          <div className="brief-hero__actions">
            <Link to="/app/route" className="btn btn--sm btn--light">
              <RouteIcon size={14} /> Open the route
            </Link>
            <Link to="/app/map" className="btn btn--sm btn--outline-light">
              See the district atlas
            </Link>
          </div>
        </div>
        <div className="brief-hero__side">
          <div className="brief-hero__stat">
            <span>Signals, last 7 days</span>
            <strong className="tnum">{newSignals}</strong>
            <Sparkline data={weekHistogram} width={120} height={30} color="#e0a13d" area />
          </div>
          <div className="brief-hero__stat">
            <span>Open potential in today’s brief</span>
            <strong className="tnum">{inrLakhs(focusPotential)}</strong>
            <Sparkline data={weekHistogram.map((v, i) => v + i * 3)} width={120} height={30} color="#c8d9bf" area />
          </div>
        </div>
      </section>

      <section className="kpi-row" aria-label="Workspace summary">
        <div className="kpi">
          <span className="kpi__icon">
            <Users size={15} />
          </span>
          <span className="kpi__label">In today’s brief</span>
          <span className="kpi__value tnum">{brief.length}</span>
          <span className="kpi__meta">of {prospects.length} mapped accounts</span>
        </div>
        <div className="kpi">
          <span className="kpi__icon">
            <TrendingUp size={15} />
          </span>
          <span className="kpi__label">New signals · 7 days</span>
          <span className="kpi__value tnum">{newSignals}</span>
          <span className="kpi__meta">across {TOTALS.districts} districts</span>
        </div>
        <div className="kpi">
          <span className="kpi__icon">
            <RouteIcon size={15} />
          </span>
          <span className="kpi__label">Tuesday’s route</span>
          <span className="kpi__value tnum">{plan.stops.length}</span>
          <span className="kpi__meta">
            {plan.totalKm} km · {durationLabel(plan.totalMinutes)}
          </span>
        </div>
        <div className="kpi kpi--accent">
          <span className="kpi__icon">
            <Sparkles size={15} />
          </span>
          <span className="kpi__label">Your list</span>
          <span className="kpi__value tnum">{ws.state.saved.length}</span>
          <span className="kpi__meta">{inrLakhs(savedPotential)} open potential</span>
        </div>
      </section>

      <div className="overview-grid">
        <section className="panel panel--brief">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Today’s brief</h2>
              <p className="panel__sub">Ranked by signal strength · synthetic demo data</p>
            </div>
            <div className="chip-row" role="group" aria-label="Filter brief by signal">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`chip-toggle ${filter === f ? 'is-active' : ''}`}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ul className="brief-list">
            {brief.map((p, i) => {
              const saved = ws.isSaved(p.id)
              const routed = ws.inRoute(p.id)
              return (
                <li key={p.id} className="brief-item">
                  <span className="brief-item__rank tnum">{String(i + 1).padStart(2, '0')}</span>
                  <button className="brief-item__main" onClick={() => openAccount(p.id)}>
                    <ScoreRing value={scoreOf(p)} size={46} stroke={4} />
                    <span className="brief-item__text">
                      <span className="brief-item__name">
                        {p.name}
                        {p.spotlight && <span className="brief-item__dot" title="Curated account" />}
                      </span>
                      <span className="brief-item__meta">
                        <MapPin size={11} /> {p.locality}, {p.district}
                        <span className="brief-item__sep" />
                        {p.subSector} · {p.employees} staff
                      </span>
                      <span className="brief-item__signal">
                        <SignalIcon type={p.signals[0].type} size={12} />
                        {p.signals[0].label}
                      </span>
                    </span>
                  </button>
                  <div className="brief-item__side">
                    <SignalChips signals={p.signals} max={2} />
                    <span className="brief-item__value tnum">{inrLakhs(p.potentialL)}</span>
                  </div>
                  <div className="brief-item__actions">
                    <button
                      className={`icon-btn ${saved ? 'is-on' : ''}`}
                      aria-label={saved ? 'Remove from list' : 'Save to list'}
                      onClick={() => {
                        const added = ws.toggleSaved(p.id)
                        toast(added ? 'Saved to your list' : 'Removed from your list', added ? 'success' : 'info')
                      }}
                    >
                      <Plus size={15} style={{ transform: saved ? 'rotate(45deg)' : undefined, transition: 'transform .2s' }} />
                    </button>
                    <button
                      className={`icon-btn ${routed ? 'is-on' : ''}`}
                      aria-label={routed ? 'Remove from route' : 'Add to route'}
                      onClick={() => {
                        if (routed) {
                          ws.removeStop(p.id)
                          toast('Removed from the route', 'info')
                        } else {
                          ws.addStop(p.id)
                          toast(`${p.name} added to Tuesday’s route`)
                        }
                      }}
                    >
                      <RouteIcon size={15} />
                    </button>
                    <button className="icon-btn" aria-label="Open account" onClick={() => openAccount(p.id)}>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
            {brief.length === 0 && (
              <li className="brief-empty">
                No accounts in today’s brief have a {filter.toLowerCase()} signal. Try another filter.
              </li>
            )}
          </ul>

          <div className="panel__foot">
            <span className="panel__foot-note">
              Scores combine fit, momentum, footprint and reachability.
            </span>
            <Link to="/app/prospects" className="link-arrow">
              All {prospects.length} accounts <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        <div className="overview-side">
          <section className="panel panel--route">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">Tuesday’s route</h2>
                <p className="panel__sub">{dateLabelLong(ws.state.routeDate)} · {plan.totalKm} km</p>
              </div>
              <Link to="/app/route" className="link-arrow">
                Edit
              </Link>
            </div>
            {plan.stops.length ? (
              <ol className="mini-route">
                {plan.stops.slice(0, 4).map((s, i) => (
                  <li key={s.prospect.id} className="mini-route__stop">
                    <span className="mini-route__time tnum">{clock(s.arrive)}</span>
                    <span className="mini-route__rail">
                      <span className={`mini-route__dot ${i === 0 ? 'is-first' : ''}`} />
                      {i < Math.min(plan.stops.length, 4) - 1 && <span className="mini-route__line" />}
                    </span>
                    <span className="mini-route__body">
                      <button className="mini-route__name" onClick={() => openAccount(s.prospect.id)}>
                        {s.prospect.name}
                      </button>
                      <span className="mini-route__meta">
                        {s.prospect.locality}, {s.prospect.district}
                      </span>
                      {s.legKm > 0 && <span className="mini-route__leg">{s.legKm} km · {s.legMin} min drive</span>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mini-route__empty">
                <p>No stops yet.</p>
                <button className="btn btn--sm btn--ghost" onClick={() => toast('Open Prospects to add accounts', 'info')}>
                  Build a route
                </button>
              </div>
            )}
            <div className="panel__foot">
              <span className="panel__foot-note">
                Ends {clock(plan.endMinutes)} · {durationLabel(plan.totalMinutes)} door to door
              </span>
            </div>
          </section>

          <section className="panel panel--watch">
            <div className="panel__head">
              <div>
                <h2 className="panel__title">District watchlist</h2>
                <p className="panel__sub">Districts you follow</p>
              </div>
              <Link to="/app/map" className="link-arrow">
                Atlas
              </Link>
            </div>
            <ul className="watch-list">
              {watching.map((d) =>
                d ? (
                  <li key={d.name}>
                    <Link to={`/app/districts/${slugify(d.name)}`} className="watch-row">
                      <span className="watch-row__body">
                        <span className="watch-row__name">{d.name}</span>
                        <span className="watch-row__meta">
                          {d.prospects} accounts · {d.region}
                        </span>
                      </span>
                      <Sparkline data={d.pulse} width={62} height={22} area />
                      <span className="watch-row__growth tnum">+{d.growth}%</span>
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
            <div className="watch-foot">
              <span className="mini-label">Fastest mover this week</span>
              <span className="watch-foot__value">
                {fastest.name} <span className="up tnum">+{fastest.growth}%</span>
              </span>
            </div>
          </section>
        </div>
      </div>

      <div className="overview-bottom">
        <section className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Signal feed</h2>
              <p className="panel__sub">The last six things that changed on the board</p>
            </div>
            <span className="pill pill--quiet">Live</span>
          </div>
          <ul className="feed">
            {latestSignals.map((s, i) => (
              <li key={`${s.id}-${i}`} className="feed__row">
                <SignalIcon type={s.type} />
                <div className="feed__body">
                  <p className="feed__label">{s.label}</p>
                  <button className="feed__account" onClick={() => openAccount(s.id)}>
                    {s.name} <span className="muted">· {s.district}</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
                <span className="feed__type">{SIGNAL_META[s.type]?.short}</span>
                <span className="feed__time tnum">{s.daysAgo === 1 ? '1d' : `${s.daysAgo}d`}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Sector pulse</h2>
              <p className="panel__sub">Where your mapped accounts sit</p>
            </div>
            <Link to="/app/prospects" className="link-arrow">
              All
            </Link>
          </div>
          <ul className="sector-pulse">
            {SECTORS.slice(0, 6).map((s) => (
              <li key={s.name} className="sector-pulse__row">
                <span className="sector-pulse__name">{s.name}</span>
                <Meter value={s.count} max={SECTORS[0].count} tone={s.avgScore >= 72 ? 'jade' : 'turmeric'} />
                <span className="sector-pulse__count tnum">{s.count}</span>
                <span className="sector-pulse__value tnum">{inrLakhs(s.potentialL)}</span>
              </li>
            ))}
          </ul>
          <div className="sector-pulse__foot">
            <span className="mini-label">Highest average fit</span>
            <span>
              {[...SECTORS].sort((a, b) => b.avgScore - a.avgScore)[0].name} ·{' '}
              <span className="tnum">{[...SECTORS].sort((a, b) => b.avgScore - a.avgScore)[0].avgScore}</span>
            </span>
          </div>
        </section>
      </div>

      <section className="team-strip">
        <div className="team-strip__copy">
          <h3>Hand this laptop to a colleague.</h3>
          <p>
            The workspace keeps state in the browser: saved accounts, route, notes and stages. Reset it from the
            sidebar when you want a clean run.
          </p>
        </div>
        <div className="team-strip__stats">
          <div>
            <span className="mini-label">Saved</span>
            <span className="tnum">{ws.state.saved.length}</span>
          </div>
          <div>
            <span className="mini-label">On route</span>
            <span className="tnum">{ws.state.route.length}</span>
          </div>
          <div>
            <span className="mini-label">Following</span>
            <span className="tnum">{ws.state.following.length}</span>
          </div>
          <div>
            <span className="mini-label">Stage changes</span>
            <span className="tnum">
              {Object.entries(ws.state.stages).filter(([id, stage]) => byId(id) && byId(id)!.status !== stage).length}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
