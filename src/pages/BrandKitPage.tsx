import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useDesignSystem } from '../components/system/useDesignSystem'
import { cmykValues, formatColor, readableOn, rgbValues } from '../lib/color'
import { fontStack, googleFontsUrl, loadFonts } from '../lib/fonts'
import { useColorNames } from '../lib/names'
import { autoAnchor, BRAND_ROLES, buildScales, buildTokens, checkPairs, ROLE_INFO, ROLE_KEYS, STATUS_ROLES, STEPS, typeOf, type RoleKey } from '../lib/system'
import { typeScale } from '../lib/typography'
import { buttonSizes, EASINGS, effectsOf, SHADOW_NAMES, shadowCss } from '../lib/effects'

function ColorSpec({ role, hex, big }: { role: RoleKey; hex: string; big?: boolean }) {
  const { name } = useColorNames()
  const { r, g, b } = rgbValues(hex)
  const c = cmykValues(hex)
  return (
    <div className={`bk-color ${big ? 'big' : ''}`}>
      <div className="bk-swatch" style={{ background: hex, color: readableOn(hex) }}>
        <span>{ROLE_INFO[role].label}</span>
      </div>
      <dl>
        <dt>Name</dt>
        <dd>{name(hex) || '—'}</dd>
        <dt>HEX</dt>
        <dd>{hex.toUpperCase()}</dd>
        <dt>RGB</dt>
        <dd>
          {r}, {g}, {b}
        </dd>
        {big && (
          <>
            <dt>CMYK</dt>
            <dd>
              {c.c}, {c.m}, {c.y}, {c.k}
            </dd>
            <dt>HSL</dt>
            <dd>{formatColor(hex, 'hsl').replace(/^hsl\(|\)$/g, '')}</dd>
            <dt>OKLCH</dt>
            <dd>{formatColor(hex, 'oklch').replace(/^oklch\(|\)$/g, '')}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

export default function BrandKitPage() {
  const { sys, update } = useDesignSystem()
  useEffect(() => {
    if (sys) loadFonts([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)
  }, [sys?.fonts.heading, sys?.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!sys) {
    return (
      <div className="page">
        <h1>Brand kit</h1>
        <p className="muted">Create a design system first; the brand kit is built from it.</p>
        <Link className="btn btn-primary" to="/system" style={{ alignSelf: 'flex-start' }}>
          Go to Design system
        </Link>
      </div>
    )
  }

  const scales = buildScales(sys)
  const light = buildTokens(sys, 'light', scales)
  const dark = buildTokens(sys, 'dark', scales)
  const pairs = checkPairs(light).filter((p) => p.pass && /^(text|on-|primary-text|secondary-text|accent-text)/.test(p.fg) && !/hover|surface-raised/.test(p.bg))
  const heading = fontStack(sys.fonts.heading, sys.fonts.meta)
  const body = fontStack(sys.fonts.body, sys.fonts.meta)

  return (
    <div className="page brand-kit">
      <div className="row space-between wrap no-print">
        <Link className="btn" to="/system">
          <Icon name="arrowLeft" size={16} /> Design system
        </Link>
        <Link className="btn" to="/brand-assets" style={{ marginLeft: 'auto' }}>
          Favicon &amp; social images
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="download" size={16} /> Print / save as PDF
        </button>
      </div>

      <header className="bk-cover" style={{ background: light.primary.hex, color: light['on-primary'].hex }}>
        <small>Brand guidelines</small>
        <h1 style={{ fontFamily: heading, color: light['on-primary'].hex }}>{sys.name}</h1>
        <span className="small">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
        <div className="bk-cover-strip">
          {BRAND_ROLES.map((r) => (
            <span key={r} style={{ background: sys.roles[r].hex }} />
          ))}
        </div>
      </header>

      <section>
        <h2>Brand colours</h2>
        <div className="bk-brand">
          {BRAND_ROLES.map((r) => (
            <ColorSpec key={r} role={r} hex={sys.roles[r].hex} big />
          ))}
        </div>
        <h2>Supporting colours</h2>
        <div className="bk-support">
          {(['neutral', ...STATUS_ROLES] as RoleKey[]).map((r) => (
            <ColorSpec key={r} role={r} hex={sys.roles[r].hex} />
          ))}
        </div>
      </section>

      <section className="bk-break">
        <h2>Colour scales</h2>
        <div className="bk-scales">
          {ROLE_KEYS.map((r) => (
            <div key={r} className="bk-scale">
              <span className="bk-scale-name">{ROLE_INFO[r].label}</span>
              <div>
                {scales[r].map((h, i) => (
                  <span key={i} className={i === (sys.roles[r].anchor ?? autoAnchor(sys.roles[r].hex)) ? 'anchor' : ''} style={{ background: h, color: readableOn(h) }}>
                    <b>{STEPS[i]}</b>
                    {h.slice(1).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Accessible pairings</h2>
        <p className="muted small">These text and background combinations meet WCAG 2.2 AA (4.5:1) in light mode.</p>
        <div className="bk-pairs">
          {pairs.map((p) => (
            <div key={`${p.fg}/${p.bg}`} className="bk-pair" style={{ background: light[p.bg].hex, color: light[p.fg].hex }}>
              <b style={{ fontFamily: heading }}>Aa</b>
              <span>{p.label}</span>
              <small>
                {light[p.fg].hex.toUpperCase()} on {light[p.bg].hex.toUpperCase()} · {p.ratio.toFixed(1)}:1
              </small>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Light &amp; dark mode</h2>
        <div className="bk-modes">
          {[
            { label: 'Light', t: light },
            { label: 'Dark', t: dark },
          ].map(({ label, t }) => (
            <div key={label} className="bk-mode" style={{ background: t.bg.hex, color: t.text.hex, borderRadius: sys.radius }}>
              <small style={{ color: t['text-muted'].hex }}>{label} mode</small>
              <h3 style={{ fontFamily: heading, color: t.text.hex }}>Headline example</h3>
              <p style={{ fontFamily: body }}>Body text on the page background, with a <span style={{ color: t['primary-text'].hex, textDecoration: 'underline' }}>link</span>.</p>
              <div className="row wrap">
                <span className="bk-btn" style={{ background: t.primary.hex, color: t['on-primary'].hex, borderRadius: sys.radius }}>
                  Primary
                </span>
                <span className="bk-btn" style={{ background: t.secondary.hex, color: t['on-secondary'].hex, borderRadius: sys.radius }}>
                  Secondary
                </span>
                <span className="bk-btn" style={{ background: t['accent-subtle'].hex, color: t['on-accent-subtle'].hex, borderRadius: sys.radius }}>
                  Accent badge
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bk-break">
        <h2>Typography</h2>
        <div className="bk-type">
          <div>
            <small className="muted">Headings · {sys.fonts.heading}</small>
            <p style={{ fontFamily: heading, fontSize: '2.4rem', fontWeight: 800, margin: '4px 0', lineHeight: 1.1 }}>Aa Bb Cc 123</p>
            <p style={{ fontFamily: heading, fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>The quick brown fox jumps over the lazy dog</p>
          </div>
          <div>
            <small className="muted">Body · {sys.fonts.body}</small>
            <p style={{ fontFamily: body, fontSize: '1.05rem', margin: '6px 0' }}>
              Body text should be easy to read at 16px or larger, with generous line height and enough contrast against its background.
            </p>
            <code className="small">{googleFontsUrl([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)}</code>
          </div>
        </div>
        <h3>Type scale</h3>
        <p className="muted small">
          Fluid sizes from a {typeOf(sys).minVw}px to a {typeOf(sys).maxVw}px wide screen, shown at the size for this window. Make the window narrower to watch them shrink.
        </p>
        <div className="bk-typescale">
          {typeScale(typeOf(sys))
            .filter((t) => t.el)
            .map((t) => (
              <div key={t.step}>
                <span className="muted small">
                  {t.el} · {Math.round(t.min)}–{Math.round(t.max)}px · line height {t.lineHeight}
                </span>
                <p style={{ fontFamily: t.el?.startsWith('h') ? heading : body, fontSize: t.css, overflowWrap: 'break-word', fontWeight: t.el?.startsWith('h') ? 750 : 400, lineHeight: t.lineHeight, margin: 0 }}>
                  {t.el?.startsWith('h') ? 'Heading example' : 'Body text example for paragraphs'}
                </p>
              </div>
            ))}
        </div>
        <h2>Gradient</h2>
        <div className="bk-gradient" style={{ background: `linear-gradient(90deg in oklab, ${sys.roles.primary.hex}, ${sys.roles.secondary.hex}, ${sys.roles.accent.hex})`, borderRadius: sys.radius }} />
        <code className="small">linear-gradient(90deg in oklab, {sys.roles.primary.hex}, {sys.roles.secondary.hex}, {sys.roles.accent.hex})</code>
      </section>

      <section className="bk-break">
        <h2>Shape &amp; motion</h2>
        <h3>Shadows</h3>
        <div className="bk-shadows">
          {SHADOW_NAMES.map((n) => (
            <div key={n} style={{ background: light.surface.hex, color: light.text.hex, borderRadius: sys.radius, boxShadow: shadowCss(sys, n) }}>
              <strong>shadow-{n}</strong>
            </div>
          ))}
        </div>
        <h3>Buttons &amp; inputs</h3>
        <div className="row wrap" style={{ alignItems: 'center' }}>
          {buttonSizes(sys).map((b) => (
            <span key={b.name} className="bk-btn" style={{ minHeight: b.height, padding: `${b.padY}px ${b.padX}px`, fontSize: b.fontPx, borderRadius: sys.radius, background: buildTokens(sys, 'light').primary.hex, color: buildTokens(sys, 'light')['on-primary'].hex, fontFamily: body }}>
              {b.name.toUpperCase()} · {b.height}px
            </span>
          ))}
          <span className="muted small">
            Input height {effectsOf(sys).input}px · borders {effectsOf(sys).borders.thin}/{effectsOf(sys).borders.base}/{effectsOf(sys).borders.thick}px
          </span>
        </div>
        <h3>Motion</h3>
        <p className="small">
          {(['fast', 'base', 'slow'] as const).map((n) => `duration-${n} ${effectsOf(sys).motion[n]}ms`).join(' · ')}
          <br />
          {EASINGS.map((x) => `ease-${x.name}: ${x.css}`).join(' · ')}
        </p>
        <h3>Content widths</h3>
        <p className="small">{(['narrow', 'container', 'wide'] as const).map((n) => `width-${n} ${effectsOf(sys).widths[n]}px`).join(' · ')}</p>
      </section>

      <section>
        <h2>Usage notes</h2>
        <textarea
          className="no-print"
          rows={5}
          value={sys.notes}
          placeholder="e.g. Primary for main calls to action only. Accent sparingly, max one per screen. Never place text directly on the gradient."
          onChange={(e) => update((s) => void (s.notes = e.target.value))}
        />
        <p className="print-only bk-notes">{sys.notes || 'No notes added.'}</p>
      </section>
    </div>
  )
}
