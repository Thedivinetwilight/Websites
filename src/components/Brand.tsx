export function BrandMark({ size = 30, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const road = tone === 'light' ? '#f5efe3' : '#0a1712'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5.5 27.5 13 7.5" stroke={road} strokeWidth="2.3" strokeLinecap="round" opacity="0.92" />
      <path d="M26.5 27.5 19 7.5" stroke={road} strokeWidth="2.3" strokeLinecap="round" opacity="0.92" />
      <path d="M8.8 21.5h14.4" stroke={road} strokeWidth="1.3" strokeLinecap="round" opacity="0.32" />
      <path d="M11.6 15.2h8.8" stroke={road} strokeWidth="1.3" strokeLinecap="round" opacity="0.22" />
      <circle cx="16" cy="6.6" r="3.4" fill="#e0a13d" />
    </svg>
  )
}

export function Brand({ compact = false, tone = 'dark' }: { compact?: boolean; tone?: 'light' | 'dark' }) {
  const color = tone === 'light' ? '#f5efe3' : '#0a1712'
  return (
    <span className="brand" style={{ color }}>
      <BrandMark size={compact ? 24 : 27} tone={tone} />
      <span className="brand__word">theru</span>
      {!compact && (
        <>
          <span className="brand__rule" aria-hidden="true" />
          <span className="brand__tamil tamil" aria-hidden="true">
            தெரு
          </span>
        </>
      )}
    </span>
  )
}
