import type { DistrictMeta, Prospect, Stage } from './types'
import { scoreOf, slugify } from './data'

/** One-time derivations shared by every page. Built from the API bootstrap. */

export interface SectorSummary {
  name: string
  count: number
  potentialL: number
  avgScore: number
  growth: number
}

export interface WorkspaceSnapshot {
  saved: string[]
  stages: Record<string, Stage>
  notes: Record<string, string>
  route: string[]
  routeDate: string
  following: string[]
  updatedAt: string | null
}

export interface Totals {
  accounts: number
  districts: number
  signals: number
  sectors: number
  potentialL: number
  employees: number
  savedPotentialL: number
  newSignalsThisMonth: number
}

export interface Dataset {
  prospects: Prospect[]
  districtMeta: DistrictMeta[]
  allDistricts: DistrictMeta[]
  districtByName: Map<string, DistrictMeta>
  sectors: SectorSummary[]
  totals: Totals
  brief: Prospect[]
  topMovers: DistrictMeta[]
  spotlight: Prospect[]
  byId: (id: string | undefined | null) => Prospect | undefined
  accountsIn: (district: string) => Prospect[]
}

export function buildDataset(
  accounts: Prospect[],
  districtMeta: DistrictMeta[],
  brief: Prospect[],
  totals: Totals,
): Dataset {
  const byIdMap = new Map(accounts.map((p) => [p.id, p]))
  const byDistrict = new Map<string, Prospect[]>()
  accounts.forEach((p) => {
    const list = byDistrict.get(p.district) ?? []
    list.push(p)
    byDistrict.set(p.district, list)
  })

  const rolled = districtMeta.map((d) => {
    const rows = byDistrict.get(d.name) ?? []
    const sectorCounts = new Map<string, number>()
    rows.forEach((p) => sectorCounts.set(p.sector, (sectorCounts.get(p.sector) ?? 0) + 1))
    const topSector = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    return {
      ...d,
      prospects: rows.length,
      potentialL: Math.round(rows.reduce((s, p) => s + p.potentialL, 0) * 10) / 10,
      signalCount: rows.reduce((s, p) => s + p.signals.length, 0),
      sectorLabel: topSector ? topSector[0] : 'Diversified',
    }
  })

  const allDistricts = rolled.slice().sort((a, b) => b.momentum - a.momentum)

  const sectors = Array.from(new Set(accounts.map((p) => p.sector)))
    .map((name) => {
      const rows = accounts.filter((p) => p.sector === name)
      return {
        name,
        count: rows.length,
        potentialL: Math.round(rows.reduce((s, p) => s + p.potentialL, 0)),
        avgScore: Math.round(rows.reduce((s, p) => s + scoreOf(p), 0) / rows.length),
        growth: Math.round(rows.reduce((s, p) => s + p.scores.momentum, 0) / rows.length),
      }
    })
    .sort((a, b) => b.count - a.count)

  return {
    prospects: accounts,
    districtMeta: rolled,
    allDistricts,
    districtByName: new Map(rolled.map((d) => [d.name, d])),
    sectors,
    totals,
    brief,
    topMovers: allDistricts
      .slice()
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5),
    spotlight: accounts.filter((p) => p.spotlight),
    byId: (id) => (id ? byIdMap.get(id) : undefined),
    accountsIn: (district) => byDistrict.get(district) ?? [],
  }
}

/** District slug → district, used by the dynamic district route. */
export function districtBySlug(dataset: Dataset, slug: string | undefined) {
  if (!slug) return undefined
  return dataset.allDistricts.find((d) => slugify(d.name) === slug)
}
