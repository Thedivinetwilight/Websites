# Theru · தெரு

A client-ready **full-stack demo** of Theru, a field-intelligence workspace for Tamil Nadu B2B sales
teams. React frontend, Node.js + SQLite API, seeded with a synthetic dataset — a working product
demonstration, not a directory of businesses.

> **Know the street before you knock.**

Internally this repo is the "Websites" project; the demo product is called Theru.

---

## What this is (and what it is not)

| It is | It is not |
| --- | --- |
| A working demo app: landing page + 6-screen workspace, real interactions | A production service |
| Backed by a real SQLite database that persists writes across restarts | Connected to any live data source |
| 421 fictional accounts across 37 Tamil Nadu districts | A list of real businesses |
| Single-user, no authentication, localhost by default | Safe to expose on the public internet |

> ⚠️ **No production authentication.** There is one implicit demo workspace. Every API route is
> open to anyone who can reach the port. Bind to localhost (the default) and treat it as a laptop
> demo. Do not deploy this to a public host as-is.

> ⚠️ **Synthetic data only.** Every account, contact, signal, note and price is fictional. Contact
> numbers use the reserved `+91 00000 xxxxx` range and emails end in the reserved `.invalid` domain,
> so nothing in the demo can be dialled or delivered. Nothing is scraped, purchased or imported from
> MCA/GST/Udyam registries, trade directories or any other public record. The README previously
> described the demo as sourced from public registries and refreshed daily — that was marketing copy,
> not fact, and it has been removed from the UI along with the "live" labels.

---

## Quick start (Windows, macOS, Linux)

Requires **Node.js 22.13 or newer** (uses the built-in `node:sqlite` driver, so there is no native
build step, no Visual Studio toolchain and no Python).

```bash
npm install
npm run dev
```

That one command starts both halves:

| Process | URL | What it is |
| --- | --- | --- |
| API | http://127.0.0.1:3001 | Express + SQLite demo API (API only in dev) |
| Web | http://127.0.0.1:5173 | Vite dev server, proxies `/api` to the API |

In dev the API passes `--no-static`, so port 3001 answers `/api` and returns a JSON hint for
anything else — open **5173** for the UI, never a stale build in `dist/`.

Open http://127.0.0.1:5173.

Production build and serve (two commands):

```bash
npm run build     # type-checks client + server, bundles dist/, compiles dist-server/
npm start         # serves the built app + the API together on http://127.0.0.1:3001
```

`npm run preview` does `build` then `start` in one go.

### Other scripts

| Script | Purpose |
| --- | --- |
| `npm run test` | Vitest: API, validation, persistence and frontend flows (44 tests) |
| `npm run typecheck` | `tsc` for the client and the server, no emit |
| `npm run dev:api` / `npm run dev:web` | Run just one half of the dev stack |
| `npm run build` | `typecheck` → `vite build` → `tsc -p tsconfig.server.json` |

### Configuration

All optional; the defaults are what you want for a local demo.

