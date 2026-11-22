import { useState } from 'react'
import { buttonSizes, DEFAULT_EFFECTS, EASINGS, effectsCss, effectsOf, SHADOW_NAMES, shadowCss, type EffectSettings, type ShadowTint } from '../../lib/effects'
import { buildTokens, type DesignSystem, type Mode } from '../../lib/system'
import { fontStack } from '../../lib/fonts'
import { CodeBlock, Segmented } from '../ui'
import { NumberField } from './TypeTab'

type Update = (fn: (s: DesignSystem) => void) => void

/** Shadows, borders, button/input sizes, motion and content widths. */
export function EffectsTab({ sys, mode, update }: { sys: DesignSystem; mode: Mode; update: Update }) {
  const e = effectsOf(sys)
  const t = buildTokens(sys, mode)
  const set = (fn: (x: EffectSettings) => void) =>
    update((s) => {
      const next = structuredClone(effectsOf(s))
      fn(next)
      s.effects = next
    })
  const [play, setPlay] = useState(0)
  const sizes = buttonSizes(sys)
  const frame: React.CSSProperties = { background: t.bg.hex, color: t.text.hex, fontFamily: fontStack(sys.fonts.body, sys.fonts.meta) }

  return (
    <div className="stack fx-tab">
      <p className="muted small" style={{ margin: 0 }}>
        The finishing details of the design system. They go into the token exports, the Divi import file (as variables and button size presets) and the CSS for Divi.
      </p>

      <section className="fx-section">
        <div className="fx-head">
          <h2>Shadows</h2>
          <div className="row wrap">
            <Segmented
              label="Shadow colour"
              value={e.shadowTint}
              onChange={(v: ShadowTint) => set((x) => (x.shadowTint = v))}
              options={[
                { id: 'brand', label: 'Brand tint' },
                { id: 'neutral', label: 'Neutral' },
                { id: 'black', label: 'Black' },
              ]}
            />
            <label className="field fx-range">
              <span className="field-label">Strength {e.shadowStrength.toFixed(1)}×</span>
              <input type="range" min={0.5} max={2} step={0.1} value={e.shadowStrength} onChange={(ev) => set((x) => (x.shadowStrength = Number(ev.target.value)))} />
            </label>
          </div>
        </div>
        <div className="fx-stage" style={frame}>
          {SHADOW_NAMES.map((n) => (
            <div key={n} className="fx-shadow-card" style={{ background: t.surface.hex, boxShadow: shadowCss(sys, n, mode), borderRadius: sys.radius }}>
              <strong>shadow-{n}</strong>
              <span style={{ color: t['text-muted'].hex }}>{{ sm: 'Cards, inputs', md: 'Raised cards, dropdowns', lg: 'Hover, popovers', xl: 'Modals, hero cards' }[n]}</span>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          A brand tint makes shadows feel part of the palette instead of grey smudges. In dark mode shadows are black and stronger, because a tint barely shows on dark backgrounds.
        </p>
      </section>

      <section className="fx-section">
        <div className="fx-head">
          <h2>Borders, buttons and inputs</h2>
        </div>
        <div className="fx-fields">
          {(['thin', 'base', 'thick'] as const).map((n) => (
            <NumberField key={n} label={`Border ${n}`} value={e.borders[n]} min={0} max={12} onChange={(v) => set((x) => (x.borders[n] = v))} />
          ))}
          {(['s', 'm', 'l'] as const).map((n) => (
            <NumberField key={n} label={`Button ${n.toUpperCase()} height`} value={e.buttons[n]} min={24} max={80} onChange={(v) => set((x) => (x.buttons[n] = v))} />
          ))}
          <NumberField label="Input height" value={e.input} min={28} max={72} onChange={(v) => set((x) => (x.input = v))} />
        </div>
        <div className="fx-stage fx-buttons" style={frame}>
          {sizes.map((b) => (
            <button
              key={b.name}
              type="button"
              className="fx-btn"
              style={{ minHeight: b.height, padding: `${b.padY}px ${b.padX}px`, fontSize: b.fontPx, background: t.primary.hex, color: t['on-primary'].hex, borderRadius: sys.radius, border: `${e.borders.base}px solid ${t.primary.hex}` }}
            >
              Button {b.name.toUpperCase()}
            </button>
          ))}
          <input className="fx-input" placeholder="Input field" style={{ height: e.input, borderRadius: Math.round(sys.radius * 0.7), border: `${e.borders.thin}px solid ${t['border-strong'].hex}`, background: t.bg.hex, color: t.text.hex }} aria-label="Sample input" />
          <div className="fx-borders">
            {(['thin', 'base', 'thick'] as const).map((n) => (
              <span key={n} style={{ borderTop: `${e.borders[n]}px solid ${t['border-strong'].hex}` }} title={`border-${n}`} />
            ))}
          </div>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Button text uses the type scale (small, body, large) and the padding is worked out so each button reaches its height. 44px or more is a comfortable tap target on phones (WCAG 2.5.8 asks for at least 24px).
        </p>
        {Math.min(e.buttons.s, e.input) < 24 && <div className="form-error">A button or input smaller than 24px is hard to tap.</div>}
      </section>

      <section className="fx-section">
        <div className="fx-head">
          <h2>Motion</h2>
          <button className="btn btn-small" type="button" onClick={() => setPlay((p) => p + 1)}>
            ▶ Play
          </button>
        </div>
        <div className="fx-fields">
          {(['fast', 'base', 'slow'] as const).map((n) => (
            <NumberField key={n} label={`Duration ${n}`} value={e.motion[n]} min={0} max={2000} step={10} suffix="ms" onChange={(v) => set((x) => (x.motion[n] = v))} />
          ))}
        </div>
        <ul className="fx-ease" style={frame}>
          {EASINGS.map((x) => (
            <li key={x.name}>
              <span className="fx-ease-name">
                <strong>ease-{x.name}</strong>
                <span style={{ color: t['text-muted'].hex }}>{x.use}</span>
              </span>
              <span className="fx-track" style={{ background: t.surface.hex }}>
                <span
                  key={play}
                  className={`fx-dot ${play ? 'go' : ''}`}
                  style={{ background: t.primary.hex, transitionTimingFunction: x.css, animationTimingFunction: x.css, animationDuration: `${e.motion.slow * 2.5}ms` }}
                />
              </span>
            </li>
          ))}
        </ul>
        <p className="muted small" style={{ margin: 0 }}>
          Fast for hovers and small changes, base for most transitions, slow for larger movements. (The demo plays slower so you can see the curve.) Visitors who turn on “reduce motion” on their device get instant changes.
        </p>
      </section>

      <section className="fx-section">
        <div className="fx-head">
          <h2>Content widths</h2>
        </div>
        <div className="fx-fields">
          {(['narrow', 'container', 'wide'] as const).map((n) => (
            <NumberField key={n} label={n === 'container' ? 'Container' : n === 'narrow' ? 'Narrow (reading)' : 'Wide'} value={e.widths[n]} min={320} max={2560} step={10} onChange={(v) => set((x) => (x.widths[n] = v))} />
          ))}
        </div>
        <div className="fx-widths" style={frame}>
          {(['wide', 'container', 'narrow'] as const).map((n) => (
            <div key={n} style={{ width: `${Math.min(100, (e.widths[n] / 1920) * 100)}%`, background: n === 'narrow' ? t['primary-subtle'].hex : t.surface.hex, color: t.text.hex, borderColor: t.border.hex }}>
              width-{n} · {e.widths[n]}px
            </div>
          ))}
          <span className="muted small" style={{ color: t['text-muted'].hex }}>Shown on a 1920px screen</span>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Narrow keeps text lines readable (about 65–75 characters), container is the normal row width, wide is for galleries and full-bleed rows. In Divi, use them as the row's max width.
        </p>
      </section>

      <div className="row wrap">
        <button className="btn" type="button" onClick={() => confirm('Reset shadows, borders, sizes, motion and widths to the defaults?') && update((s) => (s.effects = structuredClone(DEFAULT_EFFECTS)))}>
          Reset to defaults
        </button>
      </div>
      <details>
        <summary>CSS variables</summary>
        <CodeBlock code={effectsCss(sys)} label="CSS" />
      </details>
    </div>
  )
}
