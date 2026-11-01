import prospectJson from '../data/prospects.json'
import districtJson from '../data/districts.json'
import geoJson from '../data/geo.json'
import type { DistrictMeta, GeoCollection, Prospect, Scores } from './types'

export const prospects = prospectJson as unknown as Prospect[]
export const districtMeta = (districtJson as unknown as { months: string[]; districts: DistrictMeta[] }).districts
export const months = (districtJson as unknown as { months: string[]; districts: DistrictMeta[] }).months
export const geo = geoJson as unknown as GeoCollection

export const OWNERS = ['Priya Raman', 'Karthik Selvam', 'Divya Mani', 'Arun Prakash'] as const

export const REGIONS = ['North', 'Central', 'West', 'South'] as const

export const REGION_NOTES: Record<string, string> = {
  North: 'Chennai and the industrial corridor running south-west towards Bengaluru.',
  Central: 'The Cauvery delta and Trichy belt — agri, cement and distribution.',
  West: 'Coimbatore, Tiruppur and the engineering towns of the Kongu region.',
  South: 'Madurai, the southern districts and the port economies.',
}

/** Weighted score used throughout the workspace. */
export function scoreOf(p: Prospect | Scores): number {
  const s = 'scores' in p ? p.scores : p
  return Math.round(s.fit * 0.32 + s.momentum * 0.3 + s.footprint * 0.22 + s.reach * 0.16)
}

export function scoreBreakdown(s: Scores) {
  return [
    { key: 'fit', label: 'Ideal customer fit', value: s.fit, weight: 32 },
    { key: 'momentum', label: 'Momentum', value: s.momentum, weight: 30 },
    { key: 'footprint', label: 'Operating footprint', value: s.footprint, weight: 22 },
    { key: 'reach', label: 'Reachability', value: s.reach, weight: 16 },
  ]
}

export function signalStrength(p: Prospect): number {
  const recent = p.signals.filter((s) => s.daysAgo <= 45)
  const weighted = recent.reduce((sum, s) => sum + s.weight, 0)
  return Math.min(100, Math.round(weighted * 1.55))
}

export function byId(id: string | undefined | null): Prospect | undefined {
  if (!id) return undefined
  return prospects.find((p) => p.id === id)
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const districtByName = new Map(districtMeta.map((d) => [d.name, d]))

export function districtRollup(name: string) {
  const d = districtByName.get(name)
  const rows = prospects.filter((p) => p.district === name)
  const sectorCounts = new Map<string, number>()
  rows.forEach((p) => sectorCounts.set(p.sector, (sectorCounts.get(p.sector) || 0) + 1))
  const topSector = [...sectorCounts.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    ...(d as DistrictMeta),
    prospects: rows.length,
    potentialL: rows.reduce((s, p) => s + p.potentialL, 0),
    signalCount: rows.reduce((s, p) => s + p.signals.length, 0),
    sectorLabel: topSector ? topSector[0] : 'Diversified',
  }
}

export const allDistricts = districtMeta
  .map((d) => ({ ...d, ...districtRollup(d.name) }))
  .sort((a, b) => b.momentum - a.momentum)

export const SECTORS = Array.from(new Set(prospects.map((p) => p.sector)))
  .map((name) => {
    const rows = prospects.filter((p) => p.sector === name)
    return {
      name,
      count: rows.length,
      potentialL: Math.round(rows.reduce((s, p) => s + p.potentialL, 0)),
      avgScore: Math.round(rows.reduce((s, p) => s + scoreOf(p), 0) / rows.length),
      growth: Math.round(rows.reduce((s, p) => s + p.scores.momentum, 0) / rows.length),
    }
  })
  .sort((a, b) => b.count - a.count)

export const TOTALS = {
  accounts: prospects.length,
  districts: districtMeta.length,
  signals: prospects.reduce((s, p) => s + p.signals.length, 0),
  sectors: SECTORS.length,
  potentialL: Math.round(prospects.reduce((s, p) => s + p.potentialL, 0)),
  employees: prospects.reduce((s, p) => s + p.employees, 0),
  savedPotentialL: Math.round(
    prospects.filter((p) => p.spotlight).reduce((s, p) => s + p.potentialL, 0),
  ),
  newSignalsThisMonth: prospects.reduce(
    (s, p) => s + p.signals.filter((x) => x.daysAgo <= 30).length,
    0,
  ),
}

export const SPOTLIGHT = prospects.filter((p) => p.spotlight)

/** Accounts surfaced in the morning brief, in a deliberate demo order. */
export const BRIEF_IDS = [
  'TH-1000', // Anandhaa Knitwear
  'TH-1001', // Meenakshi Diagnostics
  'TH-1003', // Vanathi Technologies
  'TH-1004', // Sakthi Pumps
  'TH-1002', // Sri Velan Logistics
  'TH-1007', // Kurinji Retreat
]

export const briefAccounts = BRIEF_IDS.map((id) => byId(id)).filter(Boolean) as Prospect[]

export const TOP_MOVERS = allDistricts
  .slice()
  .sort((a, b) => b.growth - a.growth)
  .slice(0, 5)

export const SIGNAL_META: Record<
  string,
  { label: string; short: string; tone: 'jade' | 'turmeric' | 'clay'; description: string }
> = {
  growth: { label: 'Growth', short: 'Growth', tone: 'jade', description: 'Registrations, turnover and expansion' },
  hiring: { label: 'Hiring', short: 'Hiring', tone: 'jade', description: 'Open roles and headcount movement' },
  credit: { label: 'Credit', short: 'Credit', tone: 'turmeric', description: 'Facilities, filings and ratings' },
  export: { label: 'Export', short: 'Export', tone: 'turmeric', description: 'IEC activity and shipment records' },
  digital: { label: 'Digital', short: 'Digital', tone: 'jade', description: 'Web, commerce and ad activity' },
  energy: { label: 'Energy', short: 'Energy', tone: 'turmeric', description: 'Solar, audits and utility filings' },
  compliance: { label: 'Compliance', short: 'Compliance', tone: 'clay', description: 'Licences, filings and renewals' },
}

export function daysLabel(days: number) {
  if (days <= 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return `${Math.round(days / 7)} weeks ago`
}

export function dateLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 })

export function inrLakhs(lakhs: number) {
  if (lakhs >= 100) return `₹${inr.format(Math.round((lakhs / 100) * 10) / 10)} Cr`
  return `₹${inr.format(Math.round(lakhs))} L`
}

export function compact(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export const OWNER_COLORS: Record<string, string> = {
  'Priya Raman': '#0e6653',
  'Karthik Selvam': '#a3472f',
  'Divya Mani': '#8a5a12',
  'Arun Prakash': '#33556b',
}
