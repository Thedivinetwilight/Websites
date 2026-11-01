import express, { type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import type { z, ZodType } from 'zod'
import {
  accountExists,
  districtExists,
  getMeta,
  getWorkspace,
  openDatabase,
  resetWorkspace,
  SCHEMA_VERSION,
  touchWorkspace,
  type WorkspaceSnapshot,
} from './db.js'
import type { SeedDataset } from './dataset.js'
import { ApiError, badRequest, errorHandler, notFound, ok } from './http.js'
import {
  briefAccounts,
  getAccount,
  listAccounts,
  listDistrictMeta,
  listDistricts,
  listSectors,
  totals,
} from './queries.js'
import {
  accountIdBodySchema,
  accountListQuerySchema,
  districtParamSchema,
  followingBodySchema,
  noteBodySchema,
  routeDateBodySchema,
  routeOrderBodySchema,
  stageBodySchema,
  type AccountListQuery,
} from './validation.js'

export interface CreateAppOptions {
  dbPath?: string
  dataset?: SeedDataset
  forceSeed?: boolean
  /** Serve the built frontend from dist/ (production). */
  serveStatic?: boolean
  rootDir?: string
}

export interface TheruApp {
  app: express.Express
  db: DatabaseSync
  dbPath: string
  dataset: SeedDataset
  seeded: boolean
  close: () => void
}

function tx<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function parse<S extends ZodType>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw parsed.error
  return parsed.data as z.infer<S>
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const ACCOUNT_ID = /^TH-\d{4}$/

export function createApp(options: CreateAppOptions = {}): TheruApp {
  const { db, dataset, dbPath, seeded } = openDatabase({
    dbPath: options.dbPath,
    dataset: options.dataset,
    forceSeed: options.forceSeed,
  })

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))

  const workspace = () => getWorkspace(db)
  const respondWorkspace = (res: Response, snapshot?: WorkspaceSnapshot) => ok(res, { workspace: snapshot ?? workspace() })

  const requireAccount = (id: string) => {
    if (!ACCOUNT_ID.test(id)) throw badRequest('invalid_account_id', 'Account ids look like TH-1000.')
    if (!accountExists(db, id)) throw notFound(`No account with id ${id}.`)
    return id
  }

  // ---------------------------------------------------------------- health --
  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1 AS ok').get()
    res.json({
      status: 'ok',
      database: 'ok',
      schemaVersion: SCHEMA_VERSION,
      datasetVersion: getMeta(db, 'dataset_version'),
      seededAt: getMeta(db, 'seeded_at'),
      persistence: 'sqlite',
      demo: true,
      auth: 'none',
      uptimeSeconds: Math.round(process.uptime()),
      dataset: totals(db),
    })
  })

  // -------------------------------------------------------------- bootstrap --
  app.get('/api/bootstrap', (_req, res) => {
    const all = listAccounts(db, { sort: 'name', limit: 500, offset: 0 })
    ok(res, {
      meta: {
        datasetVersion: getMeta(db, 'dataset_version'),
        schemaVersion: SCHEMA_VERSION,
        seededAt: getMeta(db, 'seeded_at'),
        source: getMeta(db, 'seed_source'),
        demo: true,
      },
      totals: totals(db),
      districts: listDistrictMeta(db),
      accounts: all.data,
      brief: briefAccounts(db),
      workspace: workspace(),
    })
  })

  // --------------------------------------------------------------- accounts --
  app.get('/api/accounts', (req, res) => {
    const query: AccountListQuery = parse(accountListQuerySchema, req.query)
    if (query.district && !districtExists(db, query.district)) {
      throw badRequest('unknown_district', `No district named “${query.district}”.`)
    }
    const result = listAccounts(db, query)
    res.json({ data: result.data, page: result.page, summary: result.summary, demo: true })
  })

  app.get('/api/accounts/:id', (req, res) => {
    const id = requireAccount(String(req.params.id ?? '').trim())
    const account = getAccount(db, id)
    if (!account) throw notFound(`No account with id ${id}.`)
    ok(res, account)
  })

  // -------------------------------------------------------------- districts --
  app.get('/api/districts', (_req, res) => {
    ok(res, listDistricts(db))
  })

  app.get('/api/districts/:name', (req, res) => {
    const { name } = parse(districtParamSchema, req.params)
    const district = listDistricts(db).find((d) => slugify(d.name) === slugify(name))
    if (!district) throw notFound(`No district matching “${name}”.`)
    const accounts = listAccounts(db, { district: district.name, sort: 'score', limit: 100, offset: 0 })
    const nearby = listDistricts(db)
      .filter((d) => d.region === district.region && d.name !== district.name)
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 5)
    ok(res, { district, accounts: accounts.data, nearby })
  })

  app.get('/api/sectors', (_req, res) => {
    ok(res, listSectors(db))
  })

  // -------------------------------------------------------------- workspace --
  app.get('/api/workspace', (_req, res) => {
    ok(res, workspace())
  })

  app.post('/api/workspace/saved', (req, res) => {
    const { accountId } = parse(accountIdBodySchema, req.body)
    requireAccount(accountId)
    tx(db, () => {
      const existing = db.prepare('SELECT 1 AS ok FROM saved_accounts WHERE account_id = ?').get(accountId)
      if (!existing) {
        const max = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM saved_accounts').get() as { m: number }
        db.prepare('INSERT INTO saved_accounts (account_id, position, created_at) VALUES (?, ?, ?)').run(
          accountId,
          max.m + 1,
          new Date().toISOString(),
        )
      }
      touchWorkspace(db)
    })
    respondWorkspace(res)
  })

  app.delete('/api/workspace/saved/:id', (req, res) => {
    const id = requireAccount(String(req.params.id))
    tx(db, () => {
      db.prepare('DELETE FROM saved_accounts WHERE account_id = ?').run(id)
      db.prepare('DELETE FROM route_stops WHERE account_id = ?').run(id)
      touchWorkspace(db)
    })
    respondWorkspace(res)
  })

  app.patch('/api/workspace/pipeline/:id', (req, res) => {
    const id = requireAccount(String(req.params.id))
    const { stage } = parse(stageBodySchema, req.body)
    tx(db, () => {
      db.prepare(
        `INSERT INTO pipeline (account_id, stage, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET stage = excluded.stage, updated_at = excluded.updated_at`,
      ).run(id, stage, new Date().toISOString())
      touchWorkspace(db)
    })
    ok(res, { workspace: workspace(), accountId: id, stage })
  })

  app.put('/api/workspace/notes/:id', (req, res) => {
    const id = requireAccount(String(req.params.id))
    const { note } = parse(noteBodySchema, req.body)
    tx(db, () => {
      if (note === '') {
        db.prepare('DELETE FROM notes WHERE account_id = ?').run(id)
      } else {
        db.prepare(
          `INSERT INTO notes (account_id, body, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(account_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
        ).run(id, note, new Date().toISOString())
      }
      touchWorkspace(db)
    })
    respondWorkspace(res)
  })

  // ------------------------------------------------------------------ route --
  app.post('/api/workspace/route/stops', (req, res) => {
    const { accountId } = parse(accountIdBodySchema, req.body)
    requireAccount(accountId)
    tx(db, () => {
      const saved = db.prepare('SELECT 1 AS ok FROM saved_accounts WHERE account_id = ?').get(accountId)
      if (!saved) {
        const max = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM saved_accounts').get() as { m: number }
        db.prepare('INSERT INTO saved_accounts (account_id, position, created_at) VALUES (?, ?, ?)').run(
          accountId,
          max.m + 1,
          new Date().toISOString(),
        )
      }
      const stop = db.prepare('SELECT 1 AS ok FROM route_stops WHERE account_id = ?').get(accountId)
      if (!stop) {
        const max = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM route_stops').get() as { m: number }
        db.prepare('INSERT INTO route_stops (account_id, position) VALUES (?, ?)').run(accountId, max.m + 1)
      }
      touchWorkspace(db)
    })
    respondWorkspace(res)
  })

  app.delete('/api/workspace/route/stops/:id', (req, res) => {
    const id = requireAccount(String(req.params.id))
    tx(db, () => {
      db.prepare('DELETE FROM route_stops WHERE account_id = ?').run(id)
      touchWorkspace(db)
    })
    respondWorkspace(res)
  })

  app.patch('/api/workspace/route/order', (req, res) => {
    const { stops } = parse(routeOrderBodySchema, req.body)
    const current = (db.prepare('SELECT account_id FROM route_stops').all() as { account_id: string }[]).map(
      (row) => row.account_id,
    )
    for (const id of stops) {
      requireAccount(id)
      if (!current.includes(id)) throw badRequest('not_on_route', `${id} is not on the saved route.`)
    }
    if (stops.length !== current.length) {
      throw badRequest('route_mismatch', 'Send the full ordered list of stops on the route.')
    }
    tx(db, () => {
      const update = db.prepare('UPDATE route_stops SET position = ? WHERE account_id = ?')
      stops.forEach((id, index) => update.run(index, id))
      touchWorkspace(db)
    })
    respondWorkspace(res)
  })

  app.patch('/api/workspace/route/date', (req, res) => {
    const { date } = parse(routeDateBodySchema, req.body)
    db.prepare('UPDATE workspace SET route_date = ?, updated_at = ? WHERE id = 1').run(date, new Date().toISOString())
    respondWorkspace(res)
  })

  app.put('/api/workspace/following', (req, res) => {
    const { districts } = parse(followingBodySchema, req.body)
    for (const name of districts) {
      if (!districtExists(db, name)) throw badRequest('unknown_district', `No district named “${name}”.`)
    }
    db.prepare('UPDATE workspace SET following_json = ?, updated_at = ? WHERE id = 1').run(
      JSON.stringify(districts),
      new Date().toISOString(),
    )
    respondWorkspace(res)
  })

  app.post('/api/workspace/reset', (_req, res) => {
    respondWorkspace(res, resetWorkspace(db, dataset))
  })

  // ---------------------------------------------------------------- fallback --
  app.use('/api', (_req, _res, next) => {
    next(new ApiError(404, 'not_found', 'No such API endpoint.'))
  })

  if (!options.serveStatic) {
    // API-only mode (used by `npm run dev`): point humans at the Vite server
    // instead of returning Express's default HTML 404.
    app.use((req: Request, res: Response, next) => {
      if (req.method !== 'GET') return next()
      res.status(404).json({
        error: {
          code: 'not_found',
          message: 'This process only serves /api. Open the frontend at http://127.0.0.1:5173 (npm run dev) or run npm run build && npm start.',
        },
      })
    })
  }

  if (options.serveStatic) {
    // dist/ lives at the repo root in dev and one level up from dist-server/.
    const cwd = options.rootDir ?? process.cwd()
    const dist = existsSync(path.join(cwd, 'dist', 'index.html'))
      ? path.join(cwd, 'dist')
      : path.join(cwd, '..', 'dist')
    if (existsSync(path.join(dist, 'index.html'))) {
      app.use(express.static(dist, { index: false, maxAge: '1h' }))
      app.use((req: Request, res: Response, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
        res.sendFile(path.join(dist, 'index.html'))
      })
    }
  }

  app.use(errorHandler)

  return {
    app,
    db,
    dbPath,
    dataset,
    seeded,
    close: () => db.close(),
  }
}
