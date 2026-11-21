import { useEffect, useRef, useState } from 'react'
import { normalizeHex } from '../../lib/color'
import { fontStack } from '../../lib/fonts'
import { allTokenNames, bucketOf, buildTokens, typeOf, type Bucket, type DesignSystem, type Mode, type Tokens } from '../../lib/system'
import { spaceScale, typeScale } from '../../lib/typography'

export function tokenVars(t: Tokens, sys: DesignSystem): React.CSSProperties {
  const v: Record<string, string> = {}
  allTokenNames().forEach((n) => (v[`--${n}`] = t[n].hex))
  v['--font-heading'] = fontStack(sys.fonts.heading, sys.fonts.meta)
  v['--font-body'] = fontStack(sys.fonts.body, sys.fonts.meta)
  v['--radius'] = `${sys.radius}px`
  // fluid type: semantic element sizes from the scale, plus spacing
  const ts = typeOf(sys)
  typeScale(ts).forEach((st) => {
    if (st.el) v[`--fs-${st.el}`] = st.css
    v[`--step-${st.step}`] = st.css
  })
  spaceScale(ts).forEach((sp) => (v[`--space-${sp.name}`] = sp.css))
  return v as React.CSSProperties
}

/** Area each background token covers in the preview: elements' own painted area, minus nested painted children. */
function measureCoverage(root: HTMLElement, tokens: Tokens): Record<Bucket, number> & { byToken: [string, number][] } {
  // later names win ties, so list generic tokens first
  const lookup = new Map<string, string>()
  allTokenNames().forEach((n) => lookup.set(tokens[n].hex, lookup.get(tokens[n].hex) ?? n))
  const area = new Map<string, number>()
  const painted = (el: Element) => {
    const bg = getComputedStyle(el).backgroundColor
    if (!bg || bg === 'transparent' || /rgba\(.*,\s*0\)$/.test(bg)) return null
    return normalizeHex(bg)
  }
  const nearestPainted = (el: Element): Element[] =>
    [...el.children].flatMap((c) => (painted(c) ? [c] : nearestPainted(c)))
  const visit = (el: Element) => {
    const hex = painted(el)
    const rect = el.getBoundingClientRect()
    if (hex) {
      const inner = nearestPainted(el).reduce((s, c) => {
        const r = c.getBoundingClientRect()
        return s + r.width * r.height
      }, 0)
      const own = Math.max(0, rect.width * rect.height - inner)
      const name = lookup.get(hex) ?? 'other'
      area.set(name, (area.get(name) ?? 0) + own)
    }
    ;[...el.children].forEach(visit)
  }
  visit(root)
  const total = [...area.values()].reduce((a, b) => a + b, 0) || 1
  const buckets: Record<Bucket, number> = { dominant: 0, secondary: 0, accent: 0 }
  area.forEach((a, name) => (buckets[name === 'other' ? 'secondary' : bucketOf(name)] += a / total))
  return { ...buckets, byToken: [...area.entries()].map(([n, a]) => [n, a / total] as [string, number]).sort((a, b) => b[1] - a[1]) }
}

