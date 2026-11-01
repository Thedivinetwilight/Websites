import type { Prospect, Scores } from './types'

/**
 * Pure presentation helpers and constants. The actual records (accounts,
 * districts, signals) now arrive from the demo API — see lib/dataset.ts and
 * lib/store.tsx. Nothing here imports seed JSON.
 */

export const OWNERS = ['Priya Raman', 'Karthik Selvam', 'Divya Mani', 'Arun Prakash'] as const

export const REGIONS = ['North', 'Central', 'West', 'South'] as const

export const REGION_NOTES: Record<string, string> = {
  North: 'Chennai and the industrial corridor running south-west towards Bengaluru.',
  Central: 'The Cauvery delta and Trichy belt — agri, cement and distribution.',
  West: 'Coimbatore, Tiruppur and the engineering towns of the Kongu region.',
  South: 'Madurai, the southern districts and the port economies.',
}

/** Weighted score used throughout the workspace. Mirrors the server's stored score. */
export function scoreOf(p: Prospect | Scores | { scores: Scores }): number {
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

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const SIGNAL_META: Record<
  string,
  { label: string; short: string; tone: 'jade' | 'turmeric' | 'clay'; description: string }
> = {
  growth: { label: 'Growth', short: 'Growth', tone: 'jade', description: 'Illustrative expansion and turnover activity' },
  hiring: { label: 'Hiring', short: 'Hiring', tone: 'jade', description: 'Sample headcount and role activity' },
  credit: { label: 'Credit', short: 'Credit', tone: 'turmeric', description: 'Sample facilities and rating activity' },
  export: { label: 'Export', short: 'Export', tone: 'turmeric', description: 'Sample trade and shipment activity' },
  digital: { label: 'Digital', short: 'Digital', tone: 'jade', description: 'Sample web, commerce and ad activity' },
  energy: { label: 'Energy', short: 'Energy', tone: 'turmeric', description: 'Sample solar, audit and utility activity' },
  compliance: { label: 'Compliance', short: 'Compliance', tone: 'clay', description: 'Sample licence and renewal activity' },
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
