import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DistrictMeta, Prospect } from '../src/lib/types.js'

/**
 * Loads the synthetic demo dataset that ships with the frontend.
 *
 * The JSON files in src/data are the single source of truth for seed data.
 * They describe fictional businesses; this module also rewrites the contact
 * details to reserved "never dial" values so a demo record can never be used
 * for real outreach.
 */

export interface SeedDistrict extends DistrictMeta {
  pulse: number[]
  topSectors: { name: string; count: number }[]
}

export interface SeedDefaults {
  saved: string[]
  stageOverrides: Record<string, string>
  notes: Record<string, string>
  route: string[]
  routeDate: string
  following: string[]
}

export interface SeedDataset {
  version: string
  prospects: Prospect[]
  districts: DistrictMeta[]
  months: string[]
  defaults: SeedDefaults
}

/** Reserved, non-dialable numbers. +91 00000 xxxxx is not allocated to anyone. */
export function demoPhone(index: number) {
  return `+91 00000 ${String(index + 1).padStart(5, '0')}`
}

/** RFC 2606 reserved TLD: mail to *.invalid can never be delivered. */
export function demoEmail(name: string) {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
  return `${slug || 'demo.contact'}@demo.theru.invalid`
}

export const DEMO_DEFAULTS: SeedDefaults = {
  saved: ['TH-1000', 'TH-1001', 'TH-1002', 'TH-1003', 'TH-1004', 'TH-1005', 'TH-1007', 'TH-1009', 'TH-1010'],
  stageOverrides: { 'TH-1010': 'contacted' },
  notes: {
    'TH-1000':
      'Sample sent with the capacity model. Asked for a second visit after the Diwali shipment clears — w/c 9 Nov.',
    'TH-1002':
      'Warehouse lease signed in Sriperumbudur. Fleet expansion is the wedge for a first commercial conversation.',
  },
  route: ['TH-1003', 'TH-1002', 'TH-1009'],
  routeDate: '2026-11-03',
  following: ['Chennai', 'Tiruppur', 'Madurai'],
}

function resolveDataDir() {
  const fromEnv = process.env.THERU_DATA_DIR
  if (fromEnv) return path.resolve(fromEnv)
  const here = path.dirname(fileURLToPath(import.meta.url))
  const candidates = [
    path.resolve(here, '../src/data'), // running from server/*.ts with tsx
    path.resolve(here, '../../src/data'), // running from dist-server/server/*.js
    path.resolve(process.cwd(), 'src/data'),
    path.resolve(process.cwd(), '../src/data'),
  ]
  const found = candidates.find((dir) => existsSync(path.join(dir, 'prospects.json')))
  if (!found) {
    throw new Error(`Could not locate src/data (looked in: ${candidates.join(', ')})`)
  }
  return found
}

export function loadSeedDataset(): SeedDataset {
  const dir = resolveDataDir()
  const rawProspects = readFileSync(path.join(dir, 'prospects.json'), 'utf8')
  const rawDistricts = readFileSync(path.join(dir, 'districts.json'), 'utf8')

  const prospects = JSON.parse(rawProspects) as Prospect[]
  const districtFile = JSON.parse(rawDistricts) as { months: string[]; districts: DistrictMeta[] }

  if (!Array.isArray(prospects) || prospects.length !== 421) {
    throw new Error(`Expected 421 synthetic accounts, found ${prospects?.length ?? 0}`)
  }
  if (!Array.isArray(districtFile.districts) || districtFile.districts.length !== 37) {
    throw new Error(`Expected 37 districts, found ${districtFile.districts?.length ?? 0}`)
  }

  const version = createHash('sha256')
    .update(rawProspects)
    .update(rawDistricts)
    .update(JSON.stringify(DEMO_DEFAULTS))
    .digest('hex')
    .slice(0, 12)

  const sanitised = prospects.map((p, index) => ({
    ...p,
    // Keep the shape the UI expects but remove anything that could be dialled
    // or emailed. The fictional contact names and roles remain for realism.
    contact: {
      ...p.contact,
      phone: demoPhone(index),
      email: demoEmail(p.contact.name),
    },
    website: null,
  }))

  return {
    version,
    prospects: sanitised,
    districts: districtFile.districts,
    months: districtFile.months ?? [],
    defaults: DEMO_DEFAULTS,
  }
}
