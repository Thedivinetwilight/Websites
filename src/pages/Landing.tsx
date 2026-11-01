import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Compass,
  FileText,
  Languages,
  LayoutGrid,
  Map as MapIcon,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react'
import { LandingNav } from '../components/LandingNav'
import { HeroBrief } from '../components/landing/HeroBrief'
import { DayWithTheru } from '../components/landing/DayWithTheru'
import { CostCalculator } from '../components/landing/CostCalculator'
import { FieldNotes } from '../components/landing/FieldNotes'
import { CoverageExplorer } from '../components/landing/CoverageExplorer'
import { Pricing, Faq } from '../components/landing/Pricing'
import { Reveal, CountUp } from '../components/Reveal'
import { Brand } from '../components/Brand'
import { Meter } from '../components/Meter'
import { Sparkline } from '../components/Sparkline'
import { TOTALS, allDistricts, inrLakhs } from '../lib/data'

const SOURCES = [
  'MCA & GST registrations',
  'Udyam filings',
  'Trade & export directories',
  'Hiring boards',
  'Licence & utility records',
  'District industrial profiles',
]

const PROBLEMS = [
  {
    n: '01',
    title: 'The list goes stale in a quarter.',
    body: 'Directors change, units move, numbers go dead. By the time a purchased list reaches a rep, a third of it is archaeology — and the good third has already been called by someone else.',
    detail: 'Average B2B contact data decays 30–40% a year.',
  },
  {
    n: '02',
    title: 'Districts are not a dropdown.',
    body: 'Tiruppur and Tiruchirappalli have different growth curves, different clusters and different buying seasons. A single national filter flattens all of it into one useless average.',
    detail: 'Chengalpattu is growing at 16.2%; Perambalur at 5.2%.',
  },
  {
    n: '03',
    title: 'Timing is the whole game.',
    body: 'A new unit, a fresh credit line, a first export. The best week to call is visible months before a tender — if somebody is watching the right public records every morning.',
    detail: '62% of this week’s top accounts show a growth or credit signal.',
  },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Signal-ranked morning brief',
    body: 'Six accounts, ranked by what changed in the last thirty days. The reason to call is written above the fold, not buried in research.',
    to: '/app',
    link: 'See today’s brief',
    visual: 'brief',
  },
  {
    icon: MapIcon,
    title: 'The 37-district atlas',
    body: 'Momentum, sector mix and open potential for every district. Switch the metric and the state rearranges itself around the truth.',
    to: '/app/map',
    link: 'Open the atlas',
    visual: 'atlas',
  },
  {
    icon: FileText,
    title: 'Account dossiers that read fast',
    body: 'The person to call, the signals behind the score, the account’s size and one place to leave a note the next rep will actually read.',
    to: '/app/prospects',
    link: 'Browse accounts',
    visual: 'dossier',
  },
  {
    icon: RouteIcon,
    title: 'A route, not a spreadsheet',
    body: 'Cluster the shortlist by locality, keep the kilometres honest, and give the day room for one conversation you did not plan.',
    to: '/app/route',
    link: 'Plan a route',
    visual: 'route',
  },
  {
    icon: LayoutGrid,
    title: 'A pipeline built for the field',
    body: 'New, contacted, meeting, customer — move a card when the room changes, not when you get back to the office.',
    to: '/app/list',
    link: 'Open the board',
    visual: 'board',
  },
  {
    icon: Languages,
    title: 'Tamil-ready, offline-tolerant',
    body: 'Field mode reads in Tamil or English, and keeps the day moving on a patchy signal in the Nilgiris. Notes sync when the phone does.',
    to: '/app/prospects',
    link: 'Open an account',
    visual: 'tamil',
  },
]

