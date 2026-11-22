import { useMemo, useState } from 'react'
import { DEFAULT_DIVI_OPTIONS, findBrokenRefs, sectionStyles, type DiviExport, type DiviOptions } from '../../lib/divi'
import { darkBodyScript, darkColorVars, darkHeadScript, darkModeCss, DEFAULT_DARK, toggleButtonHtml, type DarkOptions } from '../../lib/diviDark'
import { brandButtonVariant, buildLayoutFile, colFraction, buildThemeBuilderFile, LAYOUTS, type ButtonItem, type Item, type SectionSpec } from '../../lib/diviLayouts'
import { effectsOf } from '../../lib/effects'
import { downloadText } from '../../lib/exports'
import { fontStack } from '../../lib/fonts'
import { buildScales, buildTokens, typeOf, type DesignSystem } from '../../lib/system'
import { typeScale } from '../../lib/typography'
import { Icon } from '../Icon'
import { CodeBlock, Segmented } from '../ui'

function readOpts(): DiviOptions {
  try {
    return { ...DEFAULT_DIVI_OPTIONS, ...JSON.parse(localStorage.getItem('d5wt:diviOpts') ?? '{}') }
  } catch {
    return DEFAULT_DIVI_OPTIONS
  }
}
const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'

/* ---------- Layouts ---------- */

