import { useState } from 'react'
import { ArrowRight, Check, MapPin, MoveRight, StickyNote, Sun } from 'lucide-react'
import { inrLakhs, scoreOf } from '../../lib/data'
import { useDataset } from '../../lib/store'
import { ScoreRing } from '../ScoreRing'
import { Meter } from '../Meter'
import { TnMap } from '../TnMap'
import { SignalChips } from '../Signals'

const STEPS = [
  {
    time: '08:40',
    label: 'Morning brief',
    title: 'Six names, and a reason for each.',
    body: 'The brief rebuilds before the first call: accounts ranked by signal strength, with the reason to call written in a line a rep can read in the auto.',
  },
  {
    time: '10:15',
    label: 'District desk',
    title: 'Check the market before the market checks you.',
    body: 'Momentum, sector mix and the accounts most likely to take a meeting this month — for the district you are standing in, not a national average.',
  },
  {
    time: '13:30',
    label: 'Route',
    title: 'One route. No dead kilometres.',
    body: 'Theru clusters the shortlist by locality and gives the day a shape: three conversations, forty-four kilometres, and time for the one you did not plan.',
  },
  {
    time: '18:20',
    label: 'Field notes',
    title: 'The day feeds tomorrow’s brief.',
    body: 'A thirty-second note moves the account forward and teaches the next ranking. No separate CRM hygiene session at the end of the week.',
  },
]

function BriefMock() {
  const { byId } = useDataset()
  const rows = ['TH-1002', 'TH-1000', 'TH-1006']
    .map((id) => byId(id))
    .filter(Boolean)
  return (
    <div className="mock mock--brief">
      <div className="mock__chrome">
        <span className="mock__chrome-title">Morning brief</span>
        <span className="mock__chrome-sub">Sun 1 Nov · 6 accounts</span>
      </div>
      <ul className="mock-brief">
        {rows.map((p, i) =>
          p ? (
            <li key={p.id} className="mock-brief__row">
              <span className="mock-brief__rank tnum">0{i + 1}</span>
              <ScoreRing value={scoreOf(p)} size={34} stroke={3.5} />
              <span className="mock-brief__body">
                <span className="mock-brief__name">{p.name}</span>
                <span className="mock-brief__meta">
                  {p.district} · {p.subSector}
                </span>
              </span>
              <SignalChips signals={p.signals} max={1} />
              <span className="mock-brief__val tnum">{inrLakhs(p.potentialL)}</span>
            </li>
          ) : null,
        )}
      </ul>
      <div className="mock__foot">
        <span className="mock__foot-note">Ranked by today’s signal strength</span>
        <span className="mock__chip">
          <Sun size={12} /> 2 morning visits
        </span>
      </div>
    </div>
  )
}

