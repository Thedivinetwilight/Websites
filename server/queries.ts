import type { DatabaseSync } from 'node:sqlite'
import type { Signal, Stage } from '../src/lib/types.js'
import type { AccountListQuery } from './validation.js'

/**
 * Read model for the API. Every statement is prepared and parameterised; the
 * only interpolated SQL fragments come from hard-coded allowlists below.
 */

export interface AccountRow {
  id: string
  name: string
  sector: string
  sub_sector: string
  district: string
  locality: string
  employees: number
  revenue_cr: number
  founded_year: number
  fit: number
  momentum: number
  footprint: number
  reach: number
  score: number
  contact_name: string
  contact_role: string
  contact_email: string
  contact_phone: string
  website: string | null
  owner: string
  seed_status: Stage
  last_touch_days: number
  potential_l: number
  account_tier: string
  seed_notes: string
  spotlight: number
  brief_rank: number | null
  stage?: Stage
  saved?: number
  note?: string | null
  route_position?: number | null
}

export interface SignalRow {
  account_id: string
  type: Signal['type']
  label: string
  date: string
  days_ago: number
  weight: number
}

export interface DistrictRow {
  name: string
  region: string
  growth: number
  tier: number
  character: string
  momentum: number
  avg_score: number
  hotspot: string
  pulse_json: string
  top_sectors_json: string
}

export interface ApiAccount {
  id: string
  name: string
  sector: string
  subSector: string
  district: string
  locality: string
  employees: number
  revenueCr: number
  foundedYear: number
  scores: { fit: number; momentum: number; footprint: number; reach: number }
  score: number
  signals: Signal[]
  contact: { name: string; role: string; email: string; phone: string; demo: true }
  website: string | null
  owner: string
  status: Stage
  lastTouchDays: number
  potentialL: number
  accountTier: string
  notes: string
  spotlight: boolean
  workspace: {
    saved: boolean
    stage: Stage
    note: string
    inRoute: boolean
    routePosition: number | null
  }
}

export function mapAccount(row: AccountRow, signals: Signal[], stage: Stage, note: string): ApiAccount {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    subSector: row.sub_sector,
    district: row.district,
    locality: row.locality,
    employees: row.employees,
    revenueCr: row.revenue_cr,
    foundedYear: row.founded_year,
    scores: { fit: row.fit, momentum: row.momentum, footprint: row.footprint, reach: row.reach },
    score: row.score,
    signals,
    contact: {
      name: row.contact_name,
      role: row.contact_role,
      email: row.contact_email,
      phone: row.contact_phone,
      demo: true,
    },
    website: row.website,
    owner: row.owner,
    status: row.seed_status,
    lastTouchDays: row.last_touch_days,
    potentialL: row.potential_l,
    accountTier: row.account_tier,
    notes: row.seed_notes,
    spotlight: row.spotlight === 1,
    workspace: {
      saved: row.saved === 1,
      stage,
      note,
      inRoute: row.route_position !== null && row.route_position !== undefined,
      routePosition: row.route_position ?? null,
    },
  }
}

const SORT_SQL: Record<AccountListQuery['sort'], string> = {
  score: 'a.score DESC, a.name ASC',
  signals:
    "(SELECT COALESCE(SUM(s.weight), 0) FROM signals s WHERE s.account_id = a.id AND s.days_ago <= 45) DESC, a.score DESC",
  potential: 'a.potential_l DESC, a.score DESC',
  momentum: 'a.momentum DESC, a.score DESC',
  name: 'a.name ASC',
  fit: 'a.fit DESC, a.score DESC',
}

