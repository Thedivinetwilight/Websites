import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article' | 'figure'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setSeen(true)
            obs.disconnect()
          }
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  const Tag = as as 'div'
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${seen ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

export function CountUp({
  value,
  duration = 900,
  format = (n: number) => Math.round(n).toLocaleString('en-IN'),
  suffix = '',
  prefix = '',
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  suffix?: string
  prefix?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [display, setDisplay] = useState(value)
  const started = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - t, 3)
          setDisplay(value * eased)
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        obs.disconnect()
      },
      { threshold: 0.4 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [value, duration])

  return (
    <span ref={ref} className="tnum">
      {prefix}
      {format(display)}
      {suffix}
    </span>
  )
}
