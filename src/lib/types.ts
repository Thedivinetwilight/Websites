export type SignalType = 'growth' | 'hiring' | 'digital' | 'credit' | 'export' | 'energy' | 'compliance'

export interface Signal {
  type: SignalType
  label: string
  date: string
  daysAgo: number
  weight: number
}

export interface Scores {
  fit: number
  momentum: number
  footprint: number
  reach: number
}

export type Stage = 'new' | 'contacted' | 'meeting' | 'customer'

export interface Prospect {
  id: string
  name: string
  sector: string
  subSector: string
  district: string
  locality: string
  employees: number
  revenueCr: number
  foundedYear: number
  scores: Scores
  signals: Signal[]
  contact: { name: string; role: string; email: string; phone: string }
  website: string | null
  owner: string
  status: Stage
  lastTouchDays: number
  potentialL: number
  accountTier: string
  notes: string
  spotlight?: boolean
}

export interface DistrictMeta {
  name: string
  region: 'North' | 'Central' | 'West' | 'South'
  growth: number
  tier: number
  character: string
  prospects: number
  avgScore: number
  momentum: number
  signalCount: number
  potentialL: number
  topSectors: { name: string; count: number }[]
  pulse: number[]
  hotspot: string
}

export interface DistrictRollup extends DistrictMeta {
  savedCount: number
  routeCount: number
  sectorLabel: string
}

export interface GeoProps {
  district: string
  centroid: [number, number]
  bbox: [number, number, number, number]
}

export interface GeoFeature {
  type: 'Feature'
  properties: GeoProps
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] }
}

export interface GeoCollection {
  type: 'FeatureCollection'
  attribution: string
  features: GeoFeature[]
}
