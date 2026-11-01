import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Route as RouteIcon,
  X,
} from 'lucide-react'
import { byId, daysLabel, inrLakhs, initials, prospects, scoreBreakdown, scoreOf } from '../lib/data'
import { STAGES, useWorkspace } from '../lib/store'
import { useToast } from '../lib/toast'
import { ScoreRing } from './ScoreRing'
import { Meter, StagePill } from './Meter'
import { SignalRow } from './Signals'
import type { Stage } from '../lib/types'

export function ProspectDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const prospect = byId(id)
  const ws = useWorkspace()
  const toast = useToast()
  const panelRef = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState(() => ws.noteOf(id))
  const [noteDirty, setNoteDirty] = useState(false)

  useEffect(() => {
    setNote(ws.noteOf(id))
    setNoteDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('is-locked')
    const timer = window.setTimeout(() => panelRef.current?.focus(), 60)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('is-locked')
      window.clearTimeout(timer)
    }
  }, [onClose])

  const breakdown = useMemo(() => (prospect ? scoreBreakdown(prospect.scores) : []), [prospect])
  const rank = useMemo(() => {
    if (!prospect) return { position: 1, total: 1 }
    const peers = prospects
      .filter((p) => p.district === prospect.district)
      .sort((a, b) => scoreOf(b) - scoreOf(a))
    return { position: peers.findIndex((p) => p.id === prospect.id) + 1, total: peers.length }
  }, [prospect])

  if (!prospect) return null

  const saved = ws.isSaved(prospect.id)
  const routed = ws.inRoute(prospect.id)
  const stage = ws.stageOf(prospect.id)
  const score = scoreOf(prospect)

  const saveNoteNow = () => {
    ws.saveNote(prospect.id, note)
    setNoteDirty(false)
    toast('Note saved to the account')
  }

  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" aria-label="Close account" onClick={onClose} tabIndex={-1} />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="drawer__top">
          <span className="drawer__id tnum">Account {prospect.id}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close account panel">
            <X size={17} />
          </button>
        </div>

        <div className="drawer__scroll">
          <header className="drawer__head">
            <h2 id="drawer-title" className="drawer__title">
              {prospect.name}
            </h2>
            <p className="drawer__sub">
              {prospect.subSector} · {prospect.sector}
            </p>
            <p className="drawer__loc">
              <MapPin size={13} /> {prospect.locality}, {prospect.district} district ·{' '}
              <span className="muted">{prospect.accountTier}</span>
            </p>
            <div className="drawer__badges">
              <StagePill stage={stage} />
              {prospect.spotlight && <span className="pill pill--turmeric">On today’s brief</span>}
              <span className="pill pill--quiet">Owner · {prospect.owner.split(' ')[0]}</span>
            </div>
          </header>

          <section className="drawer__score">
            <div className="drawer__score-main">
              <ScoreRing value={score} size={78} stroke={6} />
              <div>
                <span className="mini-label">Theru score</span>
                <p className="drawer__score-hint">
                  Ranked #{rank.position} of {rank.total} accounts in {prospect.district}
                </p>
              </div>
            </div>
            <div className="drawer__bars">
              {breakdown.map((b) => (
                <div key={b.key} className="drawer__bar">
                  <span className="drawer__bar-label">
                    <span>
                      {b.label} <span className="drawer__bar-weight">{b.weight}%</span>
                    </span>
                    <span className="tnum">{b.value}</span>
                  </span>
                  <Meter value={b.value} tone={b.value >= 78 ? 'jade' : b.value >= 64 ? 'turmeric' : 'ink'} />
                </div>
              ))}
            </div>
          </section>

          <div className="drawer__actions">
            <button
              className={`btn btn--sm ${routed ? 'btn--ghost' : ''}`}
              onClick={() => {
                if (routed) {
                  ws.removeStop(prospect.id)
                  toast('Removed from the route', 'info')
                } else {
                  ws.addStop(prospect.id)
                  toast(`${prospect.name} added to your route`)
                }
              }}
            >
              {routed ? <RouteIcon size={15} /> : <Plus size={15} />}
              {routed ? 'On route' : 'Add to route'}
            </button>
            <button
              className={`btn btn--sm btn--ghost`}
              onClick={() => {
                const added = ws.toggleSaved(prospect.id)
                toast(added ? 'Saved to your list' : 'Removed from your list', added ? 'success' : 'info')
              }}
            >
              {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              {saved ? 'Saved' : 'Save'}
            </button>
            <div className="drawer__stage">
              <label htmlFor="stage-select" className="sr-only">
                Pipeline stage
              </label>
              <select
                id="stage-select"
                className="select select--sm"
                value={stage}
                onChange={(e) => {
                  ws.setStage(prospect.id, e.target.value as Stage)
                  ws.addToSaved(prospect.id)
                  toast(`Moved to ${e.target.value === 'customer' ? 'Customer' : e.target.value}`)
                }}
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section className="drawer__section">
            <div className="drawer__section-head">
              <h3>Why now</h3>
              <span className="mini-label">{prospect.signals.length} signals</span>
            </div>
            <ul className="signal-list">
              {prospect.signals.map((s) => (
                <SignalRow key={`${s.type}-${s.date}`} signal={s} />
              ))}
            </ul>
            <p className="drawer__source">
              Sourced from public registries, filings and trade activity · refreshed daily
            </p>
          </section>

          <section className="drawer__section">
            <h3>Account snapshot</h3>
            <dl className="snap">
              <div>
                <dt>Employees</dt>
                <dd className="tnum">{prospect.employees}</dd>
              </div>
              <div>
                <dt>Revenue (est.)</dt>
                <dd className="tnum">₹{prospect.revenueCr} Cr</dd>
              </div>
              <div>
                <dt>Founded</dt>
                <dd className="tnum">{prospect.foundedYear}</dd>
              </div>
              <div>
                <dt>Open potential</dt>
                <dd className="tnum">{inrLakhs(prospect.potentialL)}</dd>
              </div>
              <div>
                <dt>Last touch</dt>
                <dd>{daysLabel(prospect.lastTouchDays)}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{prospect.owner.split(' ')[0]}</dd>
              </div>
            </dl>
          </section>

          <section className="drawer__section">
            <h3>Who to call</h3>
            <div className="contact-card">
              <span className="avatar avatar--sm" style={{ background: 'var(--jade-100)', color: 'var(--jade-700)' }}>
                {initials(prospect.contact.name)}
              </span>
              <div className="contact-card__body">
                <p className="contact-card__name">{prospect.contact.name}</p>
                <p className="contact-card__role">{prospect.contact.role}</p>
              </div>
              <div className="contact-card__links">
                <a href={`tel:${prospect.contact.phone.replace(/\s/g, '')}`} className="icon-btn" aria-label="Call">
                  <Phone size={15} />
                </a>
                <a href={`mailto:${prospect.contact.email}`} className="icon-btn" aria-label="Email">
                  <Mail size={15} />
                </a>
              </div>
            </div>
            <ul className="contact-meta">
              <li>{prospect.contact.phone}</li>
              <li>{prospect.contact.email}</li>
              {prospect.website && <li>{prospect.website}</li>}
            </ul>
          </section>

          <section className="drawer__section">
            <div className="drawer__section-head">
              <h3>Field notes</h3>
              {noteDirty && <span className="mini-label mini-label--warn">Unsaved</span>}
            </div>
            <textarea
              className="note-input"
              value={note}
              rows={3}
              placeholder="What did you learn? Gatekeepers, budgets, best time to call…"
              onChange={(e) => {
                setNote(e.target.value)
                setNoteDirty(true)
              }}
              onBlur={() => {
                if (noteDirty) saveNoteNow()
              }}
            />
            <div className="drawer__note-actions">
              <span className="mini-label">Autosaves when you leave the field</span>
              <button className="btn btn--sm btn--ghost" onClick={saveNoteNow} disabled={!noteDirty}>
                <Check size={14} /> Save note
              </button>
            </div>
          </section>

          <footer className="drawer__foot">
            <p>
              Last refreshed today, 06:30 IST · <span className="muted">Demo record</span>
            </p>
            <a className="link-arrow" href={`https://${prospect.website ?? 'example.in'}`} target="_blank" rel="noreferrer">
              Public profile <ArrowUpRight size={14} />
            </a>
          </footer>
        </div>
      </div>
    </div>
  )
}
