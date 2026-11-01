import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../server/app'
import { getMeta, openDatabase } from '../../server/db'
import { tempDbPath } from '../helpers'

const cleanups: (() => void)[] = []

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.()
})

describe('seeding', () => {
  it('seeds exactly once and is a no-op on the next boot', () => {
    const { file, cleanup } = tempDbPath()
    cleanups.push(cleanup)

    const first = openDatabase({ dbPath: file })
    expect(first.seeded).toBe(true)
    const firstSeedAt = getMeta(first.db, 'seeded_at')
    const counts = first.db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM accounts) AS accounts,
                (SELECT COUNT(*) FROM signals) AS signals,
                (SELECT COUNT(*) FROM districts) AS districts,
                (SELECT COUNT(*) FROM saved_accounts) AS saved`,
      )
      .get() as { accounts: number; signals: number; districts: number; saved: number }
    expect(counts).toEqual({ accounts: 421, signals: 1246, districts: 37, saved: 9 })
    first.db.close()

    const second = openDatabase({ dbPath: file })
    expect(second.seeded).toBe(false)
    expect(getMeta(second.db, 'seeded_at')).toBe(firstSeedAt)
    const total = second.db.prepare('SELECT COUNT(*) AS n FROM signals').get() as { n: number }
    expect(total.n).toBe(1246)
    second.db.close()
  })

  it('records schema and dataset versions in the meta table', () => {
    const { file, cleanup } = tempDbPath()
    cleanups.push(cleanup)
    const { db, dataset } = openDatabase({ dbPath: file })
    expect(getMeta(db, 'schema_version')).toBe('1')
    expect(getMeta(db, 'dataset_version')).toBe(dataset.version)
    expect(getMeta(db, 'demo')).toBe('true')
    expect(getMeta(db, 'seed_source')).toMatch(/synthetic/i)
    db.close()
  })

  it('re-seeds when the dataset version changes', () => {
    const { file, cleanup } = tempDbPath()
    cleanups.push(cleanup)
    const first = openDatabase({ dbPath: file })
    const dataset = { ...first.dataset, version: 'changed-version' }
    first.db.prepare('DELETE FROM accounts WHERE id = ?').run('TH-1000')
    first.db.close()

    const second = openDatabase({ dbPath: file, dataset })
    const restored = second.db.prepare('SELECT COUNT(*) AS n FROM accounts').get() as { n: number }
    expect(second.seeded).toBe(true)
    expect(restored.n).toBe(421)
    expect(getMeta(second.db, 'dataset_version')).toBe('changed-version')
    second.db.close()
  })
})

describe('edits survive a server restart', () => {
  it('keeps saves, stages, notes, route and followed districts on disk', async () => {
    const { file, cleanup } = tempDbPath()
    cleanups.push(cleanup)

    // ---- first "server process" ----
    const first = createApp({ dbPath: file })
    await request(first.app).post('/api/workspace/saved').send({ accountId: 'TH-1006' }).expect(200)
    await request(first.app).patch('/api/workspace/pipeline/TH-1006').send({ stage: 'meeting' }).expect(200)
    await request(first.app)
      .put('/api/workspace/notes/TH-1006')
      .send({ note: 'Restart test note — must survive.' })
      .expect(200)
    await request(first.app).post('/api/workspace/route/stops').send({ accountId: 'TH-1006' }).expect(200)
    await request(first.app).patch('/api/workspace/route/date').send({ date: '2026-11-17' }).expect(200)
    await request(first.app).put('/api/workspace/following').send({ districts: ['Coimbatore'] }).expect(200)
    first.close()

    // ---- second "server process" on the same file ----
    const second = createApp({ dbPath: file })
    const res = await request(second.app).get('/api/workspace').expect(200)
    const workspace = res.body.data

    expect(workspace.saved).toContain('TH-1006')
    expect(workspace.stages['TH-1006']).toBe('meeting')
    expect(workspace.notes['TH-1006']).toMatch(/must survive/)
    expect(workspace.route).toContain('TH-1006')
    expect(workspace.routeDate).toBe('2026-11-17')
    expect(workspace.following).toEqual(['Coimbatore'])

    const detail = await request(second.app).get('/api/accounts/TH-1006').expect(200)
    expect(detail.body.data.workspace).toMatchObject({ saved: true, stage: 'meeting' })
    second.close()
  })
})

describe('data integrity', () => {
  it('enforces foreign keys and stage constraints at the database level', () => {
    const { file, cleanup } = tempDbPath()
    cleanups.push(cleanup)
    const { db } = openDatabase({ dbPath: file })

    expect(() =>
      db.prepare('INSERT INTO saved_accounts (account_id, position, created_at) VALUES (?, ?, ?)').run('TH-9999', 0, 'now'),
    ).toThrow()

    expect(() =>
      db
        .prepare('INSERT INTO pipeline (account_id, stage, updated_at) VALUES (?, ?, ?)')
        .run('TH-1000', 'won', 'now'),
    ).toThrow()

    db.close()
  })

  it('stores sanitised demo contacts, never the raw seed values', () => {
    const { file, cleanup } = tempDbPath()
    cleanups.push(cleanup)
    const { db } = openDatabase({ dbPath: file })
    const rows = db.prepare('SELECT contact_phone, contact_email, website FROM accounts').all() as {
      contact_phone: string
      contact_email: string
      website: string | null
    }[]
    expect(rows).toHaveLength(421)
    for (const row of rows) {
      expect(row.contact_phone).toMatch(/^\+91 00000 \d{5}$/)
      expect(row.contact_email.endsWith('@demo.theru.invalid')).toBe(true)
      expect(row.website).toBeNull()
    }
    db.close()
  })
})
