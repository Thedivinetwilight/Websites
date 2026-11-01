export function ScoreRing({
  value,
  size = 56,
  stroke = 5,
  showLabel = false,
  tone,
}: {
  value: number
  size?: number
  stroke?: number
  showLabel?: boolean
  tone?: 'jade' | 'turmeric' | 'clay'
}) {
  const radius = (size - stroke) / 2
  const pct = Math.max(0, Math.min(100, value))
  const color =
    tone === 'turmeric'
      ? 'var(--turmeric-500)'
      : tone === 'clay'
        ? 'var(--clay-500)'
        : pct >= 78
          ? 'var(--jade-600)'
          : pct >= 66
            ? 'var(--turmeric-500)'
            : 'var(--slate-500)'

  return (
    <span
      className={`score-ring ${showLabel ? 'score-ring--labelled' : ''}`}
      style={{ width: size, height: size }}
      title={`Theru score ${value} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(10,23,18,0.09)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="score-ring__arc"
        />
      </svg>
      <span className="score-ring__value tnum" style={{ fontSize: size * 0.33 }}>
        {value}
      </span>
    </span>
  )
}