/** Small HTML picture of a section, drawn with the design system's colours and type. */
export function SectionPreview({ spec, sys }: { spec: SectionSpec; sys: DesignSystem }) {
  const st = sectionStyles(sys)[spec.kind]
  const t = buildTokens(sys, 'light')
  const sc = buildScales(sys)
  const fx = effectsOf(sys)
  const steps = typeScale(typeOf(sys))
  // preview sizes: the real scale shrunk to fit, smaller again in narrow columns
  const size = (level: number, frac: number) => Math.min(frac >= 0.99 ? 28 : frac >= 0.5 ? 20 : 15, Math.max(11, (steps.find((s) => s.el === `h${level}`)?.max ?? 18) * 0.5))
  const btn = (v: ButtonItem['variant']): React.CSSProperties => {
    const variant = spec.kind === 'brand' && v === 'light' ? brandButtonVariant(sys) : v
    const map = {
      primary: { background: t.primary.hex, color: t['on-primary'].hex, borderColor: t.primary.hex },
      secondary: { background: t.secondary.hex, color: t['on-secondary'].hex, borderColor: t.secondary.hex },
      outline: { background: 'transparent', color: t['primary-text'].hex, borderColor: t['primary-text'].hex },
      light: { background: sc.neutral[0], color: t['primary-text'].hex, borderColor: sc.neutral[0] },
    }
    return { ...map[variant], borderRadius: sys.radius, borderWidth: fx.borders.base }
  }
  const item = (it: Item, i: number, card: boolean, frac: number) => {
    const colour = card ? t.text.hex : st.heading
    const body = card ? t['text-muted'].hex : st.text
    switch (it.type) {
      case 'heading':
        return (
          <div key={i} className="lp-h" style={{ fontFamily: fontStack(sys.fonts.heading, sys.fonts.meta), fontSize: size(it.level, frac), color: colour }}>
            {it.text}
          </div>
        )
      case 'text':
        return <div key={i} className="lp-t" style={{ color: it.tone === 'muted' || card ? body : st.text }} dangerouslySetInnerHTML={{ __html: it.html }} />
      case 'button':
        return (
          <span key={i} className="lp-b" style={btn(it.variant)}>
            {it.text}
          </span>
        )
      case 'accordion':
        return (
          <div key={i} className="lp-acc">
            {it.items.map((x, j) => (
              <div key={j} style={{ borderColor: t.border.hex, color: st.heading }}>
                <strong>{x.title}</strong>
                {j === 0 && <div className="lp-t" style={{ color: st.text }} dangerouslySetInnerHTML={{ __html: x.html }} />}
              </div>
            ))}
          </div>
        )
    }
  }
  return (
    <div className="lp-section" style={{ background: st.bg, fontFamily: fontStack(sys.fonts.body, sys.fonts.meta) }}>
      {spec.rows.map((row, r) => (
        <div key={r} className={`lp-row ${row.align === 'center' ? 'center' : ''}`} style={{ gridTemplateColumns: row.cols.map((c) => `minmax(0, ${colFraction(c.width)}fr)`).join(' ') }}>
          {row.cols.map((col, c) => (
            <div key={c} className={`lp-col ${col.card ? 'card' : ''}`} style={col.card ? { background: t.surface.hex === st.bg ? t['surface-raised'].hex : t.surface.hex, borderRadius: sys.radius, borderColor: t.border.hex } : undefined}>
              {col.items.map((it, i) => item(it, i, !!col.card, colFraction(col.width)))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function LayoutsTab({ sys, source }: { sys: DesignSystem; source: DiviExport | null }) {
  const opts = useMemo(() => readOpts(), [])
  const sections = LAYOUTS.filter((l) => !l.part)
  const [picked, setPicked] = useState<string[]>(sections.map((s) => s.id))
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : sections.map((s) => s.id).filter((x) => x === id || p.includes(x))))
  const slug = slugOf(sys.name)
  const page = useMemo(() => buildLayoutFile(sys, opts, picked, source), [sys, opts, picked, source])
  const broken = findBrokenRefs(page.file, source)

  return (
    <div className="stack">
      <p className="muted small" style={{ margin: 0 }}>
        Ready-made sections built from your presets, in the same format as a Divi 5 layout export. Each file also carries the presets, colours and variables it uses, so it works on a fresh site. Cards use the classes from the CSS &amp; classes tab
        (<code>d5-card</code>, <code>d5-lift</code>): paste that CSS into Theme Options too. Text and buttons are placeholders to replace.
      </p>
      <div className="lp-grid">
        {sections.map((s) => (
          <article key={s.id} className={`lp-card ${picked.includes(s.id) ? 'on' : ''}`}>
            <div className="lp-stage">
              <SectionPreview spec={s} sys={sys} />
            </div>
            <div className="lp-body">
              <label className="divi-check">
                <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} /> <strong>{s.label}</strong>
              </label>
              <button className="btn btn-small" type="button" onClick={() => downloadText(JSON.stringify(buildLayoutFile(sys, opts, [s.id], source).file), `${slug}-${s.id}-divi5-layout.json`, 'application/json')}>
                <Icon name="download" size={14} /> This section
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="rt-bar">
        <span>
          <strong>{picked.length}</strong> section{picked.length === 1 ? '' : 's'} as one page{broken.length > 0 && <span className="form-error"> {broken.length} broken references</span>}
        </span>
        <button className="btn btn-primary" type="button" disabled={!picked.length} onClick={() => downloadText(JSON.stringify(page.file), `${slug}-page-divi5-layout.json`, 'application/json')}>
          <Icon name="download" size={16} /> Download page layout
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        In Divi: open a page in the Visual Builder → Portability (⇅) → Import, or add it to the Divi Library (Divi → Divi Library → Import &amp; Export).
      </p>

      <h3 className="rt-h">Header &amp; footer (Theme Builder)</h3>
      <div className="lp-grid two">
        {LAYOUTS.filter((l) => l.part).map((s) => (
          <article key={s.id} className="lp-card on">
            <div className="lp-stage">
              <SectionPreview spec={s} sys={sys} />
            </div>
            <div className="lp-body">
              <strong>{s.label}</strong>
            </div>
          </article>
        ))}
      </div>
      <div className="row wrap">
        <button className="btn btn-primary" type="button" onClick={() => downloadText(JSON.stringify(buildThemeBuilderFile(sys, opts, source)), `${slug}-theme-builder-header-footer.json`, 'application/json')}>
          <Icon name="download" size={16} /> Download Theme Builder file
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Divi → Theme Builder → Portability → Import. It adds a template for all pages and posts with this header and footer; change where it's used in the Theme Builder. Replace the text links with a Menu module and the brand name with your logo.
      </p>
    </div>
  )
}

/* ---------- Dark mode ---------- */

function demoPage(sys: DesignSystem, css: string, d: DarkOptions) {
  return `<!doctype html><html><head><meta charset="utf-8">${darkHeadScript()}<style>${css}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font-body)}
.demo-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid var(--border)}
.demo-hero{padding:34px 22px;background:var(--surface)}
.demo-hero h1{margin:0 0 8px;font:700 1.6rem/1.2 var(--font-heading)}
.demo-btn{display:inline-block;margin-top:12px;padding:10px 18px;border-radius:var(--radius);background:var(--primary);color:var(--on-primary);font-weight:700;text-decoration:none}
.demo-cards{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:22px}
.demo-card{padding:16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface-raised);box-shadow:var(--shadow-sm)}
.demo-card p{color:var(--text-muted);margin:6px 0 0;font-size:.9rem}
</style></head><body>
<div class="demo-nav"><strong style="font-family:var(--font-heading)">${sys.name.replace(/[<&]/g, '')}</strong>${d.button === 'manual' ? toggleButtonHtml : '<span style="color:var(--text-muted);font-size:.85rem">Home · About · Contact</span>'}</div>
<div class="demo-hero"><h1>Dark mode preview</h1><div style="color:var(--text-muted)">Click the button to switch. The choice is remembered; without it, the page follows the device setting.</div><a class="demo-btn" href="#">Primary action</a></div>
<div class="demo-cards"><div class="demo-card"><strong>Card</strong><p>Surfaces, borders and muted text all switch.</p></div><div class="demo-card"><strong style="color:var(--primary-text)">Brand text</strong><p>Links and brand colours stay readable.</p></div></div>
${darkBodyScript(d)}</body></html>`
}

export function DarkModeTab({ sys, source }: { sys: DesignSystem; source: DiviExport | null }) {
  const opts = useMemo(() => readOpts(), [])
  const [d, setD] = useState<DarkOptions>(DEFAULT_DARK)
  const vars = useMemo(() => darkColorVars(sys, opts, source), [sys, opts, source])
  const css = useMemo(() => darkModeCss(sys, opts, source, d), [sys, opts, source, d])
  const head = darkHeadScript()
  const bodyJs = darkBodyScript(d)
  const slug = slugOf(sys.name)

  return (
    <div className="stack">
      <p className="muted small" style={{ margin: 0 }}>
        Visitors see your site in dark mode when their device is set to dark, and a button lets them switch either way (the choice is remembered). It uses the dark tokens from your design system and switches the Divi global colours that the import file
        creates, so import that file first.
      </p>
      <div className="row wrap">
        <div className="field">
          <span className="field-label">Toggle button</span>
          <Segmented
            label="Toggle button"
            value={d.button}
            onChange={(button) => setD((x) => ({ ...x, button }))}
            options={[
              { id: 'floating', label: 'Floating button (automatic)' },
              { id: 'manual', label: 'I’ll place it myself' },
            ]}
          />
        </div>
        {d.button === 'floating' && (
          <div className="field">
            <span className="field-label">Position</span>
            <Segmented
              label="Position"
              value={d.position}
              onChange={(position) => setD((x) => ({ ...x, position }))}
              options={[
                { id: 'bottom-right', label: 'Bottom right' },
                { id: 'bottom-left', label: 'Bottom left' },
              ]}
            />
          </div>
        )}
      </div>

      <iframe className="dm-frame" title="Dark mode preview" srcDoc={demoPage(sys, css, d)} />

      <ol className="dm-steps">
        <li>
          <strong>Import the Divi 5 file</strong> from the Import file tab (it creates the global colours this switches).
        </li>
        <li>
          <strong>Add the CSS:</strong> Divi → Theme Options → General → Custom CSS.
          <div className="row wrap">
            <button className="btn btn-small" type="button" onClick={() => downloadText(css, `${slug}-dark-mode.css`, 'text/css')}>
              <Icon name="download" size={14} /> dark-mode.css
            </button>
          </div>
          <details>
            <summary>Show CSS</summary>
            <CodeBlock code={css} label="CSS" />
          </details>
        </li>
        <li>
          <strong>Add the scripts:</strong> Divi → Theme Options → Integration. Put the first in “Add code to the &lt;head&gt;”, the second in “Add code to the &lt;body&gt;”.
          <CodeBlock code={head} label="head script" />
          <CodeBlock code={bodyJs} label="body script" />
        </li>
        {d.button === 'manual' && (
          <li>
            <strong>Place the button:</strong> add a Code module (e.g. in the header) with this HTML. Any element with the class <code>d5-theme-toggle</code> works.
            <CodeBlock code={toggleButtonHtml} label="button HTML" />
          </li>
        )}
        <li>
          <strong>Logos and images:</strong> give the normal logo the class <code>d5-hide-dark</code> and a light version <code>d5-show-dark</code> (Advanced → CSS ID &amp; Classes). The Logo checker makes the light version.
        </li>
      </ol>

      <details>
        <summary>
          {vars.length} Divi colours that change in dark mode
        </summary>
        <ul className="dm-vars">
          {vars.map((v) => (
            <li key={v.id}>
              <span className="chip" style={{ background: v.light }} />→<span className="chip" style={{ background: v.dark }} /> {v.label} <code className="muted small">--{v.id}</code>
            </li>
          ))}
        </ul>
      </details>
      <p className="muted small" style={{ margin: 0 }}>
        Divi 5 shows global colours as CSS variables named after their id (<code>--gcid-…</code>). Colours set directly on a module (not as a global colour) won't switch, so use the presets. Test on a staging site first.
      </p>
    </div>
  )
}
