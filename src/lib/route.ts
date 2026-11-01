import type { Prospect } from './types'
import { geo } from './geo'

const centroids = new Map(geo.features.map((f) => [f.properties.district, f.properties.centroid]))

export const VISIT_MINUTES = 55
export const BREAK_MINUTES = 40
export const START_MINUTES = 9 * 60 + 15
export const BREAK_AFTER_MINUTES = 13 * 60 // unpaid lunch window opens at 13:00

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const lat1 = (a[1] * Math.PI) / 180
  const lat2 = (b[1] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function legKm(from: Prospect, to: Prospect) {
  if (from.district === to.district) {
    return from.locality === to.locality ? 5 : 11
  }
  const a = centroids.get(from.district)
  const b = centroids.get(to.district)
  if (!a || !b) return 45
  return Math.max(18, Math.round(haversineKm(a, b) * 1.25))
}

export function legMinutes(km: number) {
  // Mixed urban / highway driving, door to door, including parking.
  return Math.max(8, Math.min(210, Math.round(km * 1.55 + 6)))
}

export interface RouteStop {
  prospect: Prospect
  arrive: number
  leave: number
  legKm: number
  legMin: number
  /** Set when the rep should take a break before this stop. */
  breakMin?: number
  /** Clock minute the break starts (only when breakMin is set). */
  breakStart?: number
}

/** Build the day from already-resolved accounts (order = visit order). */
export function planRoute(stops: Prospect[], startMinutes = START_MINUTES) {

  let cursor = startMinutes
  let totalKm = 0
  let totalMinutes = 0
  let breaks = 0
  const planned: RouteStop[] = stops.map((p, i) => {
    const prev = i > 0 ? stops[i - 1] : null
    const km = prev ? legKm(prev, p) : 0
    const mins = prev ? legMinutes(km) : 0
    cursor += mins
    totalKm += km
    totalMinutes += mins + VISIT_MINUTES
    let breakMin: number | undefined
    let breakStart: number | undefined
    if (cursor >= BREAK_AFTER_MINUTES && breaks === 0 && i > 0) {
      breakMin = BREAK_MINUTES
      breakStart = cursor
      breaks += 1
      cursor += BREAK_MINUTES
      totalMinutes += BREAK_MINUTES
    }
    const arrive = cursor
    const leave = arrive + VISIT_MINUTES
    cursor = leave
    return { prospect: p, arrive, leave, legKm: km, legMin: mins, breakMin, breakStart }
  })

  return {
    stops: planned,
    totalKm,
    /** Door to door, including the lunch break. */
    totalMinutes,
    breakMinutes: breaks * BREAK_MINUTES,
    endMinutes: planned.length ? planned[planned.length - 1].leave : startMinutes,
  }
}

export function clock(minutes: number) {
  const h24 = Math.floor(minutes / 60) % 24
  const m = Math.round(minutes % 60)
  const suffix = h24 >= 12 ? 'pm' : 'am'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

export function isLongDay(totalKm: number, stops: number) {
  return stops >= 3 && totalKm > 180
}

export function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  return `${h} hr${h > 1 ? 's' : ''}${m ? ` ${m} min` : ''}`
}

export function dateLabelLong(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}
