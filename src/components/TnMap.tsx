import { useMemo, useRef, useState } from 'react'
import { geo } from '../lib/geo'
import { useDataset } from '../lib/store'
import {
  MAP_METRICS,
  districtMetricValue,
  metricColor,
  metricLabel,
  metricRange,
  type MapMetric,
} from '../lib/map'

const LABEL_PRIORITY = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruppur',
  'Salem',
  'Tiruchirappalli',
  'Vellore',
  'Erode',
  'Tirunelveli',
  'Thanjavur',
  'Kanyakumari',
  'Nilgiris',
  'Dharmapuri',
  'Krishnagiri',
  'Virudhunagar',
  'Cuddalore',
]

interface TnMapProps {
  metric?: MapMetric
  selected?: string | null
  highlight?: string | null
  /** Dim everything except these districts. */
  highlightSet?: string[]
  dimOthers?: boolean
  onSelect?: (district: string) => void
  showLabels?: boolean
  showTooltip?: boolean
  className?: string
  interactive?: boolean
  ariaLabel?: string
  markers?: { district: string; label?: string }[]
}

export function TnMap({
  metric = 'momentum',
  selected = null,
  highlight = null,
  highlightSet,
  dimOthers = false,
  onSelect,
  showLabels = true,
  showTooltip = true,
  className = '',
  interactive = true,
  ariaLabel = 'Map of Tamil Nadu districts',
  markers = [],
}: TnMapProps) {
  const districts = useDataset().allDistricts
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null)

  const { width, height, paths, labels, range, centres } = useMemo(() => {
    const points: [number, number][] = []
    let minLng = Infinity
    let maxLng = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity

    for (const f of geo.features) {
      for (const poly of f.geometry.coordinates) {
        for (const ring of poly) {
          for (const [lng, lat] of ring) {
            if (lng < minLng) minLng = lng
            if (lng > maxLng) maxLng = lng
            if (lat < minLat) minLat = lat
            if (lat > maxLat) maxLat = lat
            points.push([lng, lat])
          }
        }
      }
    }

    const midLat = (minLat + maxLat) / 2
    const latScale = Math.cos((midLat * Math.PI) / 180)
    const pad = 22
    const rawW = (maxLng - minLng) * latScale
    const rawH = maxLat - minLat
    const innerW = 430
    const scale = innerW / rawW
    const w = 430 + pad * 2
    const h = rawH * scale + pad * 2
    const project = ([lng, lat]: number[]) => [
      pad + (lng - minLng) * latScale * scale,
      pad + (maxLat - lat) * scale,
    ]

    const paths = geo.features.map((f) => {
      let d = ''
      for (const poly of f.geometry.coordinates) {
        for (const ring of poly) {
          ring.forEach(([lng, lat], i) => {
            const [x, y] = project([lng, lat])
            d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
          })
          d += 'Z'
        }
      }
      const [cx, cy] = project(f.properties.centroid)
      const bboxW = (f.properties.bbox[2] - f.properties.bbox[0]) * latScale * scale
      const bboxH = (f.properties.bbox[3] - f.properties.bbox[1]) * scale
      return {
        name: f.properties.district,
        d,
        cx,
        cy,
        area: bboxW * bboxH,
        w: bboxW,
        h: bboxH,
      }
    })

    // Label placement: bigger districts and priority towns first, then greedily
    // drop labels that would collide with one already placed. Keeps the dense
    // northern belt readable at every map size.
    const candidates = paths
      .filter((p) => p.area > 380 || LABEL_PRIORITY.includes(p.name))
      .sort((a, b) => {
        const pa = LABEL_PRIORITY.includes(a.name)
        const pb = LABEL_PRIORITY.includes(b.name)
        if (pa !== pb) return pa ? 1 : -1
        return b.area - a.area
      })

    const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
    const labels = []
    for (const p of candidates) {
      const fontSize = p.area < 700 ? 7.6 : 9.4
      const halfW = (p.name.length * fontSize * 0.56) / 2 + 1.5
      const halfH = fontSize / 2 + 1.5
      // Try the centroid first, then small nudges: up, down, and out over the
      // coast. The first spot that clears the frame and other labels wins.
      const offsets = [
        [0, 0],
        [0, -fontSize * 1.25],
        [0, fontSize * 1.25],
        [-halfW * 0.9, -fontSize * 1.1],
        [halfW * 0.9, -fontSize * 1.1],
        [halfW * 1.2, 0],
        [-halfW * 1.2, 0],
      ]
      let picked: { x: number; y: number; box: typeof placed[number] } | null = null
      for (const [dx, dy] of offsets) {
        const x = p.cx + dx
        const y = p.cy + dy
        if (x - halfW < 2 || x + halfW > w - 2 || y - halfH < 2 || y + halfH > h - 2) continue
        const box = { x0: x - halfW, x1: x + halfW, y0: y - halfH, y1: y + halfH }
        const collides = placed.some(
          (b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0,
        )
        if (collides) continue
        picked = { x, y, box }
        break
      }
      if (!picked) continue
      placed.push(picked.box)
      labels.push({ ...p, cx: picked.x, cy: picked.y })
    }

    const centres = new Map(paths.map((p) => [p.name, { x: p.cx, y: p.cy }]))

    return { width: w, height: h, paths, labels, range: metricRange(metric, districts), centres }
  }, [metric, districts])

  const handleMove = (name: string) => (e: React.MouseEvent) => {
    if (!showTooltip) return
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ name, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div className={`tnmap ${className}`} ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role={interactive ? 'group' : 'img'}
        aria-label={ariaLabel}
        className="tnmap__svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <g className="tnmap__districts">
          {paths.map((p) => {
            const value = districtMetricValue(p.name, metric, districts)
            const isSelected = selected === p.name
            const isDim = highlightSet?.length
              ? !highlightSet.includes(p.name)
              : highlight
                ? highlight !== p.name
                : false
            return (
              <g
                key={p.name}
                className={`tnmap__district ${isSelected ? 'is-selected' : ''} ${isDim ? 'is-dim' : ''}`}
                tabIndex={interactive ? 0 : -1}
                role={interactive ? 'button' : undefined}
                aria-label={`${p.name}: ${metricLabel(p.name, metric, districts)}`}
                onMouseEnter={handleMove(p.name)}
                onMouseMove={handleMove(p.name)}
                onMouseLeave={() => setHover(null)}
                onClick={() => interactive && onSelect?.(p.name)}
                onKeyDown={(e) => {
                  if (!interactive) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect?.(p.name)
                  }
                }}
              >
                <path d={p.d} fill={metricColor(value, metric, districts, range)} stroke="#f5efe3" strokeWidth="1" />
              </g>
            )
          })}
        </g>
        {showLabels && (
          <g className="tnmap__labels" aria-hidden="true">
            {labels.map((l) => (
              <text
                key={l.name}
                x={l.cx}
                y={l.cy}
                textAnchor="middle"
                className={`tnmap__label ${l.area < 700 ? 'tnmap__label--sm' : ''} ${
                  selected === l.name ? 'is-selected' : ''
                }`}
                style={{
                  opacity: dimOthers && highlight && highlight !== l.name ? 0.15 : 1,
                }}
              >
                {l.name}
              </text>
            ))}
          </g>
        )}
      {markers.length > 0 && (
        <g className="tnmap__markers" aria-hidden="true">
          {markers.map((m, i) => {
            const c = centres.get(m.district)
            if (!c) return null
            // Two stops can sit in the same district; fan the pins apart so
            // both numbers stay legible.
            const siblings = markers.filter((x) => x.district === m.district)
            const slot = siblings.findIndex((x) => x === m)
            let dx = 0
            let dy = 0
            if (siblings.length > 1) {
              const angle = (Math.PI * 2 * slot) / siblings.length - Math.PI / 2
              dx = Math.cos(angle) * 11
              dy = Math.sin(angle) * 11
            }
            return (
              <g key={`${m.district}-${i}`} transform={`translate(${c.x + dx} ${c.y + dy})`}>
                <circle r={m.label ? 10 : 7} fill="#0c1b15" stroke="#f5efe3" strokeWidth="2" />
                {m.label && (
                  <text textAnchor="middle" y="3.6" className="tnmap__marker-label">
                    {m.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      )}
      </svg>

      {showTooltip && hover && (
        <div
          className="tnmap__tip"
          style={{ left: hover.x, top: hover.y }}
          role="presentation"
        >
          <span className="tnmap__tip-name">{hover.name}</span>
          <span className="tnmap__tip-metric">{metricLabel(hover.name, metric, districts)}</span>
          {interactive && <span className="tnmap__tip-cta">Open district →</span>}
        </div>
      )}
    </div>
  )
}

export function MapLegend({
  metric,
  className = '',
  compact = false,
}: {
  metric: MapMetric
  className?: string
  compact?: boolean
}) {
  const districts = useDataset().allDistricts
  const range = metricRange(metric, districts)
  const stops = 5
  const gradient = Array.from({ length: stops }, (_, i) => {
    const v = range.min + ((range.max - range.min) * i) / (stops - 1)
    return metricColor(v, metric, districts, range)
  }).join(', ')
  return (
    <div className={`map-legend ${className}`}>
      {!compact && <span className="map-legend__label">{MAP_METRICS[metric].label}</span>}
      <span className="map-legend__scale" style={{ background: `linear-gradient(90deg, ${gradient})` }} />
      <span className="map-legend__ends tnum">
        <span>low</span>
        <span>high</span>
      </span>
    </div>
  )
}
