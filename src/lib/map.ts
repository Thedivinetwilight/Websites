import type { DistrictMeta } from './types'

export type MapMetric = 'momentum' | 'accounts' | 'potential' | 'fit'

export const MAP_METRICS: Record<
  MapMetric,
  { label: string; short: string; description: string; from: [number, number, number]; to: [number, number, number]; suffix?: string }
> = {
  momentum: {
    label: 'Momentum',
    short: 'Momentum',
    description: 'How fast business activity is moving in the district this quarter.',
    from: [232, 239, 231],
    to: [13, 95, 77],
  },
  accounts: {
    label: 'Accounts mapped',
    short: 'Accounts',
    description: 'Qualified businesses Theru is tracking in the district.',
    from: [243, 235, 217],
    to: [177, 116, 28],
  },
  potential: {
    label: 'Open potential',
    short: 'Potential',
    description: 'Estimated annual contract value across the district pipeline.',
    from: [241, 232, 226],
    to: [163, 71, 47],
  },
  fit: {
    label: 'Avg. fit score',
    short: 'Fit',
    description: 'Average ideal-customer fit across the district.',
    from: [230, 239, 233],
    to: [23, 119, 95],
  },
}

export function districtMetricValue(name: string, metric: MapMetric, districts: DistrictMeta[]) {
  const d = districts.find((x) => x.name === name)
  if (!d) return 0
  if (metric === 'accounts') return d.prospects
  if (metric === 'potential') return d.potentialL
  if (metric === 'fit') return d.avgScore
  return d.momentum
}

export function metricRange(metric: MapMetric, districts: DistrictMeta[]) {
  const values = districts.map((d) => districtMetricValue(d.name, metric, districts))
  return { min: Math.min(...values), max: Math.max(...values) }
}

/**
 * Choropleths read best when colour is spread across the distribution rather
 * than tied to raw min/max — a single outlier otherwise washes out the state.
 * We resolve the value to its percentile rank, then ease the ends slightly so
 * the extremes stay distinct instead of clipping.
 */
const rankCache = new WeakMap<DistrictMeta[], Map<MapMetric, number[]>>()

export function metricRankT(value: number, metric: MapMetric, districts: DistrictMeta[]) {
  let perMetric = rankCache.get(districts)
  if (!perMetric) {
    perMetric = new Map()
    rankCache.set(districts, perMetric)
  }
  let sorted = perMetric.get(metric)
  if (!sorted) {
    sorted = districts.map((d) => districtMetricValue(d.name, metric, districts)).sort((a, b) => a - b)
    perMetric.set(metric, sorted)
  }
  // percentile rank with mid-point handling for ties
  let below = 0
  let equal = 0
  for (const v of sorted) {
    if (v < value) below += 1
    else if (v === value) equal += 1
    else break
  }
  const t = (below + equal / 2) / Math.max(1, sorted.length - 1)
  return Math.max(0, Math.min(1, t))
}

export function metricColor(
  value: number,
  metric: MapMetric,
  districts: DistrictMeta[],
  range?: { min: number; max: number },
) {
  const t = range
    ? Math.max(0, Math.min(1, (value - range.min) / Math.max(1, range.max - range.min)))
    : metricRankT(value, metric, districts)
  // pull the ends in a touch so the darkest step does not collapse to a single district
  const eased = 0.06 + Math.pow(t, 0.9) * 0.9
  const { from, to } = MAP_METRICS[metric]
  const mix = from.map((f, i) => Math.round(f + (to[i] - f) * Math.min(1, eased)))
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`
}

export function metricLabel(name: string, metric: MapMetric, districts: DistrictMeta[]) {
  const v = districtMetricValue(name, metric, districts)
  if (metric === 'potential') {
    return v >= 100 ? `₹${(v / 100).toFixed(1)} Cr` : `₹${Math.round(v)} L`
  }
  if (metric === 'accounts') return `${v} accounts`
  if (metric === 'fit') return `${v} / 100 fit`
  return `${v} momentum`
}

export function textColorForBackground(value: number, metric: MapMetric, districts: DistrictMeta[]) {
  return metricRankT(value, metric, districts) > 0.6 ? '#f7f2e7' : '#0a1712'
}
