import { Quote } from 'lucide-react'
import { Reveal } from '../Reveal'

const NOTES = [
  {
    quote:
      'We used to start Monday by arguing about whose list was better. Now we start with the same six names and a reason for each.',
    name: 'Priya Raman',
    role: 'Head of Growth',
    org: 'Southern Market workspace',
    place: 'Chennai',
    metric: '42 → 18 calls a week',
    metricLabel: 'to the same number of meetings',
  },
  {
    quote:
      'The district view is the part nobody else has. Tiruppur and Coimbatore are forty minutes apart and they buy in completely different seasons.',
    name: 'Karthik Selvam',
    role: 'Regional Sales Manager',
    org: 'Textile & engineering vertical',
    place: 'Coimbatore',
    metric: '3 districts',
    metricLabel: 'planned in one afternoon instead of one week',
  },
  {
    quote:
      'Field mode is the only CRM screen my reps have ever opened without being asked. One account, one reason, one note.',
    name: 'Divya Mani',
    role: 'Field Operations',
    org: 'Southern districts',
    place: 'Madurai',
    metric: '9 of 11 reps',
    metricLabel: 'log a note the same day',
  },
]

export function FieldNotes() {
  return (
    <section className="notes section" aria-labelledby="notes-title">
      <div className="wrap">
        <div className="notes__head">
          <p className="eyebrow">
            <span className="eyebrow__dot" /> Field notes
          </p>
          <h2 className="display section-title" id="notes-title">
            What changes when the list <em>knows the street.</em>
          </h2>
          <p className="notes__disclaimer">
            Illustrative quotes written for this concept demo. The accounts behind them are synthetic.
          </p>
        </div>

        <div className="notes__grid">
          {NOTES.map((n, i) => (
            <Reveal key={n.name} delay={i * 80} className="note-card">
              <Quote size={20} className="note-card__quote-mark" aria-hidden="true" />
              <blockquote>{n.quote}</blockquote>
              <div className="note-card__metric">
                <span className="note-card__metric-value tnum">{n.metric}</span>
                <span className="note-card__metric-label">{n.metricLabel}</span>
              </div>
              <figcaption className="note-card__byline">
                <span className="note-card__monogram" aria-hidden="true">
                  {n.name.split(' ').map((w) => w[0]).join('')}
                </span>
                <span>
                  <span className="note-card__name">{n.name}</span>
                  <span className="note-card__role">
                    {n.role} · {n.place}
                  </span>
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