| Env var | Default | Notes |
| --- | --- | --- |
| `PORT` | `3001` | API / production server port |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` only to share on a LAN (no auth!) |
| `API_PORT` | `3001` | Port Vite proxies `/api` to in dev |
| `THERU_DB_PATH` | `<repo>/.data/theru.sqlite` | SQLite file location |
| `THERU_SERVE_STATIC` | `1` | `0` serves the API only |

`.data/`, `dist/` and `dist-server/` are git-ignored.

---

## Data and persistence

### Where the numbers come from

`src/data/prospects.json` and `src/data/districts.json` are the **seed** files that ship with the
repo. They hold the synthetic dataset:

| Entity | Count |
| --- | --- |
| Accounts | **421** |
| Districts | **37** (real Tamil Nadu district set) |
| Sectors | **12** |
| Signals | **1,246** |

The district **geometry** (`src/data/geo.json`, adapted from [DataMeet Maps](https://github.com/datameet/maps),
MIT, and [`udit-001/india-maps-data`](https://github.com/udit-001/india-maps-data)) stays a static
frontend asset on purpose: it never changes during a demo and would otherwise cost ~48 KB of
polygons on every request.

### How seeding works

On first boot the API creates `.data/theru.sqlite`, applies `server/schema.sql` (all `CREATE TABLE
IF NOT EXISTS`) and seeds it inside a single transaction, recording a `dataset_version` (a hash of
the seed JSON + defaults) in the `meta` table. On later boots, if the version matches, seeding is
skipped entirely — so restarts never duplicate rows or wipe your edits. Bump the seed JSON and the
next boot re-seeds from scratch. `npm run test` covers both paths.

Contacts are sanitised at seed time (`server/dataset.ts`): phones become `+91 00000 00001…0421`,
emails become `…@demo.theru.invalid`, and `website` is nulled.

### What persists

Edits go to SQLite, not `localStorage`, so they survive refreshes **and** server restarts:

| Edit | Table |
| --- | --- |
| Saved accounts (+ order) | `saved_accounts` |
| Pipeline stage per account | `pipeline` |
| Notes | `notes` |
| Route stops (+ order) and the route date | `route_stops`, `workspace.route_date` |
| Followed districts | `workspace.following_json` |

**Reset demo state** in the sidebar (or `POST /api/workspace/reset`) re-seeds just the workspace
tables — saved list, stages, notes, route, followed districts — back to the documented demo state,
and leaves the account catalogue untouched. Delete `.data/` for a completely fresh database.

---

## Database schema

Full DDL with comments: [`server/schema.sql`](server/schema.sql). Summary:

| Table | Key | Purpose |
| --- | --- | --- |
| `meta` | `key` | schema version, dataset version, seed timestamp, provenance |
| `districts` | `name` | 37 districts: region, growth, momentum, pulse history, top sectors, character |
| `accounts` | `id` (`TH-1000`…`TH-1448`) | 421 accounts: sector, district, locality, employees, revenue, founded, four score components, stored weighted `score`, contact (sanitised), owner, seed status, potential, tier, seed note, spotlight, brief rank |
| `signals` | `id` | 1,246 signals: account, ordinal, type, label, date, days ago, weight |
| `workspace` | `id = 1` (`CHECK`) | the single demo workspace: route date, followed districts (JSON) |
| `saved_accounts` | `account_id` | saved list + position |
| `pipeline` | `account_id` | stage, constrained to `new / contacted / meeting / customer` |
| `notes` | `account_id` | free-text note (1–2,000 chars, validated) |
| `route_stops` | `account_id` | ordered route |

`PRAGMA foreign_keys = ON` is set on every connection, so deleting an account cascades, and
`pipeline.stage` / `districts.region` are guarded by `CHECK` constraints. All queries are prepared
statements with bound parameters; the only interpolated SQL is chosen from hard-coded allowlists
(sort keys, `IN (?, ?, …)` placeholders). `LIKE` input is escaped, so `%` and `_` are literal.

---

## API overview

Base path `/api`. Successful reads/writes return `{ "data": … }`; list endpoints add `page` /
`summary`. Errors return `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | liveness, schema + dataset versions, row counts |
| `GET` | `/bootstrap` | accounts, districts, brief, totals and workspace in one request |
| `GET` | `/accounts` | search + filter + paginate: `q, district, sector, region, stage, saved, sort, limit, offset` |
| `GET` | `/accounts/:id` | one account with signals and its workspace state |
| `GET` | `/districts` | 37 districts with rollups (accounts, potential, signals, saved, on-route) |
| `GET` | `/districts/:name` | district desk by name or slug: district + accounts + 5 nearby |
| `GET` | `/sectors` | 12 sectors with counts, potential and averages |
| `GET` | `/workspace` | the whole workspace snapshot |
| `POST` | `/workspace/saved` | save an account `{ accountId }` (idempotent) |
| `DELETE` | `/workspace/saved/:id` | unsave (also removes it from the route) |
| `PATCH` | `/workspace/pipeline/:id` | `{ stage }` |
| `PUT` | `/workspace/notes/:id` | `{ note }` — empty string clears |
| `POST` | `/workspace/route/stops` | `{ accountId }` — also saves the account |
| `DELETE` | `/workspace/route/stops/:id` | remove a stop |
| `PATCH` | `/workspace/route/order` | `{ stops: [...] }` — the full ordered list |
| `PATCH` | `/workspace/route/date` | `{ date: "YYYY-MM-DD" }` |
| `PUT` | `/workspace/following` | `{ districts: [...] }` |
| `POST` | `/workspace/reset` | re-seed the workspace, returns the new snapshot |

Validation is enforced with Zod at the edge (`server/validation.ts`): unknown body keys are rejected,
account ids must match `TH-\d{4}`, dates must be real calendar dates (`2026-02-30` is refused),
stages/regions/sorts come from allowlists, notes are length- and whitespace-checked, route orders
must be complete and duplicate-free, and unknown districts get a `400`, not an empty list. Each
failure names the offending field:

```jsonc
// GET /api/accounts?limit=9999
{
  "error": {
    "code": "validation_error",
    "message": "Some parameters or fields are invalid.",
    "details": [{ "path": "limit", "message": "Must be at most 500." }]
  }
}
```

Handy smoke tests:

