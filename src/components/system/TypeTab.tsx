import { useEffect, useState } from 'react'
import { downloadText } from '../../lib/exports'
import { fontStack, loadFonts } from '../../lib/fonts'
import { getFont, loadLibrary, loadPreviewFont, PAIRINGS, previewFamily, type GFont } from '../../lib/googleFonts'
import { FontLibrary } from '../FontLibrary'
import { typeOf, type DesignSystem } from '../../lib/system'
import {
  exportType,
  RATIOS,
  sizeAt,
  spacePairs,
  spaceScale,
  typeIssues,
  typeScale,
  VIEWPORTS,
  type TypeFormat,
  type TypeSettings,
} from '../../lib/typography'
import { Icon } from '../Icon'
import { CodeBlock, Segmented, useCopy } from '../ui'

const PRESETS: { name: string; s: Partial<TypeSettings> }[] = [
  { name: 'Compact', s: { minBase: 16, maxBase: 17, minRatio: 1.125, maxRatio: 1.2, stepsUp: 5 } },
  { name: 'Balanced', s: { minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.25, stepsUp: 6 } },
  { name: 'Editorial', s: { minBase: 17, maxBase: 20, minRatio: 1.2, maxRatio: 1.333, stepsUp: 6 } },
  { name: 'Bold marketing', s: { minBase: 16, maxBase: 19, minRatio: 1.25, maxRatio: 1.414, stepsUp: 6 } },
]

const SAMPLE: Record<string, string> = {
  h1: 'Fluid type, every screen',
  h2: 'Sizes scale smoothly',
  h3: 'No breakpoints needed',
  h4: 'clamp() does the work',
  h5: 'Minimum, preferred, maximum',
  h6: 'Readable at any width',
  p: 'Body text grows from its phone size to its desktop size as the screen gets wider, then stops. Because the formula mixes rem with vw, it still respects browser zoom and the visitor\'s own font-size settings.',
  small: 'Small print and captions use the step below body.',
}

function NumberField({ label, value, onChange, min, max, step = 1, suffix = 'px' }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <label className="field num-field">
      <span className="field-label">{label}</span>
      <span className="num-wrap">
        <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => e.target.value !== '' && onChange(Math.min(max, Math.max(min, Number(e.target.value))))} />
        <span className="muted small">{suffix}</span>
      </span>
    </label>
  )
}

/** Small line chart of every step's size across viewport widths. */
function Chart({ s, vw }: { s: TypeSettings; vw: number }) {
  const steps = typeScale(s)
  const W = 560,
    H = 220,
    P = 34
  const x0 = 320,
    x1 = 1920
  const yMax = Math.max(...steps.map((t) => t.max)) * 1.08
  const X = (v: number) => P + ((v - x0) / (x1 - x0)) * (W - P - 8)
  const Y = (px: number) => H - P + 6 - (px / yMax) * (H - P - 4)
  const pts = (t: (typeof steps)[number]) => [x0, s.minVw, s.maxVw, x1].map((v) => `${X(v).toFixed(1)},${Y(sizeAt(t, v, s)).toFixed(1)}`).join(' ')
  return (
    <svg className="type-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Font size of each step across viewport widths">
      <rect x={X(s.minVw)} y={4} width={X(s.maxVw) - X(s.minVw)} height={H - P} className="tc-band" />
      {[320, 768, 1280, 1920].map((v) => (
        <g key={v}>
          <line x1={X(v)} x2={X(v)} y1={4} y2={H - P + 6} className="tc-grid" />
          <text x={X(v)} y={H - 10} textAnchor="middle" className="tc-label">
            {v}
          </text>
        </g>
      ))}
      {[16, 32, 48, 64].filter((p) => p < yMax).map((p) => (
        <g key={p}>
          <line x1={P} x2={W - 8} y1={Y(p)} y2={Y(p)} className="tc-grid" />
          <text x={P - 6} y={Y(p) + 4} textAnchor="end" className="tc-label">
            {p}
          </text>
        </g>
      ))}
      {steps.map((t) => (
        <polyline key={t.step} points={pts(t)} className={`tc-line ${t.step === 0 ? 'base' : ''}`} />
      ))}
      <line x1={X(Math.min(x1, Math.max(x0, vw)))} x2={X(Math.min(x1, Math.max(x0, vw)))} y1={4} y2={H - P + 6} className="tc-now" />
    </svg>
  )
}

