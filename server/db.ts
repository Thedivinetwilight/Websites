import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { loadSeedDataset, type SeedDataset } from './dataset.js'

/**
 * SQLite access for the demo. Uses Node's built-in `node:sqlite` driver so a
 * Windows install needs no compiler, Python or native module rebuild.
 * Requires Node >= 22.13.
 */

export const SCHEMA_VERSION = 1

const HERE = path.dirname(fileURLToPath(import.meta.url))

export function defaultDbPath() {
  const fromEnv = process.env.THERU_DB_PATH
  if (fromEnv) return path.resolve(fromEnv)
  // Always <repo>/.data/theru.sqlite, whether this file runs from server/ via
  // tsx (dev) or from dist-server/server/ (production) after a build.
  const base = HERE.replace(/[\\/](?:dist-server[\\/])?server$/, '')
  return path.join(base, '.data', 'theru.sqlite')
}

function schemaSql() {
  const candidates = [path.join(HERE, 'schema.sql'), path.resolve(process.cwd(), 'server/schema.sql')]
  const file = candidates.find((p) => existsSync(p))
  if (!file) throw new Error('Could not find server/schema.sql')
  return readFileSync(file, 'utf8')
}

// The seed dataset is immutable for the life of a process.
let cachedDataset: SeedDataset | null = null
export function seedDataset(): SeedDataset {
  if (!cachedDataset) cachedDataset = loadSeedDataset()
  return cachedDataset
}

export interface OpenDatabaseOptions {
  dbPath?: string
  /** Re-seed even when the dataset version matches (used by tests). */
  forceSeed?: boolean
  dataset?: SeedDataset
}

export interface OpenedDatabase {
  db: DatabaseSync
  dataset: SeedDataset
  dbPath: string
  seeded: boolean
}

export function openDatabase(options: OpenDatabaseOptions = {}): OpenedDatabase {
  const dbPath = options.dbPath ?? defaultDbPath()
  const dataset = options.dataset ?? seedDataset()

  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(dbPath), { recursive: true })
  }

  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec(schemaSql())
  setMeta(db, 'schema_version', String(SCHEMA_VERSION))

  const seeded = seedIfNeeded(db, dataset, options.forceSeed === true)
  return { db, dataset, dbPath, seeded }
}

export function setMeta(db: DatabaseSync, key: string, value: string) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    value,
  )
}

