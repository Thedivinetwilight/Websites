import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    blurb: 'For a founder or a two-person sales team proving one district.',
    monthly: 1900,
    annual: 1520,
    unit: 'seat / month',
    cta: 'Start a pilot',
    features: [
      'Morning brief, one district focus',
      '400 account credits a month',
      'District atlas, read-only',
      'One saved list and one route',
      'Email brief at 06:30 IST',
    ],
  },
  {
    id: 'team',
    name: 'Field team',
    blurb: 'For teams that sell on the road, across the whole state.',
    monthly: 3400,
    annual: 2720,
    unit: 'seat / month · min 5',
    cta: 'Start a pilot',
    popular: true,
    features: [
      'Everything in Starter, all 37 districts',
      'Unlimited saved accounts and routes',
      'Route planner with field mode',
      'Shared pipeline board and notes',
      'WhatsApp-ready briefs for reps',
      'Signal alerts on followed accounts',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    blurb: 'For regional distributors and lenders with a data team.',
    custom: true,
    cta: 'Talk to the team',
    features: [
      'Everything in Field team',
      'Two-way CRM sync and API',
      'Custom scoring and sector weights',
      'Dedicated district analyst',
      'Tamil-first interface for the field',
      'Onboarding, training and QBRs',
    ],
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <section className="pricing section" id="pricing">
      <div className="wrap">
        <div className="section-head section-head--center">
          <p className="eyebrow">
            <span className="eyebrow__dot" /> Pricing
          </p>
          <h2 className="display section-title">
            Priced for teams that <em>sell on the road.</em>
          </h2>
          <p className="section-intro section-intro--center">
            Every plan starts with the full demo workspace. No card, no signup, no sales call before you have seen
            whether it fits.
          </p>
          <div className="billing-toggle" role="group" aria-label="Billing period">
            <button className={!annual ? 'is-active' : ''} onClick={() => setAnnual(false)} aria-pressed={!annual}>
              Monthly
            </button>
            <button className={annual ? 'is-active' : ''} onClick={() => setAnnual(true)} aria-pressed={annual}>
              Annual <span className="billing-toggle__save">−20%</span>
            </button>
          </div>
        </div>

        <div className="pricing__grid">
          {PLANS.map((p) => (
            <div key={p.id} className={`price-card ${p.popular ? 'price-card--popular' : ''}`}>
              {p.popular && <span className="price-card__badge">Most chosen by field teams</span>}
              <div className="price-card__head">
                <h3>{p.name}</h3>
                <p>{p.blurb}</p>
              </div>
              <div className="price-card__price">
                {p.custom ? (
                  <>
                    <span className="price-card__amount">Custom</span>
                    <span className="price-card__unit">annual contract · by team size</span>
                  </>
                ) : (
                  <>
                    <span className="price-card__currency">₹</span>
                    <span className="price-card__amount tnum">
                      {(annual ? p.annual! : p.monthly!).toLocaleString('en-IN')}
                    </span>
                    <span className="price-card__unit">
                      {p.unit}
                      {annual ? ' · billed yearly' : ''}
                    </span>
                  </>
                )}
              </div>
              <Link to="/app" className={`btn ${p.popular ? '' : 'btn--ghost'} btn--block`}>
                {p.cta} <ArrowRight size={14} />
              </Link>
              <ul className="price-card__features">
                {p.features.map((f) => (
                  <li key={f}>
                    <Check size={14} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="pricing__note">
          Prices in INR, excluding GST. Annual plans are billed upfront. Demo pricing — nothing is charged.
        </p>
      </div>
    </section>
  )
}

export function Faq() {
  const ITEMS = [
    {
      q: 'Where does the data come from?',
      a: 'This is a product demo: every account, contact and signal is synthetic and nothing is scraped, purchased or imported from registries. The district patterns and boundaries are modelled on Tamil Nadu, but the records are fictional. A real deployment would connect only licensed or permissioned sources — that ingestion layer is not part of this demo.',
    },
    {
      q: 'How fresh is the morning brief?',
      a: 'The brief is generated from a fixed demo snapshot when the app loads. Nothing is collected overnight and no live feed is connected. In production the brief would rebuild before the first call from whatever sources a customer has licensed.',
    },
    {
      q: 'Is Theru a CRM?',
      a: 'No. Theru is the layer above it. Work a route and log a note inside Theru, or push accounts and activity into HubSpot, Zoho or Salesforce. The point is to decide who to call, not to file paperwork afterwards.',
    },
    {
      q: 'Do smaller districts get the same depth?',
      a: 'All 37 districts are modelled. Depth is weighted by business density, so Chennai carries more accounts than Perambalur — but every district has a momentum score, a sector mix and a full account list. Plans differ by how many district desks you can open, not by hiding the map.',
    },
    {
      q: 'Can the field team use it in Tamil?',
      a: 'Yes. Field mode supports Tamil labels, and briefs can be sent to WhatsApp in Tamil or English. Account names and addresses stay in their registered form so nothing gets lost in translation.',
    },
    {
      q: 'What happens to our route history?',
      a: 'In this demo, routes, notes and stages live in a local SQLite database on the machine running the server — they survive refreshes and restarts, and the reset button restores the seeded workspace. In production they would live in your workspace and sync to your CRM on Enterprise plans.',
    },
  ]

  return (
    <section className="faq section" id="faq">
      <div className="wrap faq__grid">
        <div className="faq__aside">
          <p className="eyebrow">
            <span className="eyebrow__dot" /> Questions
          </p>
          <h2 className="display section-title">
            The things a
            <br />
            <em>field team</em> asks.
          </h2>
          <p className="faq__note">
            Still deciding? The demo workspace answers most of these faster than a call. It is the full product, with
            synthetic but realistic data and nothing hidden behind a login.
          </p>
          <Link to="/app" className="btn btn--ghost btn--sm">
            Open the demo <ArrowRight size={14} />
          </Link>
        </div>
        <div className="faq__list">
          {ITEMS.map((item) => (
            <details key={item.q} className="faq__item">
              <summary>
                <span>{item.q}</span>
                <span className="faq__icon" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