export function TypeTab({ sys, update }: { sys: DesignSystem; update: (fn: (s: DesignSystem) => void) => void }) {
  const copy = useCopy()
  const s = typeOf(sys)
  const [vw, setVw] = useState(1280)
  const [format, setFormat] = useState<TypeFormat>('css')
  const [picking, setPicking] = useState<'heading' | 'body' | null>(null)

  // Load the library so weights/categories of any chosen font are known, and preview the pairing fonts.
  useEffect(() => {
    loadLibrary()
    PAIRINGS.forEach((p) => {
      loadPreviewFont(p.heading, p.heading)
      loadPreviewFont(p.body, `+ ${p.body}same family`)
    })
  }, [])

  const metaOf = (f: GFont) => ({ category: f.category, weights: f.weights, italic: f.italic, variable: f.variable })
  const pickFont = (role: 'heading' | 'body', f: GFont) =>
    update((x) => {
      x.fonts[role] = f.family
      const keep = [x.fonts.heading, x.fonts.body]
      x.fonts.meta = Object.fromEntries(Object.entries({ ...(x.fonts.meta ?? {}), [f.family]: metaOf(f) }).filter(([k]) => keep.includes(k)))
    })
  const applyPair = async (h: string, b: string) => {
    await loadLibrary()
    const hf = getFont(h),
      bf = getFont(b)
    if (!hf || !bf) return
    update((x) => {
      x.fonts.heading = h
      x.fonts.body = b
      x.fonts.meta = { [h]: metaOf(hf), [b]: metaOf(bf) }
    })
    loadFonts([h, b], { [h]: metaOf(hf), [b]: metaOf(bf) })
  }
  const set = (patch: Partial<TypeSettings>) => update((x) => void (x.type = { ...typeOf(x), ...patch }))
  const steps = typeScale(s)
  const space = [...spaceScale(s), ...spacePairs(s)]
  const issues = typeIssues(s)
  const heading = fontStack(sys.fonts.heading, sys.fonts.meta)
  const body = fontStack(sys.fonts.body, sys.fonts.meta)
  const stacks = { heading, body }
  const code = exportType(s, format, sys.fonts, stacks)
  const maxSpace = Math.max(...space.map((x) => x.max))

  return (
    <div className="stack">
      <section className="type-card">
        <h2>Fonts &amp; shape</h2>
        <div className="type-grid">
          {(['heading', 'body'] as const).map((role) => (
            <div key={role} className="field">
              <span className="field-label">{role === 'heading' ? 'Heading font' : 'Body font'}</span>
              <button className="font-pick-btn" onClick={() => setPicking(role)} style={{ fontFamily: role === 'heading' ? heading : body }}>
                <span>{sys.fonts[role]}</span>
                <span className="muted small">Change</span>
              </button>
            </div>
          ))}
          <label className="slider">
            <span className="row space-between">
              <span>Corner radius</span>
              <span className="muted">{sys.radius}px</span>
            </span>
            <input type="range" min={0} max={28} value={sys.radius} onChange={(e) => update((x) => void (x.radius = Number(e.target.value)))} />
          </label>
        </div>
        <div className="pairings">
          <span className="field-label">Pairing ideas</span>
          <div className="pairing-list">
            {PAIRINGS.map((p) => (
              <button key={p.heading + p.body} className="pairing" onClick={() => applyPair(p.heading, p.body)} title={p.note}>
                <strong style={{ fontFamily: `'${previewFamily(p.heading)}'` }}>{p.heading}</strong>
                <span style={{ fontFamily: `'${previewFamily(p.body)}'` }}>{p.body === p.heading ? 'same family' : `+ ${p.body}`}</span>
                <small className="muted">{p.note}</small>
              </button>
            ))}
          </div>
        </div>
        {picking && <FontLibrary role={picking} current={sys.fonts[picking]} onClose={() => setPicking(null)} onPick={(f) => (pickFont(picking, f), setPicking(null))} />}
      </section>

      <section className="type-card">
        <div className="row space-between wrap">
          <h2 style={{ margin: 0 }}>Fluid type scale</h2>
          <div className="row wrap">
            {PRESETS.map((p) => (
              <button key={p.name} className="btn btn-small" onClick={() => set(p.s)}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <p className="muted small">
          Text grows smoothly from the small screen size to the large screen size, then stops. No breakpoints: each size is a single <code>clamp()</code> value.
        </p>
        <div className="type-settings">
          <fieldset>
            <legend>Small screen</legend>
            <NumberField label="Viewport" value={s.minVw} min={240} max={1200} onChange={(minVw) => set({ minVw })} />
            <NumberField label="Body size" value={s.minBase} min={12} max={24} step={0.5} onChange={(minBase) => set({ minBase })} />
            <label className="field">
              <span className="field-label">Scale ratio</span>
              <select value={s.minRatio} onChange={(e) => set({ minRatio: Number(e.target.value) })}>
                {RATIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend>Large screen</legend>
            <NumberField label="Viewport" value={s.maxVw} min={600} max={2560} onChange={(maxVw) => set({ maxVw })} />
            <NumberField label="Body size" value={s.maxBase} min={12} max={28} step={0.5} onChange={(maxBase) => set({ maxBase })} />
            <label className="field">
              <span className="field-label">Scale ratio</span>
              <select value={s.maxRatio} onChange={(e) => set({ maxRatio: Number(e.target.value) })}>
                {RATIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend>Steps</legend>
            <NumberField label="Above body" value={s.stepsUp} min={1} max={8} suffix="" onChange={(stepsUp) => set({ stepsUp })} />
            <NumberField label="Below body" value={s.stepsDown} min={0} max={3} suffix="" onChange={(stepsDown) => set({ stepsDown })} />
            <NumberField label="1rem equals" value={s.rootPx} min={10} max={24} onChange={(rootPx) => set({ rootPx })} />
          </fieldset>
        </div>
        {issues.length > 0 && (
          <ul className="type-issues">
            {issues.map((i, k) => (
              <li key={k} className={i.level}>
                <Icon name={i.level === 'warn' ? 'info' : 'check'} size={16} /> {i.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="type-card">
        <div className="row space-between wrap">
          <h2 style={{ margin: 0 }}>Preview at {vw}px</h2>
          <div className="row wrap">
            {VIEWPORTS.map((v) => (
              <button key={v.w} className={`btn btn-small ${vw === v.w ? 'btn-dark' : ''}`} onClick={() => setVw(v.w)}>
                {v.label} {v.w}
              </button>
            ))}
          </div>
        </div>
        <input className="vw-slider" type="range" min={320} max={1920} value={vw} onChange={(e) => setVw(Number(e.target.value))} aria-label="Preview viewport width" />
        <div className="type-preview-row">
          <div className="type-specimen" style={{ background: 'var(--surface)' }}>
            {steps
              .filter((t) => t.el)
              .map((t) => {
                const px = sizeAt(t, vw, s)
                const Tag = (t.el === 'small' ? 'p' : t.el) as 'p'
                return (
                  <div key={t.step} className="spec-line">
                    <span className="spec-meta">
                      {t.el} · {t.name} · {px.toFixed(1)}px
                    </span>
                    <Tag
                      style={{
                        fontFamily: t.el?.startsWith('h') ? heading : body,
                        fontSize: px,
                        lineHeight: t.lineHeight,
                        letterSpacing: t.tracking,
                        fontWeight: t.el?.startsWith('h') ? 750 : 400,
                        margin: 0,
                        maxWidth: t.el === 'p' || t.el === 'small' ? '65ch' : undefined,
                      }}
                    >
                      {SAMPLE[t.el!]}
                    </Tag>
                  </div>
                )
              })}
          </div>
          <Chart s={s} vw={vw} />
        </div>
      </section>

      <section className="type-card">
        <h2>Type steps</h2>
        <div className="table-wrap">
          <table className="type-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Use</th>
                <th>Min</th>
                <th>Max</th>
                <th>At {vw}px</th>
                <th>Line height</th>
                <th>clamp()</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((t) => (
                <tr key={t.step} className={t.zoomRatio > 2.5 ? 'risk' : ''}>
                  <td>
                    <code>--step-{t.step}</code> <span className="muted small">{t.name}</span>
                  </td>
                  <td>{t.el ?? '—'}</td>
                  <td>{t.min.toFixed(1)}px</td>
                  <td>{t.max.toFixed(1)}px</td>
                  <td>
                    <strong>{sizeAt(t, vw, s).toFixed(1)}px</strong>
                  </td>
                  <td>{t.lineHeight}</td>
                  <td>
                    <button className="clamp-btn" onClick={() => copy(t.css, 'clamp()')} title="Copy">
                      <code>{t.css}</code>
                      <Icon name="copy" size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="type-card">
        <h2>Fluid spacing</h2>
        <p className="muted small">Padding, margins and gaps that scale with the type. Pairs like <code>s-l</code> grow more, which suits section padding.</p>
        <div className="space-list">
          {space.map((x) => {
            const px = sizeAt(x, vw, s)
            return (
              <button key={x.name} className="space-row" onClick={() => copy(x.css, 'clamp()')} title="Copy clamp()">
                <code className="space-name">--space-{x.name}</code>
                <span className="space-bar-wrap">
                  <span className="space-bar" style={{ width: `${(px / maxSpace) * 100}%` }} />
                </span>
                <span className="small">
                  {Math.round(x.min)}→{Math.round(x.max)}px · <strong>{px.toFixed(0)}px</strong>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="type-card">
        <div className="row space-between wrap">
          <h2 style={{ margin: 0 }}>Code</h2>
          <div className="row wrap">
            <Segmented
              label="Typography code format"
              value={format}
              onChange={setFormat}
              options={[
                { id: 'css', label: 'CSS' },
                { id: 'tailwind4', label: 'Tailwind v4' },
                { id: 'scss', label: 'SCSS' },
                { id: 'json', label: 'JSON' },
              ]}
            />
            <button className="btn btn-small" onClick={() => downloadText(code, `fluid-type.${format === 'tailwind4' ? 'css' : format}`)}>
              <Icon name="download" size={14} /> Download
            </button>
          </div>
        </div>
        <CodeBlock code={code} label="typography code" />
        <p className="muted small">
          Divi: paste the CSS into <strong>Divi → Theme Options → Custom CSS</strong> (or your child theme's stylesheet). Headings and body text pick
          up the sizes automatically, and the variables can be used in your own custom CSS. Phase 4 will also turn these into Divi 5 variables.
        </p>
      </section>
    </div>
  )
}
