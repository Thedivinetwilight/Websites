# Theru · தெரு

A client-ready demo of **Theru**, a field-intelligence workspace for Tamil Nadu B2B sales teams.
Built as a product demonstration — a real, working interface with a realistic synthetic dataset —
rather than a directory of businesses.

> **Know the street before you knock.**

## The idea

Field sellers in Tamil Nadu work a market of 37 districts that look identical in a spreadsheet and
behave nothing alike on the ground: Coimbatore buys on engineering credibility, Tiruppur on export
cycles, Chennai on procurement process. Theru turns that local knowledge into a daily rhythm:

1. **Morning brief** — six accounts ranked by today's signals, each with the reason to call.
2. **District atlas** — all 37 districts, switchable lens (momentum, accounts, potential, fit).
3. **Prospects** — 421 accounts with sector, stage, score, signals, contact and notes.
4. **Route planner** — stops clustered by district, timed door-to-door, with a built-in lunch break.
5. **My list** — a pipeline board from New to Customer, remembered in the browser.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173  (binds 0.0.0.0 for previews)
npm run build    # type-check + production bundle into dist/
npm run preview  # serve the production build
```

No environment variables, no backend, no login. State lives in `localStorage`; **Reset demo state**
in the sidebar restores the starting demo.

## A five-minute demo script

| Step | What to do | What it proves |
| --- | --- | --- |
| 1 | Landing hero → **Open the demo** | The promise: a brief, not a database. |
| 2 | `/app` morning brief → open *Anandhaa Knitwear* | Signals explain the score, with the person to call. |
| 3 | `/app/map` → Chennai → **Open district desk** | 37 districts, each with its own clusters and rhythm. |
| 4 | `/app/prospects` → filter district + stage → save two accounts | Filtering and pipelining are instant. |
| 5 | `/app/route` → reorder stops | Kilometres, arrival times and the lunch break recalculate. |
| 6 | `/app/list` → drag a card to *Meeting* | The board is the pipeline; it survives a refresh. |
| 7 | Sidebar → **Guided tour** | A five-stop narrative for a live audience. |

## Data

- **Accounts, signals, districts, sectors** — synthetic but modelled on Tamil Nadu's real industrial
  geography (SIDCO clusters, Coimbatore pumps, Tiruppur knitwear, Chennai SaaS and logistics).
  Nothing in the demo is a claim about a real business.
- **District boundaries** — adapted from [DataMeet Maps](https://github.com/datameet/maps) (MIT) and
  [`udit-001/india-maps-data`](https://github.com/udit-001/india-maps-data), simplified for the web.
- **Pricing** — ₹1,520 / ₹2,720 (annual, per seat, billed yearly) / custom. Demo only.

## Stack

React 18 · TypeScript · Vite · React Router · hand-rolled CSS (design tokens + a generated icon
symbol font) · no UI kit. Fraunces for display, Instrument Sans for the interface, Noto Sans Tamil
for தெரு.

```
src/
  pages/            Landing, Overview, Atlas, Prospects, DistrictPage, RoutePage, MyList
  components/       TnMap, ScoreRing, ProspectDrawer, Tour, landing/*
  lib/              data, store (localStorage), route maths, map colour scales
  styles/           tokens, base, landing, app, generated symbols
  data/             prospects.json, districts.json, geo.json
```
