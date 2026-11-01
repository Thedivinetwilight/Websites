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

describe('GET /api/accounts', () => {
  it('paginates with a total and a summary', async () => {
    const res = await request(server.app.app).get('/api/accounts?limit=12&offset=0').expect(200)

    expect(res.body.data).toHaveLength(12)
    expect(res.body.page).toMatchObject({ limit: 12, offset: 0, total: 421, returned: 12, hasMore: true })
    expect(res.body.summary.potentialL).toBeGreaterThan(0)
    // The summary describes the whole filtered set, not just the page.
    expect(res.body.summary.potentialL).toBeCloseTo(2541.3, 1)
  })

  it('sorts by score descending by default', async () => {
    const res = await request(server.app.app).get('/api/accounts?limit=50').expect(200)
    const scores = res.body.data.map((a: { score: number }) => a.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('filters by district, sector, region and stage', async () => {
    const district = await request(server.app.app).get('/api/accounts?district=Chennai&limit=100').expect(200)
    expect(district.body.data.length).toBeGreaterThan(0)
    expect(district.body.data.every((a: { district: string }) => a.district === 'Chennai')).toBe(true)

    const sector = await request(server.app.app)
      .get('/api/accounts?sector=Textiles%20%26%20Apparel&limit=100')
      .expect(200)
    expect(sector.body.data.every((a: { sector: string }) => a.sector === 'Textiles & Apparel')).toBe(true)

    const districts = await request(server.app.app).get('/api/districts').expect(200)
    const west = new Set(
      districts.body.data.filter((d: { region: string }) => d.region === 'West').map((d: { name: string }) => d.name),
    )
    const region = await request(server.app.app).get('/api/accounts?region=West&limit=200').expect(200)
    expect(region.body.page.total).toBeGreaterThan(0)
    expect(region.body.data.every((a: { district: string }) => west.has(a.district))).toBe(true)
    expect(region.body.page.total).toBe(
      districts.body.data.filter((d: { region: string }) => d.region === 'West').reduce((s: number, d: { prospects: number }) => s + d.prospects, 0),
    )

    const stage = await request(server.app.app).get('/api/accounts?stage=meeting&limit=200').expect(200)
    expect(stage.body.data.every((a: { workspace: { stage: string } }) => a.workspace.stage === 'meeting')).toBe(true)
  })

  it('searches names, localities, sectors and ids case-insensitively', async () => {
    const byName = await request(server.app.app).get('/api/accounts?q=anandhaa').expect(200)
    expect(byName.body.data[0].name).toBe('Anandhaa Knitwear')

    const byId = await request(server.app.app).get('/api/accounts?q=TH-1002').expect(200)
    expect(byId.body.data[0].id).toBe('TH-1002')

    const byLocality = await request(server.app.app).get('/api/accounts?q=peelamedu').expect(200)
    expect(byLocality.body.page.total).toBeGreaterThan(0)

    const bySector = await request(server.app.app).get('/api/accounts?q=logistics&limit=100').expect(200)
    expect(bySector.body.page.total).toBeGreaterThan(0)
  })

  it('treats LIKE wildcards in the query as literal characters', async () => {
    // A naive `LIKE %${q}%` would return every row for "%".
    const res = await request(server.app.app).get('/api/accounts?q=%25').expect(200)
    expect(res.body.page.total).toBe(0)

    const underscore = await request(server.app.app).get('/api/accounts?q=_').expect(200)
    expect(underscore.body.page.total).toBe(0)
  })

  it('filters to saved accounts', async () => {
    const res = await request(server.app.app).get('/api/accounts?saved=1&limit=100').expect(200)
    expect(res.body.page.total).toBe(9)
    expect(res.body.data.every((a: { workspace: { saved: boolean } }) => a.workspace.saved)).toBe(true)
  })

  it('rejects invalid query parameters with field-level detail', async () => {
    const badSort = await request(server.app.app).get('/api/accounts?sort=chaos').expect(400)
    expect(badSort.body.error.code).toBe('validation_error')
    expect(badSort.body.error.details[0].path).toBe('sort')

    const badLimit = await request(server.app.app).get('/api/accounts?limit=9999').expect(400)
    expect(badLimit.body.error.details[0].path).toBe('limit')

    const badOffset = await request(server.app.app).get('/api/accounts?offset=-1').expect(400)
    expect(badOffset.body.error.details[0].path).toBe('offset')

    const badStage = await request(server.app.app).get('/api/accounts?stage=won').expect(400)
    expect(badStage.body.error.details[0].path).toBe('stage')

    const badRegion = await request(server.app.app).get('/api/accounts?region=East').expect(400)
    expect(badRegion.body.error.details[0].path).toBe('region')

    const longQuery = await request(server.app.app).get(`/api/accounts?q=${'a'.repeat(120)}`).expect(400)
    expect(longQuery.body.error.details[0].path).toBe('q')
  })

  it('returns a 400 for an unknown district rather than an empty list', async () => {
    const res = await request(server.app.app).get('/api/accounts?district=Atlantis').expect(400)
    expect(res.body.error.code).toBe('unknown_district')
  })
})

describe('GET /api/accounts/:id', () => {
  it('returns the full record with signals and workspace state', async () => {
    const res = await request(server.app.app).get('/api/accounts/TH-1002').expect(200)
    const account = res.body.data

    expect(account.name).toBe('Sri Velan Logistics')
    expect(account.signals.length).toBeGreaterThan(1)
    expect(account.workspace.saved).toBe(true)
    expect(account.workspace.stage).toBe('meeting')
    expect(account.workspace.note).toMatch(/Sriperumbudur/)
    expect(account.score).toBeGreaterThan(0)
  })

  it('404s for an account that does not exist', async () => {
    const res = await request(server.app.app).get('/api/accounts/TH-9999').expect(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('400s for a malformed id', async () => {
    await request(server.app.app).get('/api/accounts/not-an-id').expect(400)
    await request(server.app.app).get('/api/accounts/1or1=1').expect(400)
  })
})

describe('contact data is safe for a demo', () => {
  it('never exposes a dialable number or deliverable email', async () => {
    const res = await request(server.app.app).get('/api/accounts?limit=500').expect(200)
    for (const account of res.body.data) {
      expect(account.contact.phone).toMatch(/^\+91 00000 \d{5}$/)
      expect(account.contact.email).toMatch(/@demo\.theru\.invalid$/)
      expect(account.website).toBeNull()
      expect(account.contact.demo).toBe(true)
    }
  })
})

describe('districts', () => {
  it('lists 37 districts with rollups', async () => {
    const res = await request(server.app.app).get('/api/districts').expect(200)
    expect(res.body.data).toHaveLength(37)
    const chennai = res.body.data.find((d: { name: string }) => d.name === 'Chennai')
    expect(chennai).toMatchObject({ region: 'North', prospects: 50, signalCount: 152 })
    expect(res.body.data.reduce((s: number, d: { prospects: number }) => s + d.prospects, 0)).toBe(421)
  })

  it('returns a district desk by name or slug', async () => {
    const res = await request(server.app.app).get('/api/districts/Tiruppur').expect(200)
    expect(res.body.data.district.name).toBe('Tiruppur')
    expect(res.body.data.accounts.length).toBe(res.body.data.district.prospects)
    expect(res.body.data.nearby.length).toBe(5)

    const bySlug = await request(server.app.app).get('/api/districts/thiruvarur').expect(200)
    expect(bySlug.body.data.district.name).toBe('Thiruvarur')
  })

  it('404s for an unknown district', async () => {
    const res = await request(server.app.app).get('/api/districts/Atlantis').expect(404)
    expect(res.body.error.code).toBe('not_found')
  })

  it('lists the 12 sectors', async () => {
    const res = await request(server.app.app).get('/api/sectors').expect(200)
    expect(res.body.data).toHaveLength(12)
    expect(res.body.data.reduce((s: number, x: { count: number }) => s + x.count, 0)).toBe(421)
  })
})