```bash
curl http://127.0.0.1:3001/api/health
curl "http://127.0.0.1:3001/api/accounts?district=Chennai&sort=potential&limit=5"
curl -X PATCH http://127.0.0.1:3001/api/workspace/pipeline/TH-1003 \
     -H 'Content-Type: application/json' -d '{"stage":"meeting"}'
```

---

## Frontend integration

The UI keeps its existing design and flows; what changed is where the data comes from.

- **Bootstrap** — `WorkspaceProvider` (`src/lib/store.tsx`) fetches `/api/bootstrap` once and derives
  the district rollups, sector summaries and totals it previously computed from bundled JSON. A
  branded loading screen covers the request, and a matching offline screen explains how to start the
  API if it cannot be reached.
- **Optimistic writes** — saving, staging, noting, routing, reordering, following and resetting all
  update the screen immediately, persist via the API, then adopt the server's snapshot. A failed
  write shows an error toast and re-syncs from the server, so the UI never keeps a change the
  database rejected.
- **Account search** — `/app/prospects` sends every filter, sort and page to `/api/accounts`
  (debounced), with skeleton rows while loading, a distinct empty state, and an error state with a
  retry button.
- **Account drawer** — reads `/api/accounts/:id`; if that request fails it falls back to the last
  loaded copy and says so.
- **Static by design** — district geometry (map polygons) ships with the frontend.

Genuinely still client-side: the landing page's cost calculator (pure arithmetic, no persistence),
the CSV export (renders the current API result client-side), and the "demo today" date used for the
cosmetic header.

---

## A five-minute demo script

| Step | What to do | What it shows |
| --- | --- | --- |
| 1 | Landing hero → **Open the demo** | The promise: a brief, not a database |
| 2 | `/app` morning brief → open *Anandhaa Knitwear* | Signals explain the score, with a (fictional) contact |
| 3 | `/app/map` → Chennai → **Open district desk** | 37 districts, each with its own clusters |
| 4 | `/app/prospects` → search "pumps" → save an account | Server-side search, filter and save |
| 5 | `/app/route` → move a stop with ↓ | Distances, arrival times and lunch break recalculate and persist |
| 6 | `/app/list` → move a card to *Meeting* | The board is the pipeline; it survives a refresh |
| 7 | **Refresh the browser** (or restart the API) | Everything is still there — it lives in SQLite |
| 8 | Sidebar → **Reset demo state** | Clean slate for the next audience |

---

## Tests

```bash
npm run test
```

44 tests across 5 files:

| File | Covers |
| --- | --- |
| `tests/api/health.test.ts` | health envelope, documented counts, JSON 404s, bootstrap payload |
| `tests/api/accounts.test.ts` | pagination/summary, sorting, every filter, search incl. `%`/`_` escaping, validation errors with field paths, detail 404/400, contact sanitisation, districts and sectors |
| `tests/api/workspace.test.ts` | save/unsave idempotency, cascade to route, stage and note writes, route add/reorder/remove and its rejections, route dates, followed districts, reset |
| `tests/api/persistence.test.ts` | seed-once semantics, re-seed on version change, **edits surviving a server restart**, foreign-key/CHECK enforcement, no raw contact data in the DB |
| `tests/frontend/app.test.tsx` | real browser flow in jsdom against a spawned API process: loading → landing, save → reload → still saved, API-backed search, pipeline move, drawer note |

Frontend tests spawn the real `server/index.ts` on an ephemeral port against a temp database, so
they exercise the actual HTTP surface rather than a mock.

---

## Project layout

```
server/            Express API
  schema.sql       documented SQLite schema
  dataset.ts       seed loading + contact sanitisation
  db.ts            connection, migrations, seed-once, workspace helpers
  queries.ts       prepared read model (accounts, districts, sectors, totals)
  validation.ts    Zod schemas
  app.ts           routes + error handling
  index.ts         entry point (API + optional static hosting)
src/               React app (unchanged design)
  lib/api.ts       typed API client
  lib/store.tsx    workspace state + optimistic writes
  lib/dataset.ts   derived rollups from the bootstrap payload
  pages/, components/, styles/
tests/             Vitest suites (API + frontend)
scripts/           data generator + icon font builder
```

## Stack

React 18 · TypeScript · Vite · React Router · Express 5 · Zod · SQLite via `node:sqlite` ·
Vitest + Testing Library + Supertest. Hand-rolled CSS (design tokens + a generated icon symbol
font), no UI kit: Fraunces for display, Instrument Sans for UI, Noto Sans Tamil for தெரு.

## Known limitations

- Single-user, unauthenticated, no rate limiting or CSRF protection — a laptop demo, not a deployment.
- No live ingestion: the "morning brief" is the seeded snapshot, and the UI says so.
- District geometry is simplified for the web and is not survey-grade.
- CSV export is generated in the browser from the current API page selection (up to 500 rows).
