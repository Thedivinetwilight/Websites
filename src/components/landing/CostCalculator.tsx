import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'

const DEFAULTS = { reps: 9, calls: 5, days: 20, misfit: 42 }

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="calc-slider">
      <span className="calc-slider__head">
        <span>{label}</span>
        <span className="calc-slider__value tnum">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--pct' as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </label>
  )
}

export function CostCalculator() {
  const [reps, setReps] = useState(DEFAULTS.reps)
  const [calls, setCalls] = useState(DEFAULTS.calls)
  const [days, setDays] = useState(DEFAULTS.days)
  const [misfit, setMisfit] = useState(DEFAULTS.misfit)

  const numbers = useMemo(() => {
    const totalCalls = reps * calls * days
    const misfires = Math.round(totalCalls * (misfit / 100))
    const hours = Math.round(misfires * 0.75)
    const weeks = hours / 40
    const displacedL = Math.round(misfires * 0.05 * 1.6 * 10) / 10
    return { totalCalls, misfires, hours, weeks, displacedL }
  }, [reps, calls, days, misfit])

  return (
    <section className="calc section" id="cost">
      <div className="wrap calc__grid">
        <div className="calc__copy">
          <p className="eyebrow eyebrow--light">
            <span className="eyebrow__dot" /> The cost of the wrong door
          </p>
          <h2 className="display section-title section-title--light">
            Every misfire is a call
            <br />
            <em>somebody else made.</em>
          </h2>
          <p className="calc__lede">
            A field team does not lose deals because it is lazy. It loses them because the list was never a market
            view. Move the sliders to your own team and see what mis-targeted calls cost in a month.
          </p>
          <ul className="calc__assumptions">
            <li>45 minutes per unproductive call, including travel and notes.</li>
            <li>One in twenty exploratory calls converts, at ₹1.6 L average contract value.</li>
            <li>Illustrative model. Directional, not a forecast.</li>
          </ul>
          <button
            className="calc__reset"
            onClick={() => {
              setReps(DEFAULTS.reps)
              setCalls(DEFAULTS.calls)
              setDays(DEFAULTS.days)
              setMisfit(DEFAULTS.misfit)
            }}
          >
            <RotateCcw size={13} /> Reset to a 9-rep team
          </button>
        </div>

        <div className="calc__card">
          <div className="calc__result">
            <span className="mini-label">Selling hours lost / month</span>
            <p className="calc__big tnum">
              {numbers.hours.toLocaleString('en-IN')}
              <span>hrs</span>
            </p>
            <p className="calc__sub">
              ≈ {numbers.weeks.toFixed(1)} working weeks of one full-time rep, every month.
            </p>
          </div>

          <div className="calc__bars" aria-hidden="true">
            <div className="calc__bar">
              <span className="calc__bar-fill calc__bar-fill--good" style={{ width: `${100 - misfit}%` }} />
              <span className="calc__bar-fill calc__bar-fill--bad" style={{ width: `${misfit}%` }} />
            </div>
            <div className="calc__bar-legend">
              <span>
                <i className="swatch swatch--jade" /> {100 - misfit}% well matched
              </span>
              <span>
                <i className="swatch swatch--clay" /> {misfit}% poor fit · {numbers.misfires} calls
              </span>
            </div>
          </div>

          <div className="calc__stats">
            <div>
              <span className="mini-label">Calls made / month</span>
              <p className="tnum">{numbers.totalCalls.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="mini-label">Opportunity displaced</span>
              <p className="tnum">₹{numbers.displacedL.toFixed(1)} L</p>
            </div>
          </div>

          <div className="calc__controls">
            <Slider label="Field reps" value={reps} min={2} max={24} format={(v) => `${v}`} onChange={setReps} />
            <Slider label="Calls per rep, per day" value={calls} min={3} max={8} format={(v) => `${v}`} onChange={setCalls} />
            <Slider label="Working days" value={days} min={16} max={24} format={(v) => `${v}`} onChange={setDays} />
            <Slider
              label="Calls to poor-fit accounts"
              value={misfit}
              min={20}
              max={70}
              format={(v) => `${v}%`}
              onChange={setMisfit}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
