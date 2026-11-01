import { Fragment, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  Coffee,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  GripVertical,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Route as RouteIcon,
  Search,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import type { OutletCtx } from '../components/AppShell'
import { TnMap } from '../components/TnMap'
import { ScoreRing } from '../components/ScoreRing'
import { SignalChips } from '../components/Signals'
import { inrLakhs, prospects, scoreOf, byId } from '../lib/data'
import { useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'
import { clock, dateLabelLong, durationLabel, isLongDay, planRoute } from '../lib/route'

export function RoutePage() {
  const { openAccount } = useOutletContext<OutletCtx>()
  const ws = useWorkspace()
  const toast = useToast()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [fieldMode, setFieldMode] = useState(false)
  const [fieldIndex, setFieldIndex] = useState(0)

  const plan = useMemo(() => planRoute(ws.state.route), [ws.state.route])
  const routeIds = new Set(ws.state.route)
  const districts = new Set(plan.stops.map((s) => s.prospect.district))
  const potential = plan.stops.reduce((s, x) => s + x.prospect.potentialL, 0)

  const suggestions = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    const saved = ws.savedProspects.filter((p) => !routeIds.has(p.id))
    const nearby = prospects
      .filter((p) => districts.has(p.district) && !routeIds.has(p.id))
      .sort((a, b) => scoreOf(b) - scoreOf(a))
      .slice(0, 6)
    const merged = [...saved, ...nearby].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    return merged
      .filter((p) => !q || `${p.name} ${p.district} ${p.sector}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [pickerQuery, ws.savedProspects, ws.state.route, plan])

  const saveDate = (value: string) => ws.setRouteDate(value)

  const optimise = () => {
    if (plan.stops.length < 2) {
      toast('Add at least two stops to optimise the route', 'info')
      return
    }
    const ordered = [...plan.stops]
      .sort((a, b) => {
        if (a.prospect.district !== b.prospect.district) return a.prospect.district.localeCompare(b.prospect.district)
        return scoreOf(b.prospect) - scoreOf(a.prospect)
      })
      .map((s) => s.prospect.id)
    ordered.forEach((id, index) => {
      const current = ws.state.route.indexOf(id)
      const delta = index - current
      if (delta > 0) for (let i = 0; i < delta; i++) ws.moveStop(id, 1)
      if (delta < 0) for (let i = 0; i < -delta; i++) ws.moveStop(id, -1)
    })
    const next = planRoute(ordered)
    toast(`Route reordered · ${next.totalKm} km, ${durationLabel(next.totalMinutes)} door to door`)
  }

  const mapMarkers = useMemo(
    () => plan.stops.map((s) => ({ district: s.prospect.district })),
    [plan],
  )

  const activeStop = plan.stops[fieldIndex]

  return (
    <div className="page page--route">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">Route planner · {dateLabelLong(ws.state.routeDate)} · {plan.totalKm} km</p>
          <h1 className="page-title display">One day, in the right order.</h1>
          <p className="page-sub">
            Stops are clustered by district. End the day with conversations, not kilometres.
          </p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--sm btn--ghost" onClick={optimise}>
            <Compass size={14} /> Optimise order
          </button>
          <button
            className="btn btn--sm"
            onClick={() => {
              if (!plan.stops.length) {
                toast('Add a stop before you start the route', 'info')
                return
              }
              setFieldIndex(0)
              setFieldMode(true)
            }}
          >
            <Navigation size={14} /> Start field mode
          </button>
        </div>
      </header>

      {isLongDay(plan.totalKm, plan.stops.length) && (
        <div className="route-alert">
          <TrendingUp size={15} />
          <p>
            <strong>{plan.totalKm} km</strong> and {durationLabel(plan.totalMinutes)} door to door is a long day.
            Consider a second date, or drop the outlying stop in {[...districts].slice(-1)[0]} and keep the cluster
            tight.
          </p>
        </div>
      )}

      <div className="route-grid">
        <section className="panel route-panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">{dateLabelLong(ws.state.routeDate)}</h2>
              <p className="panel__sub">
                {plan.stops.length} stops · {districts.size} districts · leaves 09:15 IST
              </p>
            </div>
            <label className="date-field">
              <CalendarDays size={14} />
              <input
                type="date"
                value={ws.state.routeDate}
                min="2026-11-01"
                max="2026-12-31"
                onChange={(e) => saveDate(e.target.value)}
                aria-label="Route date"
              />
            </label>
          </div>

          {plan.stops.length === 0 ? (
            <div className="empty-state empty-state--lg">
              <p className="empty-state__title">This route is empty.</p>
              <p>Add saved accounts, or let Theru suggest the highest-signal businesses nearby.</p>
              <button className="btn btn--sm" onClick={() => setPickerOpen(true)}>
                <Plus size={14} /> Add your first stop
              </button>
            </div>
          ) : (
            <ol className="route-list">
              {plan.stops.map((s, i) => {
                const p = s.prospect
                return (
                  <Fragment key={p.id}>
                    {s.breakMin && s.breakStart !== undefined && (
                      <li className="route-stop route-stop--break">
                        <div className="route-stop__time">
                          <span className="route-stop__arrive tnum">{clock(s.breakStart)}</span>
                          <span className="route-stop__leave tnum">until {clock(s.breakStart + s.breakMin)}</span>
                        </div>
                        <div className="route-stop__rail">
                          <span className="route-stop__dot route-stop__dot--break">
                            <Coffee size={11} />
                          </span>
                          <span className="route-stop__line" />
                        </div>
                        <div className="route-stop__body">
                          <span className="route-stop__break-title">Lunch break · {s.breakMin} min</span>
                          <span className="route-stop__break-note">
                            Cash, filter coffee, and a look at the afternoon's notes.
                          </span>
                        </div>
                      </li>
                    )}
                    <li className="route-stop">
                    <div className="route-stop__time">
                      <span className="route-stop__arrive tnum">{clock(s.arrive)}</span>
                      <span className="route-stop__leave tnum">until {clock(s.leave)}</span>
                    </div>
                    <div className="route-stop__rail">
                      <span className={`route-stop__dot ${i === 0 ? 'is-first' : ''}`}>{i + 1}</span>
                      {i < plan.stops.length - 1 && <span className="route-stop__line" />}
                    </div>
                    <div className="route-stop__body">
                      {s.legKm > 0 && (
                        <span className="route-stop__leg">
                          <Navigation size={11} /> {s.legKm} km · {durationLabel(s.legMin)} drive
                        </span>
                      )}
                      <button className="route-stop__name" onClick={() => openAccount(p.id)}>
                        {p.name}
                      </button>
                      <span className="route-stop__meta">
                        <MapPin size={11} /> {p.locality}, {p.district}
                        <span className="route-stop__dot-sep" />
                        {p.contact.name} · {p.contact.role}
                      </span>
                      <span className="route-stop__tags">
                        <SignalChips signals={p.signals} max={2} />
                        <span className="pill pill--quiet tnum">{inrLakhs(p.potentialL)}</span>
                        <span className="pill pill--quiet">Score {scoreOf(p)}</span>
                      </span>
                      {ws.noteOf(p.id) && <p className="route-stop__note">“{ws.noteOf(p.id)}”</p>}
                    </div>
                    <div className="route-stop__side">
                      <ScoreRing value={scoreOf(p)} size={38} stroke={3.5} />
                      <div className="route-stop__controls">
                        <button
                          className="icon-btn icon-btn--xs"
                          aria-label="Move earlier"
                          onClick={() => ws.moveStop(p.id, -1)}
                          disabled={i === 0}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          className="icon-btn icon-btn--xs"
                          aria-label="Move later"
                          onClick={() => ws.moveStop(p.id, 1)}
                          disabled={i === plan.stops.length - 1}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          className="icon-btn icon-btn--xs"
                          aria-label="Remove from route"
                          onClick={() => {
                            ws.removeStop(p.id)
                            toast('Stop removed from the route', 'info')
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    </li>
                  </Fragment>
                )
              })}
            </ol>
          )}

          <div className="route-panel__foot">
            <button className="btn btn--sm btn--ghost" onClick={() => setPickerOpen((v) => !v)}>
              <Plus size={14} /> Add a stop
            </button>
            <button
              className="link-arrow"
              onClick={() => {
                if (!ws.state.route.length) return
                ws.state.route.forEach((id) => ws.removeStop(id))
                toast('Route cleared', 'info')
              }}
            >
              Clear route
            </button>
          </div>

          {pickerOpen && (
            <div className="route-picker">
              <div className="route-picker__head">
                <div>
                  <h3>Add a stop</h3>
                  <p>Saved accounts and high-signal businesses in the districts you are already visiting.</p>
                </div>
                <button className="icon-btn" onClick={() => setPickerOpen(false)} aria-label="Close picker">
                  <X size={15} />
                </button>
              </div>
              <label className="search-input search-input--sm">
                <Search size={14} />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search accounts…"
                  aria-label="Search accounts to add"
                />
              </label>
              <ul className="route-picker__list">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      className="route-picker__row"
                      onClick={() => {
                        ws.addStop(p.id)
                        toast(`${p.name} added to the route`)
                      }}
                    >
                      <ScoreRing value={scoreOf(p)} size={30} stroke={3} />
                      <span className="route-picker__body">
                        <span className="route-picker__name">{p.name}</span>
                        <span className="route-picker__meta">
                          {p.locality}, {p.district} · {p.subSector}
                        </span>
                      </span>
                      <span className="tnum muted">{inrLakhs(p.potentialL)}</span>
                      <Plus size={15} />
                    </button>
                  </li>
                ))}
                {suggestions.length === 0 && <li className="route-picker__empty">No more matching accounts.</li>}
              </ul>
            </div>
          )}
        </section>

        <aside className="route-side">
          <section className="panel route-summary">
            <h2 className="panel__title">Route summary</h2>
            <div className="route-summary__big">
              <div>
                <span className="mini-label">Day on the road</span>
                <strong className="tnum">{durationLabel(plan.totalMinutes)}</strong>
              </div>
              <div>
                <span className="mini-label">Driving distance</span>
                <strong className="tnum">{plan.totalKm} km</strong>
              </div>
            </div>
            <dl className="route-summary__list">
              <div>
                <dt>Stops</dt>
                <dd className="tnum">{plan.stops.length}</dd>
              </div>
              <div>
                <dt>Districts</dt>
                <dd>{[...districts].join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Open potential</dt>
                <dd className="tnum">{inrLakhs(potential)}</dd>
              </div>
              <div>
                <dt>Day ends</dt>
                <dd className="tnum">{plan.stops.length ? clock(plan.endMinutes) : '—'}</dd>
              </div>
              {plan.breakMinutes > 0 && (
                <div>
                  <dt>Lunch break</dt>
                  <dd className="tnum">{plan.breakMinutes} min</dd>
                </div>
              )}
              <div>
                <dt>Saved on this route</dt>
                <dd className="tnum">{plan.stops.filter((s) => ws.isSaved(s.prospect.id)).length}</dd>
              </div>
            </dl>
            <div className="route-map">
              <TnMap
                metric="momentum"
                showLabels={false}
                showTooltip={false}
                interactive={false}
                markers={mapMarkers}
                highlightSet={[...districts]}
              />
            </div>
            <p className="route-summary__note">
              Where the day sits. Reorder a stop and the map follows.
            </p>
          </section>

          <section className="panel route-tips">
            <h2 className="panel__title">Before you leave</h2>
            <ul>
              <li>
                <Check size={14} /> Confirm the 09:30 with {plan.stops[0]?.prospect.contact.name.split(' ')[0] ?? 'the first stop'}.
              </li>
              <li>
                <Check size={14} /> Carry the capacity model for {plan.stops[0]?.prospect.name ?? 'the first account'}.
              </li>
              <li>
                <Check size={14} /> Two buyers prefer calls before 10 a.m. — route is ordered around them.
              </li>
            </ul>
            <Link to="/app/list" className="link-arrow">
              Open the pipeline board <ArrowRight size={13} />
            </Link>
          </section>
        </aside>
      </div>

      {fieldMode && activeStop && (
        <div className="field-mode" role="dialog" aria-modal="true" aria-label="Field mode">
          <div className="field-mode__top">
            <span className="field-mode__brand">Theru · Field mode</span>
            <button className="field-mode__close" onClick={() => setFieldMode(false)} aria-label="Exit field mode">
              <X size={18} />
            </button>
          </div>
          <div className="field-mode__progress">
            {plan.stops.map((s, i) => (
              <span key={s.prospect.id} className={i <= fieldIndex ? 'is-done' : ''} />
            ))}
          </div>
          <div className="field-mode__body">
            <span className="field-mode__step tnum">
              Stop {fieldIndex + 1} of {plan.stops.length} · arrive {clock(activeStop.arrive)}
            </span>
            <h2>{activeStop.prospect.name}</h2>
            <p className="field-mode__loc">
              <MapPin size={14} /> {activeStop.prospect.locality}, {activeStop.prospect.district}
            </p>
            <div className="field-mode__score">
              <ScoreRing value={scoreOf(activeStop.prospect)} size={54} stroke={4.5} />
              <div>
                <span className="mini-label">Why now</span>
                <p>{activeStop.prospect.signals[0]?.label}</p>
              </div>
            </div>
            <div className="field-mode__contact">
              <div>
                <span className="mini-label">Who to meet</span>
                <p>
                  {activeStop.prospect.contact.name} · {activeStop.prospect.contact.role}
                </p>
              </div>
              <a className="btn btn--sm" href={`tel:${activeStop.prospect.contact.phone.replace(/\s/g, '')}`}>
                <Phone size={14} /> Call
              </a>
            </div>
            {ws.noteOf(activeStop.prospect.id) && (
              <div className="field-mode__note">
                <span className="mini-label">Last note</span>
                <p>{ws.noteOf(activeStop.prospect.id)}</p>
              </div>
            )}
            <div className="field-mode__actions">
              <button
                className="btn btn--ghost"
                onClick={() => openAccount(activeStop.prospect.id)}
              >
                <MapPin size={14} /> Open dossier
              </button>
              <button
                className="btn"
                onClick={() => {
                  ws.setStage(activeStop.prospect.id, 'contacted')
                  ws.addToSaved(activeStop.prospect.id)
                  toast('Logged as contacted')
                  if (fieldIndex < plan.stops.length - 1) setFieldIndex((i) => i + 1)
                  else setFieldMode(false)
                }}
              >
                <Check size={14} /> Log visit & next
              </button>
            </div>
          </div>
          <div className="field-mode__nav">
            <button
              className="btn btn--ghost btn--sm"
              disabled={fieldIndex === 0}
              onClick={() => setFieldIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <span className="field-mode__nav-meta tnum">
              {activeStop.legKm > 0 ? `${activeStop.legKm} km from the last stop` : 'First stop of the day'}
            </span>
            <button
              className="btn btn--ghost btn--sm"
              disabled={fieldIndex >= plan.stops.length - 1}
              onClick={() => setFieldIndex((i) => Math.min(plan.stops.length - 1, i + 1))}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
