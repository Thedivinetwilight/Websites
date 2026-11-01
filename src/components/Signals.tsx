import {
  Globe2,
  Landmark,
  MonitorSmartphone,
  ShieldCheck,
  Ship,
  Sun,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import type { Signal } from '../lib/types'
import { SIGNAL_META, dateLabel } from '../lib/data'

const ICONS: Record<string, typeof TrendingUp> = {
  growth: TrendingUp,
  hiring: UserPlus,
  credit: Landmark,
  export: Ship,
  digital: MonitorSmartphone,
  energy: Sun,
  compliance: ShieldCheck,
}

export function SignalIcon({ type, size = 14 }: { type: string; size?: number }) {
  const Icon = ICONS[type] ?? Globe2
  return (
    <span className={`signal-icon signal-icon--${SIGNAL_META[type]?.tone ?? 'jade'}`}>
      <Icon size={size} strokeWidth={2.1} />
    </span>
  )
}

export function SignalRow({ signal, compact = false }: { signal: Signal; compact?: boolean }) {
  return (
    <li className={`signal-row ${compact ? 'signal-row--compact' : ''}`}>
      <SignalIcon type={signal.type} size={compact ? 12 : 14} />
      <span className="signal-row__body">
        <span className="signal-row__label">{signal.label}</span>
        <span className="signal-row__meta">
          {SIGNAL_META[signal.type]?.label ?? signal.type}
          <span className="signal-row__dot" aria-hidden="true" />
          {dateLabel(signal.date)}
        </span>
      </span>
    </li>
  )
}

export function SignalChips({ signals, max = 3 }: { signals: Signal[]; max?: number }) {
  const types = Array.from(new Set(signals.map((s) => s.type))).slice(0, max)
  return (
    <span className="signal-chips">
      {types.map((t) => (
        <span key={t} className={`signal-chip signal-chip--${SIGNAL_META[t]?.tone ?? 'jade'}`}>
          {SIGNAL_META[t]?.short ?? t}
        </span>
      ))}
    </span>
  )
}