const ACCOUNT_SELECT = `
  SELECT a.*,
         p.stage AS stage,
         CASE WHEN sa.account_id IS NULL THEN 0 ELSE 1 END AS saved,
         COALESCE(n.body, a.seed_notes) AS note,
         rs.position AS route_position
  FROM accounts a
  JOIN pipeline p ON p.account_id = a.id
  LEFT JOIN saved_accounts sa ON sa.account_id = a.id
  LEFT JOIN notes n ON n.account_id = a.id
  LEFT JOIN route_stops rs ON rs.account_id = a.id
`

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`)
}

export interface ListOptions extends AccountListQuery {
  /** Restrict to an explicit set of ids (used by the morning brief). */
  ids?: string[]
  district?: string
}

function buildFilters(query: ListOptions) {
  const where: string[] = []
  const params: (string | number)[] = []

  if (query.ids?.length) {
    where.push(`a.id IN (${query.ids.map(() => '?').join(', ')})`)
    params.push(...query.ids)
  }
  if (query.district) {
    where.push('a.district = ?')
    params.push(query.district)
  }
  if (query.q) {
    const like = `%${escapeLike(query.q.toLowerCase())}%`
    where.push(`(
      lower(a.name) LIKE ? ESCAPE '\\'
      OR lower(a.sector) LIKE ? ESCAPE '\\'
      OR lower(a.sub_sector) LIKE ? ESCAPE '\\'
      OR lower(a.district) LIKE ? ESCAPE '\\'
      OR lower(a.locality) LIKE ? ESCAPE '\\'
      OR lower(a.id) LIKE ? ESCAPE '\\'
    )`)
    params.push(like, like, like, like, like, like)
  }
  if (query.sector) {
    where.push('a.sector = ?')
    params.push(query.sector)
  }
  if (query.region) {
    where.push('a.district IN (SELECT name FROM districts WHERE region = ?)')
    params.push(query.region)
  }
  if (query.stage) {
    where.push('p.stage = ?')
    params.push(query.stage)
  }
  if (query.saved === '1') where.push('sa.account_id IS NOT NULL')
  if (query.saved === '0') where.push('sa.account_id IS NULL')

  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
}

function signalsFor(db: DatabaseSync, ids: string[]) {
  const grouped = new Map<string, Signal[]>()
  if (!ids.length) return grouped
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT account_id, type, label, date, days_ago, weight
       FROM signals WHERE account_id IN (${placeholders}) ORDER BY account_id ASC, ordinal ASC`,
    )
    .all(...ids) as unknown as SignalRow[]
  for (const row of rows) {
    const list = grouped.get(row.account_id) ?? []
    list.push({ type: row.type, label: row.label, date: row.date, daysAgo: row.days_ago, weight: row.weight })
    grouped.set(row.account_id, list)
  }
  return grouped
}

export function listAccounts(db: DatabaseSync, query: ListOptions) {
  const { clause, params } = buildFilters(query)
  const totalRow = db
    .prepare(
      `SELECT COUNT(*) AS total FROM accounts a
       JOIN pipeline p ON p.account_id = a.id
       LEFT JOIN saved_accounts sa ON sa.account_id = a.id
       ${clause}`,
    )
    .get(...params) as { total: number }

  const summaryRow = db
    .prepare(
      `SELECT COALESCE(SUM(a.potential_l), 0) AS potential_l,
              COALESCE(SUM(CASE WHEN a.momentum >= 80 THEN 1 ELSE 0 END), 0) AS strong
       FROM accounts a
       JOIN pipeline p ON p.account_id = a.id
       LEFT JOIN saved_accounts sa ON sa.account_id = a.id
       ${clause}`,
    )
    .get(...params) as { potential_l: number; strong: number }

  const rows = db
    .prepare(`${ACCOUNT_SELECT} ${clause} ORDER BY ${SORT_SQL[query.sort]} LIMIT ? OFFSET ?`)
    .all(...params, query.limit, query.offset) as unknown as AccountRow[]

  const signals = signalsFor(db, rows.map((r) => r.id))
  const data = rows.map((row) =>
    mapAccount(
      row,
      signals.get(row.id) ?? [],
      (row.stage ?? row.seed_status) as Stage,
      row.note ?? row.seed_notes,
    ),
  )

  return {
    data,
    page: {
      limit: query.limit,
      offset: query.offset,
      total: totalRow.total,
      returned: data.length,
      hasMore: query.offset + data.length < totalRow.total,
    },
    summary: {
      potentialL: Math.round(summaryRow.potential_l * 10) / 10,
      strongMomentum: summaryRow.strong,
    },
  }
}

export function getAccount(db: DatabaseSync, id: string): ApiAccount | null {
  const row = db.prepare(`${ACCOUNT_SELECT} WHERE a.id = ?`).get(id) as unknown as AccountRow | undefined
  if (!row) return null
  const signals = signalsFor(db, [id]).get(id) ?? []
  return mapAccount(row, signals, (row.stage ?? row.seed_status) as Stage, row.note ?? row.seed_notes)
}

export function briefAccounts(db: DatabaseSync) {
  const rows = db.prepare(`${ACCOUNT_SELECT} WHERE a.brief_rank IS NOT NULL ORDER BY a.brief_rank ASC`).all() as unknown as AccountRow[]
  const signals = signalsFor(db, rows.map((r) => r.id))
  return rows.map((row) =>
    mapAccount(row, signals.get(row.id) ?? [], (row.stage ?? row.seed_status) as Stage, row.note ?? row.seed_notes),
  )
}

export interface ApiDistrict {
  name: string
  region: string
  growth: number
  tier: number
  character: string
  momentum: number
  avgScore: number
  hotspot: string
  pulse: number[]
  topSectors: { name: string; count: number }[]
  prospects: number
  potentialL: number
  signalCount: number
  savedCount: number
  routeCount: number
  sectorLabel: string
}