function FeatureVisual({ kind }: { kind: string }) {
  if (kind === 'brief')
    return (
      <div className="fv fv--brief">
        {[86, 79, 71].map((v, i) => (
          <div className="fv-brief-row" key={v}>
            <span className="fv-rank tnum">0{i + 1}</span>
            <span className="fv-name" />
            <Meter value={v} tone={i === 0 ? 'jade' : i === 1 ? 'turmeric' : 'ink'} height={4} />
            <span className="fv-score tnum">{v}</span>
          </div>
        ))}
      </div>
    )
  if (kind === 'atlas')
    return (
      <div className="fv fv--atlas">
        <div className="fv-atlas-map" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} style={{ height: `${28 + ((i * 37) % 46)}%`, opacity: 0.35 + ((i * 13) % 50) / 100 }} />
          ))}
        </div>
        <div className="fv-atlas-legend">
          <span>Momentum</span>
          <span className="fv-atlas-scale" />
        </div>
      </div>
    )
  if (kind === 'dossier')
    return (
      <div className="fv fv--dossier">
        <span className="fv-chip fv-chip--jade">Growth</span>
        <span className="fv-chip fv-chip--turmeric">Export</span>
        <span className="fv-chip fv-chip--clay">Credit</span>
        <span className="fv-line" />
        <span className="fv-line fv-line--short" />
        <span className="fv-meta tnum">Score 87 · ₹8.4 L</span>
      </div>
    )
  if (kind === 'route')
    return (
      <div className="fv fv--route">
        <span className="fv-stop is-done" />
        <span className="fv-rail" />
        <span className="fv-stop is-done" />
        <span className="fv-rail" />
        <span className="fv-stop" />
        <span className="fv-route-label tnum">44 km · 3 stops</span>
      </div>
    )
  if (kind === 'board')
    return (
      <div className="fv fv--board">
        {['New', 'Contacted', 'Meeting', 'Customer'].map((s, i) => (
          <span key={s} className={`fv-stage fv-stage--${i}`}>
            {s}
            <span className="tnum">{[12, 8, 4, 2][i]}</span>
          </span>
        ))}
      </div>
    )
  return (
    <div className="fv fv--tamil">
      <span className="fv-tamil tamil">தெரு</span>
      <span className="fv-tamil-sub">Field mode · தமிழ்</span>
      <Sparkline data={[4, 9, 7, 12, 10, 15, 18, 16]} width={70} height={22} area />
    </div>
  )
}

