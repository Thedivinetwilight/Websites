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

describe('saved accounts', () => {
  it('saves, is idempotent, and removes', async () => {
    const before = await request(server.app.app).get('/api/workspace').expect(200)
    expect(before.body.data.saved).toHaveLength(9)

    const saved = await request(server.app.app)
      .post('/api/workspace/saved')
      .send({ accountId: 'TH-1006' })
      .expect(200)
    expect(saved.body.data.workspace.saved).toContain('TH-1006')

    const again = await request(server.app.app)
      .post('/api/workspace/saved')
      .send({ accountId: 'TH-1006' })
      .expect(200)
    expect(again.body.data.workspace.saved.filter((id: string) => id === 'TH-1006')).toHaveLength(1)

    const removed = await request(server.app.app).delete('/api/workspace/saved/TH-1006').expect(200)
    expect(removed.body.data.workspace.saved).not.toContain('TH-1006')
  })

  it('removing a saved account also takes it off the route', async () => {
    await request(server.app.app).post('/api/workspace/saved').send({ accountId: 'TH-1008' }).expect(200)
    await request(server.app.app).post('/api/workspace/route/stops').send({ accountId: 'TH-1008' }).expect(200)

    const res = await request(server.app.app).delete('/api/workspace/saved/TH-1008').expect(200)
    expect(res.body.data.workspace.route).not.toContain('TH-1008')
  })

  it('validates the payload', async () => {
    const missing = await request(server.app.app).post('/api/workspace/saved').send({}).expect(400)
    expect(missing.body.error.code).toBe('validation_error')

    const wrongShape = await request(server.app.app)
      .post('/api/workspace/saved')
      .send({ accountId: 'TH-1000', extra: true })
      .expect(400)
    expect(wrongShape.body.error.details[0].path).toBe('(root)')

    const malformed = await request(server.app.app)
      .post('/api/workspace/saved')
      .send({ accountId: '1000' })
      .expect(400)
    expect(malformed.body.error.details[0].path).toBe('accountId')

    const unknown = await request(server.app.app)
      .post('/api/workspace/saved')
      .send({ accountId: 'TH-9999' })
      .expect(404)
    expect(unknown.body.error.code).toBe('not_found')

    const badJson = await request(server.app.app)
      .post('/api/workspace/saved')
      .set('Content-Type', 'application/json')
      .send('{"accountId": ')
      .expect(400)
    expect(badJson.body.error.code).toBe('invalid_json')
  })
})

describe('pipeline stages', () => {
  it('moves an account and persists the stage', async () => {
    const res = await request(server.app.app)
      .patch('/api/workspace/pipeline/TH-1003')
      .send({ stage: 'customer' })
      .expect(200)
    expect(res.body.data.stage).toBe('customer')
    expect(res.body.data.workspace.stages['TH-1003']).toBe('customer')

    const detail = await request(server.app.app).get('/api/accounts/TH-1003').expect(200)
    expect(detail.body.data.workspace.stage).toBe('customer')

    // The stage filter reads the same table.
    const filtered = await request(server.app.app).get('/api/accounts?stage=customer&limit=100').expect(200)
    expect(filtered.body.data.some((a: { id: string }) => a.id === 'TH-1003')).toBe(true)
  })

  it('rejects unknown stages and unknown accounts', async () => {
    const bad = await request(server.app.app)
      .patch('/api/workspace/pipeline/TH-1003')
      .send({ stage: 'won' })
      .expect(400)
    expect(bad.body.error.details[0].path).toBe('stage')

    await request(server.app.app).patch('/api/workspace/pipeline/TH-9999').send({ stage: 'new' }).expect(404)
    await request(server.app.app).patch('/api/workspace/pipeline/oops').send({ stage: 'new' }).expect(400)
  })
})

describe('notes', () => {
  it('saves and clears a note', async () => {
    const saved = await request(server.app.app)
      .put('/api/workspace/notes/TH-1004')
      .send({ note: 'Met the plant head at the Peelamedu gate. Wants a demo after Pongal.' })
      .expect(200)
    expect(saved.body.data.workspace.notes['TH-1004']).toMatch(/Pongal/)

    const detail = await request(server.app.app).get('/api/accounts/TH-1004').expect(200)
    expect(detail.body.data.workspace.note).toMatch(/Pongal/)

    const cleared = await request(server.app.app).put('/api/workspace/notes/TH-1004').send({ note: '' }).expect(200)
    expect(cleared.body.data.workspace.notes['TH-1004']).toBeUndefined()
  })

  it('enforces the length limit and trims whitespace rules', async () => {
    const tooLong = await request(server.app.app)
      .put('/api/workspace/notes/TH-1004')
      .send({ note: 'x'.repeat(2001) })
      .expect(400)
    expect(tooLong.body.error.details[0].path).toBe('note')

    const padded = await request(server.app.app)
      .put('/api/workspace/notes/TH-1004')
      .send({ note: '  padded  ' })
      .expect(400)
    expect(padded.body.error.details[0].path).toBe('note')
  })
})

