import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { startTestServer, type TestServer } from '../helpers'

let server: TestServer

beforeAll(async () => {
  server = await startTestServer()
})

afterAll(async () => {
  await server.close()
})

describe('GET /api/health', () => {
  it('reports a healthy database and the seeded dataset', async () => {
    const res = await request(server.app.app).get('/api/health').expect(200)

    expect(res.body.status).toBe('ok')
    expect(res.body.database).toBe('ok')
    expect(res.body.schemaVersion).toBe(1)
    expect(res.body.demo).toBe(true)
    // Documented as unauthenticated in the README; the health check says so.
    expect(res.body.auth).toBe('none')
    expect(res.body.dataset).toMatchObject({
      accounts: 421,
      districts: 37,
      signals: 1246,
      sectors: 12,
    })
    expect(res.body.datasetVersion).toMatch(/^[a-f0-9]{12}$/)
  })

  it('returns a JSON 404 envelope for unknown API routes', async () => {
    const res = await request(server.app.app).get('/api/does-not-exist').expect(404)
    expect(res.body.error.code).toBe('not_found')
    expect(typeof res.body.error.message).toBe('string')
  })
})

describe('GET /api/bootstrap', () => {
  it('returns accounts, districts, the brief, totals and the workspace', async () => {
    const res = await request(server.app.app).get('/api/bootstrap').expect(200)
    const body = res.body.data

    expect(body.accounts).toHaveLength(421)
    expect(body.districts).toHaveLength(37)
    expect(body.brief).toHaveLength(6)
    expect(body.totals.signals).toBe(1246)
    expect(body.workspace.saved).toHaveLength(9)
    expect(body.workspace.route).toEqual(['TH-1003', 'TH-1002', 'TH-1009'])
    expect(body.workspace.routeDate).toBe('2026-11-03')

    // Accounts arrive with their signals and workspace state attached.
    const first = body.accounts.find((a: { id: string }) => a.id === 'TH-1000')
    expect(first.signals.length).toBeGreaterThan(0)
    expect(first.workspace.stage).toBe('meeting')
    expect(first.workspace.saved).toBe(true)
  })
})
