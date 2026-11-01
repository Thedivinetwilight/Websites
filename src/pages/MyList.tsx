import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import type { OutletCtx } from '../components/AppShell'
import { OWNER_COLORS, inrLakhs, initials, scoreOf } from '../lib/data'
import { useDataset } from '../lib/store'
import { STAGES, useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'
import { ScoreRing } from '../components/ScoreRing'
import { SignalChips } from '../components/Signals'
import type { Stage } from '../lib/types'

export function MyList() {
  const { prospects } = useDataset()
  const { openAccount } = useOutletContext<OutletCtx>()
  const ws = useWorkspace()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)

  const rows = useMemo(
    () =>
      ws.savedProspects
        .filter((p) => !query || `${p.name} ${p.district} ${p.sector}`.toLowerCase().includes(query.toLowerCase()))
        .map((p) => ({ p, stage: ws.stageOf(p.id), score: scoreOf(p) }))
        .sort((a, b) => b.score - a.score),
    [ws, query],
  )

  const byStage = useMemo(() => {
    const map = new Map<Stage, typeof rows>()
    STAGES.forEach((s) => map.set(s.id, rows.filter((r) => r.stage === s.id)))
    return map
  }, [rows])

  const totalPotential = rows.reduce((s, r) => s + r.p.potentialL, 0)
  const stale = rows.filter((r) => r.p.lastTouchDays > 20)

  const move = (id: string, dir: -1 | 1) => {
    const current = ws.stageOf(id)
    const idx = STAGES.findIndex((s) => s.id === current)
    const next = STAGES[Math.max(0, Math.min(STAGES.length - 1, idx + dir))]
    if (next.id === current) return
    ws.setStage(id, next.id)
    toast(`${byIdName(id)} moved to ${next.label}`, 'success')
  }

  const byIdName = (id: string) => prospects.find((p) => p.id === id)?.name ?? 'Account'

  const drop = (stage: Stage) => {
    if (!dragging) return
    ws.setStage(dragging, stage)
    toast(`${byIdName(dragging)} moved to ${STAGES.find((s) => s.id === stage)?.label}`, 'success')
    setDragging(null)
    setOverStage(null)
  }

  return (
    <div className="page page--list">
      <header className="page-head">
        <div>
          <p className="page-eyebrow">Field pipeline · {ws.state.saved.length} saved accounts</p>
          <h1 className="page-title display">The conversations in motion.</h1>
          <p className="page-sub">
            Drag a card, or use the arrows. Every move is saved to the local demo database — reset any time from
            the sidebar.
          </p>
        </div>
        <div className="page-head__actions">
          <label className="search-input search-input--sm">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find in my list…"
              aria-label="Find in my list"
            />
          </label>
          <Link to="/app/prospects" className="btn btn--sm btn--ghost">
            <Users size={14} /> Add accounts
          </Link>
          <Link to="/app/route" className="btn btn--sm">
            Route <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="list-summary">
        <div>
          <span className="mini-label">Open potential in your list</span>
          <strong className="tnum">{inrLakhs(totalPotential)}</strong>
        </div>
        <div>
          <span className="mini-label">In conversation</span>
          <strong className="tnum">{(byStage.get('contacted')?.length ?? 0) + (byStage.get('meeting')?.length ?? 0)}</strong>
        </div>
        <div>
          <span className="mini-label">Customers</span>
          <strong className="tnum">{byStage.get('customer')?.length ?? 0}</strong>
        </div>
        <div>
          <span className="mini-label">Untouched 20+ days</span>
          <strong className="tnum">{stale.length}</strong>
        </div>
        <div className="list-summary__bar">
          {STAGES.filter((s) => (byStage.get(s.id)?.length ?? 0) > 0).map((s) => {
            const count = byStage.get(s.id)?.length ?? 0
            return (
              <span
                key={s.id}
                className={`list-summary__seg list-summary__seg--${s.id}`}
                style={{ flex: count }}
                title={`${s.label}: ${count}`}
              />
            )
          })}
        </div>
      </section>

      <div className="kanban">
        {STAGES.map((stage) => {
          const items = byStage.get(stage.id) ?? []
          const potential = items.reduce((s, r) => s + r.p.potentialL, 0)
          return (
            <section
              key={stage.id}
              className={`kanban-col ${overStage === stage.id ? 'is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setOverStage(stage.id)
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault()
                drop(stage.id)
              }}
              aria-label={`${stage.label} column`}
            >
              <header className="kanban-col__head">
                <span className={`kanban-dot kanban-dot--${stage.id}`} />
                <h2>{stage.label}</h2>
                <span className="kanban-col__count tnum">{items.length}</span>
                <span className="kanban-col__potential tnum">{inrLakhs(potential)}</span>
              </header>
              <p className="kanban-col__hint">{stage.hint}</p>

              <div className="kanban-col__body">
                {items.map(({ p, score }) => (
                  <article
                    key={p.id}
                    className={`kanban-card ${dragging === p.id ? 'is-dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', p.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDragging(p.id)
                    }}
                    onDragEnd={() => {
                      setDragging(null)
                      setOverStage(null)
                    }}
                    onClick={() => openAccount(p.id)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openAccount(p.id)}
                  >
                    <div className="kanban-card__top">
                      <ScoreRing value={score} size={30} stroke={3} />
                      <span className="kanban-card__name">{p.name}</span>
                      <GripVertical size={14} className="kanban-card__grip" aria-hidden="true" />
                    </div>
                    <p className="kanban-card__meta">
                      {p.locality}, {p.district} · {p.subSector}
                    </p>
                    <div className="kanban-card__signals">
                      <SignalChips signals={p.signals} max={2} />
                      <span className="kanban-card__value tnum">{inrLakhs(p.potentialL)}</span>
                    </div>
                    <footer className="kanban-card__foot">
                      <span className="avatar avatar--xs" style={{ background: OWNER_COLORS[p.owner], color: '#fdf9ef' }}>
                        {initials(p.owner)}
                      </span>
                      <span className="kanban-card__owner">{p.owner.split(' ')[0]}</span>
                      <span className="kanban-card__touch">touched {p.lastTouchDays}d ago</span>
                      <div className="kanban-card__actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="icon-btn icon-btn--xs"
                          aria-label="Move back a stage"
                          onClick={() => move(p.id, -1)}
                          disabled={stage.id === 'new'}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button
                          className="icon-btn icon-btn--xs"
                          aria-label="Move forward a stage"
                          onClick={() => move(p.id, 1)}
                          disabled={stage.id === 'customer'}
                        >
                          <ChevronRight size={13} />
                        </button>
                        <button
                          className="icon-btn icon-btn--xs"
                          aria-label="Remove from list"
                          onClick={() => {
                            ws.removeSaved(p.id)
                            toast(`${p.name} removed from your list`, 'info')
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </footer>
                  </article>
                ))}

                {items.length === 0 && (
                  <div className="kanban-empty">
                    {overStage === stage.id ? 'Drop here' : 'Nothing here yet'}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {rows.length === 0 && (
        <div className="panel empty-state empty-state--lg">
          <span className="empty-state__icon">
            <Bookmark size={20} />
          </span>
          <p className="empty-state__title">Your list is empty.</p>
          <p>Open any account and press save — it will appear here, ready to move through the pipeline.</p>
          <Link to="/app/prospects" className="btn btn--sm">
            Browse accounts <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {stale.length > 0 && (
        <section className="panel stale-panel">
          <div className="panel__head">
            <div>
              <h2 className="panel__title">Needs a nudge</h2>
              <p className="panel__sub">Saved accounts untouched for more than 20 days</p>
            </div>
            <span className="pill pill--turmeric">{stale.length}</span>
          </div>
          <ul className="stale-list">
            {stale.slice(0, 4).map(({ p, stage }) => (
              <li key={p.id}>
                <button className="stale-row" onClick={() => openAccount(p.id)}>
                  <span className="stale-row__name">{p.name}</span>
                  <span className="stale-row__meta">
                    {p.district} · {STAGES.find((s) => s.id === stage)?.label}
                  </span>
                  <span className="stale-row__days tnum">{p.lastTouchDays} days</span>
                  <ArrowRight size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="page-footnote">
        <ArrowLeft size={13} /> Tip for the live walkthrough: drag a card between columns, then open the account to show
        the note and signals behind it.
      </p>
    </div>
  )
}