function Site() {
  return (
    <div className="pv-site">
      <nav className="pv-nav">
        <b className="pv-logo">◆ Northwind</b>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Features
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Pricing
        </a>
        <a href="#" onClick={(e) => e.preventDefault()}>
          Blog
        </a>
        <button className="pv-btn pv-primary small">Get started</button>
      </nav>

      <header className="pv-hero">
        <span className="pv-badge pv-accent-badge">New · Version 2.0</span>
        <h1>Build beautiful websites faster</h1>
        <p>A design system keeps every page consistent. Try hovering, clicking and tabbing through these controls to see real states.</p>
        <div className="pv-actions">
          <button className="pv-btn pv-primary">Primary action</button>
          <button className="pv-btn pv-secondary">Secondary</button>
          <button className="pv-btn pv-outline">Outline</button>
          <button className="pv-btn pv-ghost">Ghost</button>
          <button className="pv-btn pv-primary" disabled>
            Disabled
          </button>
        </div>
      </header>

      <section className="pv-cards">
        {[
          ['Fast setup', 'success', 'Live'],
          ['Accessible', 'info', 'AA'],
          ['Flexible', 'warning', 'Beta'],
        ].map(([t, s, b]) => (
          <article key={t} className="pv-card">
            <div className="row space-between">
              <h3>{t}</h3>
              <span className={`pv-badge pv-${s}-badge`}>{b}</span>
            </div>
            <p>Thoughtful defaults with room to customise every detail of your brand.</p>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Learn more →
            </a>
          </article>
        ))}
      </section>

      <section className="pv-split">
        <form className="pv-form" onSubmit={(e) => e.preventDefault()}>
          <h3>Contact us</h3>
          <label>
            Name
            <input placeholder="Jane Doe" />
          </label>
          <label>
            Email
            <input className="invalid" defaultValue="jane@" aria-invalid="true" />
            <small className="pv-error-text">Please enter a valid email address.</small>
          </label>
          <label>
            Company (locked)
            <input disabled defaultValue="Northwind" />
          </label>
          <label className="pv-check">
            <input type="checkbox" defaultChecked /> Send me product updates
          </label>
          <button className="pv-btn pv-primary">Send message</button>
        </form>
        <div className="pv-alerts">
          <div className="pv-alert pv-success">
            <b>Saved.</b> Your changes are live.
          </div>
          <div className="pv-alert pv-info">
            <b>Tip:</b> Press Tab to move between fields.
          </div>
          <div className="pv-alert pv-warning">
            <b>Heads up:</b> Your trial ends in 3 days.
          </div>
          <div className="pv-alert pv-error">
            <b>Error:</b> We couldn't process the payment.
          </div>
          <div className="pv-table">
            {[
              ['Starter', '€9', 'success', 'Active'],
              ['Pro', '€29', 'warning', 'Trial'],
              ['Team', '€79', 'error', 'Overdue'],
            ].map(([p, v, s, l]) => (
              <div key={p} className="pv-tr">
                <span>{p}</span>
                <span>{v}</span>
                <span className={`pv-badge pv-${s}-badge`}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pv-cta">
        <h2>Ready when you are</h2>
        <button className="pv-btn pv-on-secondary">Start free trial</button>
      </section>

      <footer className="pv-footer">© 2026 Northwind · Privacy · Terms</footer>
    </div>
  )
}

export function PreviewTab({ sys, mode }: { sys: DesignSystem; mode: Mode }) {
  const tokens = buildTokens(sys, mode)
  const ref = useRef<HTMLDivElement>(null)
  const [cov, setCov] = useState<ReturnType<typeof measureCoverage> | null>(null)

  useEffect(() => {
    const t = setTimeout(() => ref.current && setCov(measureCoverage(ref.current, tokens)), 50)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys, mode])

  const target: Record<Bucket, number> = { dominant: 0.6, secondary: 0.3, accent: 0.1 }
  const verdict = (b: Bucket) => {
    if (!cov) return ''
    const d = cov[b] - target[b]
    return Math.abs(d) <= 0.1 ? 'on target' : d > 0 ? 'too much' : 'too little'
  }

  return (
    <div className="stack">
      {cov && (
        <div className="rule-card">
          <div className="row space-between wrap">
            <h3 style={{ margin: 0 }}>60-30-10 check</h3>
            <span className="muted small">Measured from the painted area of this preview</span>
          </div>
          <div className="rule-bar" role="img" aria-label={`Dominant ${Math.round(cov.dominant * 100)}%, secondary ${Math.round(cov.secondary * 100)}%, accent ${Math.round(cov.accent * 100)}%`}>
            <span className="rb-dominant" style={{ width: `${cov.dominant * 100}%`, background: tokens.surface.hex }} />
            <span className="rb-secondary" style={{ width: `${cov.secondary * 100}%`, background: tokens.secondary.hex }} />
            <span className="rb-accent" style={{ width: `${cov.accent * 100}%`, background: tokens.primary.hex }} />
          </div>
          <div className="rule-legend">
            {(['dominant', 'secondary', 'accent'] as Bucket[]).map((b) => (
              <div key={b}>
                <strong>
                  {Math.round(cov[b] * 100)}% {b}
                </strong>
                <span className="muted small">
                  {' '}
                  target {target[b] * 100}% · {verdict(b)}
                </span>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Dominant = backgrounds and surfaces · Secondary = secondary colour, raised surfaces, dark sections · Accent = primary, accent and status colours. A rough guide, not a law.
          </p>
        </div>
      )}
      <div className="pv-frame" ref={ref} style={tokenVars(tokens, sys)} data-mode={mode}>
        <Site />
      </div>
    </div>
  )
}