export function getMeta(db: DatabaseSync, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

function wipe(db: DatabaseSync) {
  // Order matters while foreign keys are on.
  for (const table of [
    'route_stops',
    'notes',
    'pipeline',
    'saved_accounts',
    'workspace',
    'signals',
    'accounts',
    'districts',
    'meta',
  ]) {
    db.exec(`DELETE FROM ${table}`)
  }
}

function seedIfNeeded(db: DatabaseSync, dataset: SeedDataset, force: boolean) {
  const current = getMeta(db, 'dataset_version')
  if (!force && current === dataset.version) return false

  db.exec('BEGIN IMMEDIATE')
  try {
    wipe(db)

    setMeta(db, 'schema_version', String(SCHEMA_VERSION))
    setMeta(db, 'dataset_version', dataset.version)
    setMeta(db, 'seeded_at', new Date().toISOString())
    setMeta(db, 'seed_source', 'synthetic demo data (src/data/prospects.json, src/data/districts.json)')
    setMeta(db, 'demo', 'true')

    const insertDistrict = db.prepare(`
      INSERT INTO districts (name, region, growth, tier, character, momentum, avg_score, hotspot, pulse_json, top_sectors_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const d of dataset.districts) {
      insertDistrict.run(
        d.name,
        d.region,
        d.growth,
        d.tier,
        d.character,
        d.momentum,
        d.avgScore,
        d.hotspot,
        JSON.stringify(d.pulse),
        JSON.stringify(d.topSectors),
      )
    }

    const insertAccount = db.prepare(`
      INSERT INTO accounts (
        id, name, sector, sub_sector, district, locality, employees, revenue_cr, founded_year,
        fit, momentum, footprint, reach, score, contact_name, contact_role, contact_email,
        contact_phone, website, owner, seed_status, last_touch_days, potential_l, account_tier,
        seed_notes, spotlight, brief_rank
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertSignal = db.prepare(`
      INSERT INTO signals (account_id, ordinal, type, label, date, days_ago, weight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const briefIds = ['TH-1000', 'TH-1001', 'TH-1003', 'TH-1004', 'TH-1002', 'TH-1007']

    for (const p of dataset.prospects) {
      const score = Math.round(p.scores.fit * 0.32 + p.scores.momentum * 0.3 + p.scores.footprint * 0.22 + p.scores.reach * 0.16)
      insertAccount.run(
        p.id,
        p.name,
        p.sector,
        p.subSector,
        p.district,
        p.locality,
        p.employees,
        p.revenueCr,
        p.foundedYear,
        p.scores.fit,
        p.scores.momentum,
        p.scores.footprint,
        p.scores.reach,
        score,
        p.contact.name,
        p.contact.role,
        p.contact.email,
        p.contact.phone,
        p.website,
        p.owner,
        p.status,
        p.lastTouchDays,
        p.potentialL,
        p.accountTier,
        p.notes,
        p.spotlight ? 1 : 0,
        briefIds.indexOf(p.id) >= 0 ? briefIds.indexOf(p.id) + 1 : null,
      )
      p.signals.forEach((s, i) => {
        insertSignal.run(p.id, i, s.type, s.label, s.date, s.daysAgo, s.weight)
      })
    }

    seedWorkspace(db, dataset)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return true
}

export function seedWorkspace(db: DatabaseSync, dataset: SeedDataset) {
  const now = new Date().toISOString()
  const defaults = dataset.defaults

  db.exec('DELETE FROM route_stops')
  db.exec('DELETE FROM notes')
  db.exec('DELETE FROM pipeline')
  db.exec('DELETE FROM saved_accounts')
  db.exec('DELETE FROM workspace')

  db.prepare('INSERT INTO workspace (id, route_date, following_json, updated_at) VALUES (1, ?, ?, ?)').run(
    defaults.routeDate,
    JSON.stringify(defaults.following),
    now,
  )

  const insertPipeline = db.prepare('INSERT INTO pipeline (account_id, stage, updated_at) VALUES (?, ?, ?)')
  for (const p of dataset.prospects) {
    insertPipeline.run(p.id, defaults.stageOverrides[p.id] ?? p.status, now)
  }

  const insertSaved = db.prepare('INSERT INTO saved_accounts (account_id, position, created_at) VALUES (?, ?, ?)')
  defaults.saved.forEach((id, i) => insertSaved.run(id, i, now))

  const insertNote = db.prepare('INSERT INTO notes (account_id, body, updated_at) VALUES (?, ?, ?)')
  Object.entries(defaults.notes).forEach(([id, body]) => insertNote.run(id, body, now))

  const insertStop = db.prepare('INSERT INTO route_stops (account_id, position) VALUES (?, ?)')
  defaults.route.forEach((id, i) => insertStop.run(id, i))

  setMeta(db, 'workspace_reset_at', now)
}

export interface WorkspaceSnapshot {
  saved: string[]
  stages: Record<string, string>
  notes: Record<string, string>
  route: string[]
  routeDate: string
  following: string[]
  updatedAt: string | null
}

export function getWorkspace(db: DatabaseSync): WorkspaceSnapshot {
  const row = db
    .prepare('SELECT route_date, following_json, updated_at FROM workspace WHERE id = 1')
    .get() as { route_date: string; following_json: string; updated_at: string } | undefined

  const saved = db
    .prepare('SELECT account_id FROM saved_accounts ORDER BY position ASC, created_at ASC')
    .all() as { account_id: string }[]
  const stages = db.prepare('SELECT account_id, stage FROM pipeline').all() as {
    account_id: string
    stage: string
  }[]
  const notes = db.prepare('SELECT account_id, body FROM notes').all() as { account_id: string; body: string }[]
  const route = db
    .prepare('SELECT account_id FROM route_stops ORDER BY position ASC')
    .all() as { account_id: string }[]

  return {
    saved: saved.map((r) => r.account_id),
    stages: Object.fromEntries(stages.map((r) => [r.account_id, r.stage])),
    notes: Object.fromEntries(notes.map((r) => [r.account_id, r.body])),
    route: route.map((r) => r.account_id),
    routeDate: row?.route_date ?? DEMO_ROUTE_DATE_FALLBACK,
    following: row ? (JSON.parse(row.following_json) as string[]) : [],
    updatedAt: row?.updated_at ?? null,
  }
}

const DEMO_ROUTE_DATE_FALLBACK = '2026-11-03'

export function touchWorkspace(db: DatabaseSync) {
  db.prepare('UPDATE workspace SET updated_at = ? WHERE id = 1').run(new Date().toISOString())
}

export function resetWorkspace(db: DatabaseSync, dataset: SeedDataset) {
  db.exec('BEGIN IMMEDIATE')
  try {
    seedWorkspace(db, dataset)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return getWorkspace(db)
}

export function accountExists(db: DatabaseSync, id: string) {
  return Boolean(db.prepare('SELECT 1 AS ok FROM accounts WHERE id = ?').get(id))
}

export function districtExists(db: DatabaseSync, name: string) {
  return Boolean(db.prepare('SELECT 1 AS ok FROM districts WHERE name = ?').get(name))
}
