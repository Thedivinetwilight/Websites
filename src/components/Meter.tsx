export function Meter({
  value,
  max = 100,
  tone = 'jade',
  height = 5,
  label,
}: {
  value: number
  max?: number
  tone?: 'jade' | 'turmeric' | 'clay' | 'ink'
  height?: number
  label?: string
}) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100))
  return (
    <span
      className={`meter meter--${tone}`}
      style={{ height }}
      role="img"
      aria-label={label ?? `${Math.round(pct)} percent`}
    >
      <span className="meter__fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

export function StagePill({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    meeting: 'Meeting',
    customer: 'Customer',
  }
  return <span className={`stage-pill stage-pill--${stage}`}>{map[stage] ?? stage}</span>
}
