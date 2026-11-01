export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = 'var(--jade-600)',
  area = false,
  strokeWidth = 1.6,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  area?: boolean
  strokeWidth?: number
}) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = width / (data.length - 1 || 1)
  const pad = strokeWidth + 1
  const points = data.map((d, i) => {
    const x = i * stepX
    const y = pad + (1 - (d - min) / span) * (height - pad * 2)
    return [x, y] as const
  })

  let path = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    const cx = (x0 + x1) / 2
    path += ` C ${cx.toFixed(2)} ${y0.toFixed(2)}, ${cx.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`
  }
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`
  const gid = `spark-${data.slice(0, 4).join('-')}-${Math.round(min)}`

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gid})`} />
        </>
      )}
      <path d={path} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
    </svg>
  )
}
