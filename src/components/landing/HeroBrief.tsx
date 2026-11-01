import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleDot, MapPin, Route as RouteIcon } from 'lucide-react'
import { TOTALS, allDistricts, byId, inrLakhs, scoreOf } from '../../lib/data'
import { ScoreRing } from '../ScoreRing'
import { SignalChips } from '../Signals'
import { TnMap } from '../TnMap'

const HERO_ACCOUNTS = ['TH-1002', 'TH-1000', 'TH-1006']

export function HeroBrief({ accounts }: { accounts: string[] }) {
  const rows = HERO_ACCOUNTS.map((id) => byId(id)).filter(Boolean)
  const tiruppur = allDistricts.find((d) => d.name === 'Tiruppur')!

  return (
    <div className="hero-visual" aria-label="Sample morning brief">
      <div className="hero-visual__back" aria-hidden="true">
        <div className="hero-map-card">
          <div className="hero-map-card__head">
            <span>District atlas</span>
            <span className="hero-map-card__tag">37 districts</span>
          </div>
          <TnMap
            metric="accounts"
            showLabels={false}
            showTooltip={false}
            interactive={false}
            className="hero-map-card__map"
          />
          <div className="hero-map-card__foot">
            <span className="dot-live" /> One operating picture
          </div>
        </div>
      </div>

      <div className="hero-tag hero-tag--top">
        <CircleDot size={13} />
        <span>
          <strong>{tiruppur.signalCount} signals</strong> in Tiruppur this month
        </span>
      </div>

      <div className="brief-card">
        <div className="brief-card__head">
          <div>
            <span className="brief-card__eyebrow">Morning brief</span>
            <p className="brief-card__date">Sunday, 1 November · rebuilt 06:30 IST</p>
          </div>
          <span className="live-pill">
            <span className="dot-live" /> Live
          </span>
        </div>

        <div className="brief-card__list">
          {rows.map((p, i) =>
            p ? (
              <Link
                key={p.id}
                to={`/app/prospects?account=${p.id}`}
                className="brief-row"
                style={{ animationDelay: `${120 + i * 90}ms` }}
              >
                <ScoreRing value={scoreOf(p)} size={44} stroke={4} />
                <span className="brief-row__body">
                  <span className="brief-row__name">{p.name}</span>
                  <span className="brief-row__meta">
                    <MapPin size={11} /> {p.locality}, {p.district}
                    <span className="brief-row__dot" />
                    {p.subSector}
                  </span>
                  <SignalChips signals={p.signals} max={2} />
                </span>
                <span className="brief-row__right">
                  <span className="brief-row__value tnum">{inrLakhs(p.potentialL)}</span>
                  <span className="brief-row__hint">open potential</span>
                  <ArrowUpRight size={14} className="brief-row__arrow" />
                </span>
              </Link>
            ) : null,
          )}
        </div>

        <div className="brief-card__foot">
          <span className="brief-card__foot-item">
            <RouteIcon size={13} /> 3 stops on today’s route
          </span>
          <span className="brief-card__foot-item tnum">
            {TOTALS.accounts} accounts · {TOTALS.districts} districts
          </span>
        </div>
      </div>

      <div className="hero-tag hero-tag--bottom">
        <span className="hero-tag__score">+12</span>
        <span>score change this week</span>
      </div>
    </div>
  )
}
