import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Brand } from './Brand'

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#day', label: 'A day with Theru' },
  { href: '#coverage', label: 'Coverage' },
  { href: '#pricing', label: 'Pricing' },
]

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`lp-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="wrap lp-nav__inner">
        <Link to="/" className="lp-nav__brand" aria-label="Theru home">
          <Brand />
        </Link>

        <nav className="lp-nav__links" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="lp-nav__link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="lp-nav__actions">
          <Link to="/app" className="lp-nav__signin">
            Sign in
          </Link>
          <Link to="/app" className="btn btn--sm lp-nav__cta">
            Open the demo <ArrowRight size={14} />
          </Link>
        </div>

        <button
          className="lp-nav__menu icon-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {open && (
        <div className="lp-nav__sheet">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link to="/app" className="btn btn--sm">
            Open the demo <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </header>
  )
}