export function Landing() {
  const tin = allDistricts.find((d) => d.name === 'Tiruppur')!

  return (
    <div className="landing">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <LandingNav />

      <main id="main">
        {/* ---------------------------------------------------------------- hero */}
        <section className="hero">
          <div className="hero__texture" aria-hidden="true" />
          <div className="wrap hero__grid">
            <div className="hero__copy">
              <p className="eyebrow hero__eyebrow">
                <span className="eyebrow__dot" />
                Field intelligence for Tamil Nadu
              </p>
              <h1 className="display hero__title">
                Know the street
                <br />
                before you <em>knock.</em>
              </h1>
              <p className="lede hero__lede">
                Theru turns public business signals from all thirty-seven districts into one thing your field team can
                use: <strong>a ranked list of who to call today</strong> — and the reason to call.
              </p>
              <div className="hero__ctas">
                <Link to="/app" className="btn hero__cta">
                  Open the live demo <ArrowRight size={16} />
                </Link>
                <a href="#day" className="btn btn--ghost hero__cta">
                  See a morning brief
                </a>
              </div>
              <div className="hero__proof">
                <div>
                  <span className="hero__proof-value tnum">
                    <CountUp value={TOTALS.accounts} />
                  </span>
                  <span className="hero__proof-label">accounts mapped</span>
                </div>
                <span className="hero__proof-div" aria-hidden="true" />
                <div>
                  <span className="hero__proof-value tnum">
                    <CountUp value={TOTALS.signals} />
                  </span>
                  <span className="hero__proof-label">live signals</span>
                </div>
                <span className="hero__proof-div" aria-hidden="true" />
                <div>
                  <span className="hero__proof-value tnum">
                    <CountUp value={TOTALS.districts} />
                  </span>
                  <span className="hero__proof-label">districts</span>
                </div>
              </div>
              <p className="hero__fineprint">
                Full demo workspace. No signup, no card — and a reset button for when you hand the laptop over.
              </p>
            </div>

            <div className="hero__visual">
              <HeroBrief accounts={[]} />
            </div>
          </div>

          <div className="wrap hero__sources">
            <span className="hero__sources-label">Built on public, permissioned signals</span>
            <ul className="hero__sources-list">
              {SOURCES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------- problem */}
        <section className="problem section" id="problem">
          <div className="wrap problem__grid">
            <Reveal className="problem__sticky">
              <p className="eyebrow">
                <span className="eyebrow__dot" /> The problem
              </p>
              <h2 className="display section-title">
                The list knows the company.
                <br />
                It doesn’t know the <em>street.</em>
              </h2>
              <p className="problem__body">
                A Chennai account and a Coimbatore account look identical in a spreadsheet. In the field they behave
                nothing alike — different clusters, different seasons, different reasons to say yes this month.
              </p>
              <p className="problem__body">
                Theru was built district-first because that is how business in Tamil Nadu actually moves: through
                streets, trade bodies, family networks and a thousand small signals that never reach a national
                database in time.
              </p>
              <div className="problem__note">
                <span className="problem__note-mark">தெரு</span>
                <p>
                  <strong>Theru</strong> (தெரு) means <em>street</em>. Not the market, not the segment — the street where
                  the decision actually gets made.
                </p>
              </div>
            </Reveal>

            <div className="problem__list">
              {PROBLEMS.map((p, i) => (
                <Reveal key={p.n} delay={i * 90} className="problem__item">
                  <div className="problem__item-head">
                    <span className="problem__item-n tnum">{p.n}</span>
                    <h3>{p.title}</h3>
                  </div>
                  <p>{p.body}</p>
                  <p className="problem__detail">
                    <span className="problem__detail-dot" />
                    {p.detail}
                  </p>
                </Reveal>
              ))}
              <Reveal delay={260} className="problem__closer">
                <p>That is the gap Theru closes — one district, one street, one ranked list at a time.</p>
                <Link to="/app" className="link-arrow">
                  See it with real district data <ArrowRight size={14} />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- product */}
        <section className="product section" id="product">
          <div className="wrap">
            <div className="section-head section-head--split">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow__dot" /> The product
                </p>
                <h2 className="display section-title">
                  A field kit.
                  <br />
                  Not another <em>dashboard.</em>
                </h2>
              </div>
              <p className="section-intro">
                Six pieces that fit the way a Tamil Nadu field team already works — a brief in the morning, a route by
                lunch, a note before the day ends. Open any of them inside the live demo.
              </p>
            </div>

            <div className="feature-grid">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 60} as="article" className="feature-card">
                  <div className="feature-card__top">
                    <span className="feature-card__icon">
                      <f.icon size={18} strokeWidth={1.8} />
                    </span>
                    <span className="feature-card__index tnum">0{i + 1}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                  <FeatureVisual kind={f.visual} />
                  <Link to={f.to} className="feature-card__link">
                    {f.link} <ArrowUpRight size={14} />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <DayWithTheru />
        <FieldNotes />
        <CostCalculator />
        <CoverageExplorer />
        <Pricing />
        <Faq />

        {/* ---------------------------------------------------------------- CTA */}
        <section className="cta">
          <div className="wrap cta__panel">
            <div className="cta__grain" aria-hidden="true" />
            <Reveal>
              <p className="cta__tamil tamil">தெரு அறியும் வணிகம்.</p>
              <h2 className="display cta__title">
                Walk into the room
                <br />
                already knowing <em>why you’re there.</em>
              </h2>
              <p className="cta__body">
                The full workspace is open — {TOTALS.accounts} accounts, {TOTALS.districts} districts, a live route and
                a pipeline you can move. Give it ten minutes before your next client call.
              </p>
              <div className="cta__actions">
                <Link to="/app" className="btn btn--light">
                  Open the live demo <ArrowRight size={16} />
                </Link>
                <Link to="/app?tour=1" className="btn btn--outline-light">
                  <Compass size={15} /> Start the guided tour
                </Link>
              </div>
              <p className="cta__fine">
                {inrLakhs(TOTALS.potentialL)} of open potential in the demo workspace · reset any time
              </p>
            </Reveal>
            <div className="cta__stamp" aria-hidden="true">
              <span className="cta__stamp-inner">
                <span className="cta__stamp-tamil tamil">தெரு</span>
                <span>37 districts · 2026</span>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* -------------------------------------------------------------- footer */}
      <footer className="footer">
        <div className="wrap footer__grid">
          <div className="footer__brand">
            <Brand tone="light" />
            <p>
              Field intelligence for the businesses that actually run Tamil Nadu — the knitwear units, the pump
              makers, the labs, the mills and the distributors.
            </p>
            <p className="footer__place">
              Chennai · Coimbatore · Madurai <span className="footer__dot" /> Demo build, 2026
            </p>
          </div>
          <div className="footer__col">
            <p className="footer__col-title">Product</p>
            <a href="#product">Overview</a>
            <a href="#day">A day with Theru</a>
            <a href="#coverage">District coverage</a>
            <a href="#pricing">Pricing</a>
            <Link to="/app/map">Open the atlas</Link>
          </div>
          <div className="footer__col">
            <p className="footer__col-title">In the demo</p>
            <Link to="/app">Morning brief</Link>
            <Link to="/app/prospects">Prospects</Link>
            <Link to="/app/route">Route planner</Link>
            <Link to="/app/list">My list</Link>
            <Link to="/app?tour=1">Guided tour</Link>
          </div>
          <div className="footer__col">
            <p className="footer__col-title">Company</p>
            <a href="#faq">FAQ</a>
            <Link to="/app">Talk to the team</Link>
            <a href="mailto:hello@theru.example">hello@theru.example</a>
            <span className="footer__muted">Chennai, Tamil Nadu</span>
          </div>
        </div>
        <div className="wrap footer__bottom">
          <p>
            © 2026 Theru Labs <span className="footer__muted">— a concept demo. All businesses, people and signals are
            synthetic.</span>
          </p>
          <p className="footer__attribution">
            District geometry adapted from{' '}
            <a href="https://github.com/datameet/maps" target="_blank" rel="noreferrer">
              DataMeet
            </a>{' '}
            (MIT) and{' '}
            <a href="https://github.com/udit-001/india-maps-data" target="_blank" rel="noreferrer">
              india-maps-data
            </a>
            .
          </p>
          <p className="footer__muted footer__privacy">Privacy · Terms · Data sourcing</p>
        </div>
      </footer>
    </div>
  )
}