function DistrictMock() {
  const { allDistricts } = useDataset()
  const d = allDistricts.find((x) => x.name === 'Tiruppur')!
  const maxSector = Math.max(...d.topSectors.map((s) => s.count))
  return (
    <div className="mock mock--district">
      <div className="mock__chrome">
        <span className="mock__chrome-title">Tiruppur district</span>
        <span className="mock__chrome-sub">West region · {d.prospects} accounts</span>
      </div>
      <div className="mock-district">
        <div className="mock-district__map">
          <TnMap
            metric="momentum"
            highlight="Tiruppur"
            dimOthers
            showLabels={false}
            showTooltip={false}
            interactive={false}
          />
        </div>
        <div className="mock-district__side">
          <div className="mock-stat">
            <span className="mock-stat__label">Momentum</span>
            <span className="mock-stat__value tnum">{d.momentum}</span>
            <span className="mock-stat__delta">+{d.growth}% YoY</span>
          </div>
          <div className="mock-stat">
            <span className="mock-stat__label">Open potential</span>
            <span className="mock-stat__value tnum">{inrLakhs(d.potentialL)}</span>
          </div>
          <div className="mock-sectors">
            <span className="mock-stat__label">Sector mix</span>
            {d.topSectors.slice(0, 3).map((s) => (
              <div key={s.name} className="mock-sector">
                <span className="mock-sector__name">{s.name}</span>
                <Meter value={s.count} max={maxSector} height={4} tone="turmeric" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mock__foot">
        <span className="mock__foot-note">{d.character}</span>
      </div>
    </div>
  )
}

function RouteMock() {
  const { byId } = useDataset()
  const stops = ['TH-1003', 'TH-1002', 'TH-1010'].map((id) => byId(id)).filter(Boolean)
  const times = ['09:30', '11:15', '14:00']
  const legs = ['18 min · 9 km', '41 min · 35 km']
  return (
    <div className="mock mock--route">
      <div className="mock__chrome">
        <span className="mock__chrome-title">Tuesday’s route</span>
        <span className="mock__chrome-sub">3 stops · 2 districts</span>
      </div>
      <ol className="mock-route">
        {stops.map((p, i) =>
          p ? (
            <li key={p.id} className="mock-route__stop">
              <span className="mock-route__time tnum">{times[i]}</span>
              <span className="mock-route__rail">
                <span className="mock-route__dot" />
                {i < stops.length - 1 && <span className="mock-route__line" />}
              </span>
              <span className="mock-route__body">
                <span className="mock-route__name">{p.name}</span>
                <span className="mock-route__meta">
                  <MapPin size={11} /> {p.locality}, {p.district}
                </span>
                {i < stops.length - 1 && <span className="mock-route__leg">{legs[i]}</span>}
              </span>
              <span className="mock-route__val tnum">{inrLakhs(p.potentialL)}</span>
            </li>
          ) : null,
        )}
      </ol>
      <div className="mock__foot">
        <span className="mock__chip">44 km door to door</span>
        <span className="mock__foot-note">Leave by 08:45</span>
      </div>
    </div>
  )
}

function NotesMock() {
  const { byId } = useDataset()
  const p = byId('TH-1010')!
  return (
    <div className="mock mock--notes">
      <div className="mock__chrome">
        <span className="mock__chrome-title">Field note · {p.name}</span>
        <span className="mock__chrome-sub">Chengalpattu</span>
      </div>
      <div className="mock-notes">
        <div className="mock-notes__head">
          <ScoreRing value={scoreOf(p)} size={42} stroke={4} />
          <div>
            <p className="mock-notes__name">{p.name}</p>
            <p className="mock-notes__meta">
              {p.subSector} · {p.employees} employees
            </p>
          </div>
          <span className="mock__chip mock__chip--jade">
            <Check size={12} /> Contacted
          </span>
        </div>
        <div className="mock-notes__note">
          <StickyNote size={14} />
          <p>
            Met the plant head. Two OEM audits in January — they want a forecast they can hand to the auditors. Send
            the template and book a follow-up for the 12th.
          </p>
        </div>
        <div className="mock-notes__next">
          <span className="mock__label">Next step</span>
          <span className="mock-notes__next-row">
            Follow-up on 12 Nov <MoveRight size={13} /> auto-added to the brief
          </span>
        </div>
      </div>
      <div className="mock__foot">
        <span className="mock__foot-note">Notes sync to the account and the team</span>
      </div>
    </div>
  )
}

const MOCKS = [BriefMock, DistrictMock, RouteMock, NotesMock]

export function DayWithTheru() {
  const [active, setActive] = useState(0)
  const Mock = MOCKS[active]

  return (
    <section className="day section" id="day">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <p className="eyebrow">
              <span className="eyebrow__dot" /> A day with Theru
            </p>
            <h2 className="display section-title">
              One workspace.
              <br />
              <em>Four moments</em> that decide the quarter.
            </h2>
          </div>
          <p className="section-intro">
            Most field tools are built for the office. Theru is built for the twelve minutes between two visits — when
            the next best call has to be obvious, not researched.
          </p>
        </div>

        <div className="day__layout">
          <ol className="day__steps" role="tablist" aria-label="A day with Theru">
            {STEPS.map((s, i) => (
              <li key={s.time}>
                <button
                  role="tab"
                  aria-selected={i === active}
                  className={`day__step ${i === active ? 'is-active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className="day__step-time tnum">{s.time}</span>
                  <span className="day__step-body">
                    <span className="day__step-label">
                      {s.label}
                      <ArrowRight size={14} className="day__step-arrow" />
                    </span>
                    {i === active && (
                      <span className="day__step-detail">
                        <strong>{s.title}</strong>
                        <span>{s.body}</span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="day__mock" role="tabpanel" key={active}>
            <Mock />
          </div>
        </div>
      </div>
    </section>
  )
}