export function listDistricts(db: DatabaseSync): ApiDistrict[] {
  const rows = db
    .prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM accounts a WHERE a.district = d.name) AS prospects,
        (SELECT COALESCE(SUM(a.potential_l), 0) FROM accounts a WHERE a.district = d.name) AS potential_l,
        (SELECT COUNT(*) FROM signals s JOIN accounts a ON a.id = s.account_id WHERE a.district = d.name) AS signal_count,
        (SELECT COUNT(*) FROM saved_accounts sa JOIN accounts a ON a.id = sa.account_id WHERE a.district = d.name) AS saved_count,
        (SELECT COUNT(*) FROM route_stops rs JOIN accounts a ON a.id = rs.account_id WHERE a.district = d.name) AS route_count
       FROM districts d ORDER BY d.name ASC`,
    )
    .all() as unknown as (DistrictRow & {
    prospects: number
    potential_l: number
    signal_count: number
    saved_count: number
    route_count: number
  })[]

  const sectorRows = db
    .prepare(
      `SELECT district, sector, COUNT(*) AS n FROM accounts GROUP BY district, sector ORDER BY district, n DESC, sector`,
    )
    .all() as { district: string; sector: string; n: number }[]

  const topSector = new Map<string, string>()
  for (const row of sectorRows) if (!topSector.has(row.district)) topSector.set(row.district, row.sector)

  return rows.map((row) => ({
    name: row.name,
    region: row.region,
    growth: row.growth,
    tier: row.tier,
    character: row.character,
    momentum: row.momentum,
    avgScore: row.avg_score,
    hotspot: row.hotspot,
    pulse: JSON.parse(row.pulse_json) as number[],
    topSectors: JSON.parse(row.top_sectors_json) as { name: string; count: number }[],
    prospects: row.prospects,
    potentialL: Math.round(row.potential_l * 10) / 10,
    signalCount: row.signal_count,
    savedCount: row.saved_count,
    routeCount: row.route_count,
    sectorLabel: topSector.get(row.name) ?? 'Diversified',
  }))
}

export function listSectors(db: DatabaseSync) {
  return db
    .prepare(
      `SELECT sector AS name, COUNT(*) AS count, ROUND(SUM(potential_l)) AS potentialL,
              ROUND(AVG(score)) AS avgScore, ROUND(AVG(momentum)) AS growth
       FROM accounts GROUP BY sector ORDER BY count DESC, sector ASC`,
    )
    .all() as { name: string; count: number; potentialL: number; avgScore: number; growth: number }[]
}

export function totals(db: DatabaseSync) {
  const accounts = db.prepare('SELECT COUNT(*) AS n FROM accounts').get() as { n: number }
  const districts = db.prepare('SELECT COUNT(*) AS n FROM districts').get() as { n: number }
  const signals = db.prepare('SELECT COUNT(*) AS n FROM signals').get() as { n: number }
  const sectors = db.prepare('SELECT COUNT(DISTINCT sector) AS n FROM accounts').get() as { n: number }
  const potential = db.prepare('SELECT COALESCE(SUM(potential_l), 0) AS n FROM accounts').get() as { n: number }
  const employees = db.prepare('SELECT COALESCE(SUM(employees), 0) AS n FROM accounts').get() as { n: number }
  const spotlight = db
    .prepare('SELECT COALESCE(SUM(potential_l), 0) AS n FROM accounts WHERE spotlight = 1')
    .get() as { n: number }
  const recent = db.prepare('SELECT COUNT(*) AS n FROM signals WHERE days_ago <= 30').get() as { n: number }

  return {
    accounts: accounts.n,
    districts: districts.n,
    signals: signals.n,
    sectors: sectors.n,
    potentialL: Math.round(potential.n),
    employees: employees.n,
    savedPotentialL: Math.round(spotlight.n),
    newSignalsThisMonth: recent.n,
  }
}

/** Base district metadata plus rollups — used by the app bootstrap. */
export function listDistrictMeta(db: DatabaseSync) {
  const rows = db
    .prepare(
      `SELECT d.*,
        (SELECT COUNT(*) FROM accounts a WHERE a.district = d.name) AS prospects,
        (SELECT COALESCE(SUM(a.potential_l), 0) FROM accounts a WHERE a.district = d.name) AS potential_l,
        (SELECT COUNT(*) FROM signals s JOIN accounts a ON a.id = s.account_id WHERE a.district = d.name) AS signal_count
       FROM districts d ORDER BY d.name ASC`,
    )
    .all() as unknown as (DistrictRow & { prospects: number; potential_l: number; signal_count: number })[]
  return rows.map((row) => ({
    name: row.name,
    region: row.region,
    growth: row.growth,
    tier: row.tier,
    character: row.character,
    momentum: row.momentum,
    avgScore: row.avg_score,
    hotspot: row.hotspot,
    pulse: JSON.parse(row.pulse_json) as number[],
    topSectors: JSON.parse(row.top_sectors_json) as { name: string; count: number }[],
    prospects: row.prospects,
    potentialL: Math.round(row.potential_l * 10) / 10,
    signalCount: row.signal_count,
  }))
}
