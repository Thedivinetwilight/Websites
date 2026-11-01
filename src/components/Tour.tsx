import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'

export interface TourStop {
  path: string
  kicker: string
  title: string
  body: string
}

export function TourCard({
  stops,
  index,
  onIndex,
  onClose,
}: {
  stops: TourStop[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const stop = stops[index]
  const isLast = index === stops.length - 1

  const go = (next: number) => {
    onIndex(next)
    navigate(stops[next].path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <aside className="tour" role="dialog" aria-label="Guided product tour" aria-live="polite">
      <div className="tour__head">
        <span className="tour__kicker">
          Guided tour · {index + 1}/{stops.length}
        </span>
        <button className="tour__close" onClick={onClose} aria-label="Close tour">
          <X size={14} />
        </button>
      </div>
      <div className="tour__progress" aria-hidden="true">
        {stops.map((s, i) => (
          <span key={s.path} className={i <= index ? 'is-done' : ''} />
        ))}
      </div>
      <p className="tour__step">{stop.kicker}</p>
      <h3 className="tour__title">{stop.title}</h3>
      <p className="tour__body">{stop.body}</p>
      <div className="tour__actions">
        <button className="btn btn--sm btn--ghost" onClick={() => (index === 0 ? onClose() : go(index - 1))}>
          {index === 0 ? 'Skip' : <><ArrowLeft size={14} /> Back</>}
        </button>
        <button className="btn btn--sm" onClick={() => (isLast ? onClose() : go(index + 1))}>
          {isLast ? 'Finish tour' : <>Next <ArrowRight size={14} /></>}
        </button>
      </div>
    </aside>
  )
}

export const TOUR_STOPS: TourStop[] = [
  {
    path: '/app',
    kicker: 'The morning brief',
    title: 'Your day, already triaged.',
    body: 'Every account is ranked by today’s signals — growth, hiring, credit, exports — not by whoever shouted last. Start the day with six names that deserve a call.',
  },
  {
    path: '/app/map',
    kicker: 'The district atlas',
    title: 'Thirty-seven markets, one picture.',
    body: 'Switch the metric to see where business activity is accelerating, where the pipeline is deepest, and which districts are cooling off. Click any district to open its desk.',
  },
  {
    path: '/app/prospects',
    kicker: 'Prospect workspace',
    title: 'Find the accounts worth the drive.',
    body: 'Filter by district, sector and stage, then open a record to see the signals behind the score, the person to call, and one-click actions to save or route.',
  },
  {
    path: '/app/route',
    kicker: 'Route planner',
    title: 'Turn a shortlist into Tuesday.',
    body: 'Theru clusters stops by district, builds in a 40-minute lunch, and keeps the kilometres low so the conversations stay long. Reorder, set the day, and take it into the field.',
  },
  {
    path: '/app/list',
    kicker: 'Field pipeline',
    title: 'Every conversation, one board.',
    body: 'Saved accounts move from New to Contacted, Meeting and Customer. Drag a card — or use the arrows — and the demo remembers it for the next session.',
  },
]