describe('route', () => {
  it('adds stops, reorders them and removes them', async () => {
    const added = await request(server.app.app)
      .post('/api/workspace/route/stops')
      .send({ accountId: 'TH-1011' })
      .expect(200)
    expect(added.body.data.workspace.route).toContain('TH-1011')
    // Adding a stop also puts it on the saved list.
    expect(added.body.data.workspace.saved).toContain('TH-1011')

    const current: string[] = added.body.data.workspace.route
    const reversed = [...current].reverse()
    const reordered = await request(server.app.app)
      .patch('/api/workspace/route/order')
      .send({ stops: reversed })
      .expect(200)
    expect(reordered.body.data.workspace.route).toEqual(reversed)

    const removed = await request(server.app.app).delete('/api/workspace/route/stops/TH-1011').expect(200)
    expect(removed.body.data.workspace.route).not.toContain('TH-1011')
  })

  it('rejects a partial order, duplicates, and stops that are not on the route', async () => {
    const state = await request(server.app.app).get('/api/workspace').expect(200)
    const route: string[] = state.body.data.route

    const partial = await request(server.app.app)
      .patch('/api/workspace/route/order')
      .send({ stops: route.slice(0, 1) })
      .expect(400)
    expect(partial.body.error.code).toBe('route_mismatch')

    const duplicate = await request(server.app.app)
      .patch('/api/workspace/route/order')
      .send({ stops: [route[0], route[0], ...route.slice(1)] })
      .expect(400)
    expect(duplicate.body.error.code).toBe('validation_error')

    const outsider = await request(server.app.app)
      .patch('/api/workspace/route/order')
      .send({ stops: [...route.slice(1), 'TH-1040'] })
      .expect(400)
    expect(outsider.body.error.code).toBe('not_on_route')
  })

  it('updates the route date and rejects impossible dates', async () => {
    const res = await request(server.app.app)
      .patch('/api/workspace/route/date')
      .send({ date: '2026-11-10' })
      .expect(200)
    expect(res.body.data.workspace.routeDate).toBe('2026-11-10')

    const bad = await request(server.app.app)
      .patch('/api/workspace/route/date')
      .send({ date: '2026-02-30' })
      .expect(400)
    expect(bad.body.error.details[0].path).toBe('date')

    const malformed = await request(server.app.app)
      .patch('/api/workspace/route/date')
      .send({ date: '10/11/2026' })
      .expect(400)
    expect(malformed.body.error.details[0].path).toBe('date')
  })
})

describe('followed districts', () => {
  it('replaces the followed list', async () => {
    const res = await request(server.app.app)
      .put('/api/workspace/following')
      .send({ districts: ['Chennai', 'Coimbatore'] })
      .expect(200)
    expect(res.body.data.workspace.following).toEqual(['Chennai', 'Coimbatore'])
  })

  it('rejects unknown districts and duplicates', async () => {
    const unknown = await request(server.app.app)
      .put('/api/workspace/following')
      .send({ districts: ['Atlantis'] })
      .expect(400)
    expect(unknown.body.error.code).toBe('unknown_district')

    const dupe = await request(server.app.app)
      .put('/api/workspace/following')
      .send({ districts: ['Chennai', 'Chennai'] })
      .expect(400)
    expect(dupe.body.error.code).toBe('validation_error')
  })
})

describe('reset', () => {
  it('restores the seeded demo workspace', async () => {
    await request(server.app.app).patch('/api/workspace/pipeline/TH-1000').send({ stage: 'customer' })
    await request(server.app.app).put('/api/workspace/notes/TH-1000').send({ note: 'temporary' })
    await request(server.app.app).delete('/api/workspace/saved/TH-1001')
    await request(server.app.app).patch('/api/workspace/route/date').send({ date: '2027-01-01' })

    const res = await request(server.app.app).post('/api/workspace/reset').expect(200)
    const workspace = res.body.data.workspace

    expect(workspace.saved).toHaveLength(9)
    expect(workspace.route).toEqual(['TH-1003', 'TH-1002', 'TH-1009'])
    expect(workspace.routeDate).toBe('2026-11-03')
    expect(workspace.stages['TH-1000']).toBe('meeting')
    expect(workspace.notes['TH-1000']).toMatch(/capacity model/)
    expect(workspace.following).toEqual(['Chennai', 'Tiruppur', 'Madurai'])
  })

  it('keeps resetting idempotently', async () => {
    await request(server.app.app).post('/api/workspace/reset').expect(200)
    const res = await request(server.app.app).post('/api/workspace/reset').expect(200)
    expect(res.body.data.workspace.saved).toHaveLength(9)
  })
})
