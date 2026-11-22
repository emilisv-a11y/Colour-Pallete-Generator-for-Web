import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useDesignSystem } from '../components/system/useDesignSystem'
import { CodeBlock, Segmented, useToast } from '../components/ui'
import {
  buildDiviImport,
  checkSection,
  DEFAULT_DIVI_OPTIONS,
  diviCss,
  findBrokenRefs,
  parseDiviExport,
  parseRef,
  SECTION_KINDS,
  sectionStyles,
  summarizeExport,
  type DiviExport,
  type DiviOptions,
  type SectionKind,
} from '../lib/divi'
import { downloadText, paletteSlug } from '../lib/exports'
import { fontStack, loadFonts } from '../lib/fonts'
import { DiffTab, OPEN_TAB_KEY, ReadSiteModal } from '../components/divi/RoundTrip'

const SRC_KEY = 'd5wt:diviSource'
const OPT_KEY = 'd5wt:diviOpts'
const PLAN_KEY = 'd5wt:sectionPlan'
const CHECK_KEY = 'd5wt:diviChecklist'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

type Tab = 'import' | 'diff' | 'planner' | 'css' | 'checklist'

/* ---------- Current Divi site ---------- */

function SiteCard({ source, setSource }: { source: DiviExport | null; setSource: (s: DiviExport | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const summary = source ? summarizeExport(source) : null
  const hexes = summary ? [...new Set(summary.colors.map((c) => c.hex).filter((h): h is string => !!h))].slice(0, 10) : []
  return (
    <section className="divi-site">
      <div className="row space-between wrap">
        <div>
          <h2 style={{ margin: 0 }}>Your Divi site</h2>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            {source
              ? `Divi ${summary!.version} export: ${summary!.colors.length} global colours, ${summary!.variables.length} variables, ${summary!.moduleCount + summary!.groupCount} presets. Stored only in this browser.`
              : 'Optional but recommended: upload a presets export from your site, so the import file reuses your existing colour and variable names instead of creating duplicates, and keeps your default presets untouched.'}
          </p>
        </div>
        <div className="row wrap">
          {source && (
            <button className="btn btn-primary" type="button" onClick={() => setReading(true)}>
              <Icon name="wand" size={16} /> Build design system from this site
            </button>
          )}
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> {source ? 'Replace export' : 'Upload Divi export (.json)'}
          </button>
          {source && (
            <button className="btn" onClick={() => setSource(null)}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            setSource(parseDiviExport(await f.text()))
            setFileName(f.name)
          } catch (err) {
            alert((err as Error).message)
          }
        }}
      />
      {reading && source && <ReadSiteModal source={source} fileName={fileName} onClose={() => setReading(false)} />}
      {summary && (
        <div className="divi-site-body">
          <div>
            <span className="field-label">Global colours</span>
            <ul className="divi-colors">
              {summary.colors.map((c) => (
                <li key={c.id} title={c.id}>
                  <span className="chip" style={{ background: c.hex ?? 'transparent' }} />
                  <span>{c.label}</span>
                  {parseRef(c.raw) && <span className="tag">{c.relative ? 'relative' : 'linked'}</span>}
                </li>
              ))}
            </ul>
            {hexes.length >= 2 && (
              <Link className="btn btn-small" to={`/generate/${paletteSlug(hexes)}`}>
                <Icon name="wand" size={14} /> Open these colours in the generator
              </Link>
            )}
          </div>
          <div>
            <span className="field-label">Variables</span>
            <ul className="divi-vars">
              {summary.variables.map((v) => (
                <li key={v.id}>
                  <code>{v.label}</code> <span className="muted small">{v.value}</span>
                </li>
              ))}
              {summary.variables.length === 0 && <li className="muted small">None</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

/* ---------- Import file ---------- */

function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="divi-check" title={hint}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  )
}

function ImportTab({ sys, source }: { sys: NonNullable<ReturnType<typeof useDesignSystem>['sys']>; source: DiviExport | null }) {
  const [opts, setOptsState] = useState<DiviOptions>(() => ({ ...DEFAULT_DIVI_OPTIONS, ...load<Partial<DiviOptions>>(OPT_KEY, {}) }))
  const setOpts = (p: Partial<DiviOptions>) =>
    setOptsState((o) => {
      const n = { ...o, ...p }
      save(OPT_KEY, n)
      return n
    })
  const build = useMemo(() => buildDiviImport(sys, opts, source), [sys, opts, source])
  const json = JSON.stringify(build.file, null, 1)
  const broken = findBrokenRefs(build.file, source)
  const count = (k: string, a?: string) => build.changes.filter((c) => c.kind === k && (!a || c.action === a)).length
  const affected = build.changes.filter((c) => c.action !== 'add' && c.kind !== 'preset')
  const [showAll, setShowAll] = useState(false)
  const slug = sys.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'

  return (
    <div className="stack">
      <div className="divi-options">
        <fieldset>
          <legend>Global colours</legend>
          <label className="field">
            <span className="field-label">Colour scales</span>
            <select value={opts.scales} onChange={(e) => setOpts({ scales: e.target.value as DiviOptions['scales'] })}>
              <option value="brand">Primary, secondary, accent, neutral (44)</option>
              <option value="all">All roles incl. status colours (88)</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Semantic colours (light mode)</span>
            <select value={opts.tokens} onChange={(e) => setOpts({ tokens: e.target.value as DiviOptions['tokens'] })}>
              <option value="essential">Essential (29): text, backgrounds, buttons, status…</option>
              <option value="all">All (67)</option>
              <option value="none">None</option>
            </select>
          </label>
          <Check label="Link semantic colours to scale colours" checked={opts.linkTokens} onChange={(linkTokens) => setOpts({ linkTokens })} hint="Changing e.g. Primary 600 in Divi then updates every colour that uses it" />
          <Check label="Set Divi's Primary, Heading and Body colours" checked={opts.mapBuiltins} onChange={(mapBuiltins) => setOpts({ mapBuiltins })} />
        </fieldset>
        <fieldset>
          <legend>Variables (numbers)</legend>
          <Check label={`Fluid type sizes (text-xs … text-5xl)`} checked={opts.typeVars} onChange={(typeVars) => setOpts({ typeVars })} />
          <Check label="Fluid spacing (space-3xs … space-xl-3xl)" checked={opts.spaceVars} onChange={(spaceVars) => setOpts({ spaceVars })} />
          <Check label="Corner radius (radius-s, m, l, full)" checked={opts.radiusVars} onChange={(radiusVars) => setOpts({ radiusVars })} />
          <Check label="Borders, button sizes, input height, motion, content widths" checked={opts.effectVars} onChange={(effectVars) => setOpts({ effectVars })} hint="border-*, btn-s/m/l-*, input-height, duration-*, width-narrow/container/wide" />
          <label className="field">
            <span className="field-label">Name prefix (optional)</span>
            <input value={opts.prefix} onChange={(e) => setOpts({ prefix: e.target.value })} placeholder='e.g. "D5 " to group the new items' />
          </label>
        </fieldset>
        <fieldset>
          <legend>Presets</legend>
          <Check label="Headings H1–H6 (Heading module)" checked={opts.presetHeadings} onChange={(presetHeadings) => setOpts({ presetHeadings })} />
          <Check label="Body, muted, on-brand, on-dark text (Text module)" checked={opts.presetText} onChange={(presetText) => setOpts({ presetText })} />
          <Check label="Primary, secondary, outline, light buttons" checked={opts.presetButtons} onChange={(presetButtons) => setOpts({ presetButtons })} />
          <Check label="Button sizes S, M, L (option group presets)" checked={opts.presetButtonSizes} onChange={(presetButtonSizes) => setOpts({ presetButtonSizes })} />
          <Check label="Section backgrounds with fluid padding" checked={opts.presetSections} onChange={(presetSections) => setOpts({ presetSections })} />
          <Check label="Radius and card padding (option group presets)" checked={opts.presetGroups} onChange={(presetGroups) => setOpts({ presetGroups })} />
        </fieldset>
      </div>

      {source && (
        <div className="field">
          <span className="field-label">Colours and variables that already exist on your site (same name)</span>
          <Segmented
            label="Existing items"
            value={opts.onConflict}
            onChange={(onConflict) => setOpts({ onConflict })}
            options={[
              { id: 'update', label: 'Update them with the new values' },
              { id: 'keep', label: 'Keep my current values' },
            ]}
          />
        </div>
      )}

      <div className="divi-summary">
        <div>
          <strong>{count('color') - count('color', 'keep')}</strong> colours
        </div>
        <div>
          <strong>{count('variable') - count('variable', 'keep')}</strong> variables
        </div>
        <div>
          <strong>{count('preset')}</strong> presets
        </div>
        <div className={broken.length ? 'warn' : 'ok'}>{broken.length ? `${broken.length} broken references` : 'All references valid'}</div>
      </div>

      {affected.length > 0 && (
        <div className={`divi-affected ${opts.onConflict === 'update' ? 'updating' : ''}`}>
          <strong>
            {opts.onConflict === 'update'
              ? `${affected.length} existing item${affected.length > 1 ? 's' : ''} on your site will change. Anything already using them updates too.`
              : `${affected.length} existing item${affected.length > 1 ? 's' : ''} will be left as they are; the new presets use your current values.`}
          </strong>
          <ul>
            {affected.map((c) => (
              <li key={c.id}>
                <code>{c.label}</code>
                <span className="muted small">
                  {short(c.previous)} {opts.onConflict === 'update' ? <>→ {short(c.value)}</> : '(kept)'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row wrap">
        <button className="btn btn-primary" onClick={() => downloadText(json, `${slug}-divi5-import.json`, 'application/json')}>
          <Icon name="download" size={16} /> Download Divi 5 import file
        </button>
        <button className="btn" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Hide' : 'Show'} everything in the file
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Import it in Divi the same way you exported your presets. The headings, text and buttons use Divi's global heading and body fonts: set them to{' '}
        <strong style={{ fontFamily: fontStack(sys.fonts.heading, sys.fonts.meta) }}>{sys.fonts.heading}</strong> and{' '}
        <strong style={{ fontFamily: fontStack(sys.fonts.body, sys.fonts.meta) }}>{sys.fonts.body}</strong> in Divi. This file follows the structure of a real Divi 5 export,
        but try it on a staging site or after a backup first.
      </p>
      {showAll && (
        <>
          <ul className="divi-change-list">
            {build.changes.map((c) => (
              <li key={c.kind + c.id} className={c.action}>
                <span className="tag">{c.kind}</span> {c.label} <span className="muted small">{c.action === 'add' ? 'new' : c.action === 'update' ? 'updates existing' : 'kept'}</span>
                {c.kind === 'color' && c.value?.startsWith('#') && <span className="chip" style={{ background: c.value }} />}
              </li>
            ))}
          </ul>
          <CodeBlock code={json} label="import JSON" />
        </>
      )}
    </div>
  )
}

function short(v?: string) {
  if (!v) return '—'
  const r = parseRef(v)
  if (r) return `→ ${r.name}${Object.keys(r.settings).length ? ' (adjusted)' : ''}`
  return v.length > 48 ? v.slice(0, 45) + '…' : v
}

/* ---------- Section planner ---------- */

function PlannerTab({ sys }: { sys: NonNullable<ReturnType<typeof useDesignSystem>['sys']> }) {
  const styles = sectionStyles(sys)
  const [plan, setPlanState] = useState<SectionKind[]>(() => load(PLAN_KEY, ['dark', 'light', 'surface', 'brand', 'light', 'dark'] as SectionKind[]))
  const setPlan = (p: SectionKind[]) => {
    setPlanState(p)
    save(PLAN_KEY, p)
  }
  const heading = fontStack(sys.fonts.heading, sys.fonts.meta)
  const body = fontStack(sys.fonts.body, sys.fonts.meta)
  return (
    <div className="stack">
      <p className="muted small" style={{ margin: 0 }}>
        Plan the order of section backgrounds down a page. Each section shows the heading, text, link and button colours that work on it, checked for contrast, and the
        presets from the import file to use.
      </p>
      <div className="planner">
        {plan.map((k, i) => {
          const s = styles[k]
          const checks = checkSection(s)
          const same = i > 0 && plan[i - 1] === k
          return (
            <div key={i} className="plan-row">
              <div className="plan-preview" style={{ background: s.bg, color: s.text, borderRadius: i === 0 ? '12px 12px 0 0' : i === plan.length - 1 ? '0 0 12px 12px' : 0 }}>
                <h3 style={{ color: s.heading, fontFamily: heading }}>{s.label} section</h3>
                <p style={{ fontFamily: body }}>
                  Body text on this background, with a <span style={{ color: s.link, textDecoration: 'underline' }}>text link</span>.
                </p>
                <span className="plan-btn" style={{ background: s.button.bg, color: s.button.text, borderRadius: sys.radius }}>
                  {s.button.label.replace(/ \(.*\)/, '')}
                </span>
              </div>
              <div className="plan-side">
                <div className="row wrap">
                  <select value={k} onChange={(e) => setPlan(plan.map((x, j) => (j === i ? (e.target.value as SectionKind) : x)))} aria-label={`Section ${i + 1} background`}>
                    {SECTION_KINDS.map((x) => (
                      <option key={x} value={x}>
                        {styles[x].label}
                      </option>
                    ))}
                  </select>
                  <button className="icon-btn" disabled={i === 0} onClick={() => setPlan(swap(plan, i, i - 1))} aria-label="Move up" title="Move up">
                    ↑
                  </button>
                  <button className="icon-btn" disabled={i === plan.length - 1} onClick={() => setPlan(swap(plan, i, i + 1))} aria-label="Move down" title="Move down">
                    ↓
                  </button>
                  <button className="icon-btn danger" disabled={plan.length <= 1} onClick={() => setPlan(plan.filter((_, j) => j !== i))} aria-label="Remove section" title="Remove">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
                <div className="plan-checks">
                  {checks.map((c) => (
                    <span key={c.label} className={`badge ${c.pass ? 'pass' : 'fail'}`} title={`${c.ratio.toFixed(2)}:1, needs ${c.min}:1`}>
                      {c.label} {c.ratio.toFixed(1)}
                    </span>
                  ))}
                </div>
                <div className="muted small">
                  Presets: <b>{s.presets.section}</b> · <b>{s.presets.text}</b> · <b>{s.presets.button}</b>
                  <br />
                  CSS class: <code>d5-section-{k}</code>
                </div>
                {same && <div className="warn small">Same background as the section above. Consider alternating so sections are distinct.</div>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="row wrap">
        <span className="field-label">Add section</span>
        {SECTION_KINDS.map((k) => (
          <button key={k} className="btn btn-small" onClick={() => setPlan([...plan, k])}>
            <span className="chip" style={{ background: styles[k].bg }} /> {styles[k].label}
          </button>
        ))}
      </div>
    </div>
  )
}

function swap<T>(arr: T[], a: number, b: number) {
  const n = [...arr]
  ;[n[a], n[b]] = [n[b], n[a]]
  return n
}

/* ---------- CSS & checklist ---------- */

function CssTab({ sys }: { sys: NonNullable<ReturnType<typeof useDesignSystem>['sys']> }) {
  const css = diviCss(sys)
  return (
    <div className="stack">
      <p className="muted small" style={{ margin: 0 }}>
        Optional extra layer: CSS variables (light and dark), fluid type and spacing, and helper classes such as <code>d5-section-dark</code> and <code>d5-card</code>. Paste
        it into <strong>Divi → Theme Options → General → Custom CSS</strong>, or your child theme's <code>style.css</code>, then add the classes in a module's{' '}
        <strong>Advanced → CSS ID &amp; Classes</strong>.
      </p>
      <div className="row">
        <button className="btn" onClick={() => downloadText(css, 'divi-custom.css', 'text/css')}>
          <Icon name="download" size={16} /> Download CSS
        </button>
      </div>
      <CodeBlock code={css} label="Divi CSS" />
    </div>
  )
}

function ChecklistTab({ sys }: { sys: NonNullable<ReturnType<typeof useDesignSystem>['sys']> }) {
  const toast = useToast()
  const [done, setDoneState] = useState<Record<string, boolean>>(() => load(CHECK_KEY, {}))
  const toggle = (k: string) =>
    setDoneState((d) => {
      const n = { ...d, [k]: !d[k] }
      save(CHECK_KEY, n)
      return n
    })
  const steps: { id: string; title: string; body: React.ReactNode }[] = [
    { id: 'backup', title: 'Back up your site', body: 'Export your current presets (as you did for the upload here) and take a site backup, so you can roll back.' },
    {
      id: 'fonts',
      title: 'Set the global fonts',
      body: (
        <>
          In Divi, set the heading font to <b>{sys.fonts.heading}</b> and the body font to <b>{sys.fonts.body}</b>. The imported presets use these global fonts.
        </>
      ),
    },
    {
      id: 'selfhost',
      title: 'Optional: self-host the fonts',
      body: (
        <>
          For EU privacy, download the font package from <Link to="/system">Design system → Type → Self-host fonts</Link> and follow its README instead of loading fonts from Google.
        </>
      ),
    },
    { id: 'import', title: 'Import the Divi 5 file', body: 'Download it from the Import file tab and import it where you exported your presets. Your global colours, variables and presets appear in the builder.' },
    { id: 'check', title: 'Check the colours and variables', body: 'Open the colour picker and the variable manager. You should see the scales (e.g. "Primary 500"), semantic colours (e.g. "Text", "On Primary") and the fluid text, space and radius variables.' },
    { id: 'apply', title: 'Apply presets', body: 'Use the section, heading, text and button presets. The Section planner tab shows which preset belongs on which background.' },
    { id: 'css', title: 'Optional: add the CSS', body: 'Paste the CSS from the CSS tab into Theme Options for dark-mode tokens and helper classes.' },
    { id: 'test', title: 'Test on real devices', body: 'Check phone, tablet and desktop, keyboard focus, and the contrast of any text you placed on images.' },
  ]
  const n = steps.filter((s) => done[s.id]).length
  return (
    <div className="stack">
      <div className="row space-between wrap">
        <strong>
          {n} of {steps.length} done
        </strong>
        <button
          className="btn btn-small"
          onClick={() => {
            setDoneState({})
            save(CHECK_KEY, {})
            toast('Checklist reset')
          }}
        >
          Reset
        </button>
      </div>
      <ol className="divi-checklist">
        {steps.map((s, i) => (
          <li key={s.id} className={done[s.id] ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={!!done[s.id]} onChange={() => toggle(s.id)} />
              <span className="step-num">{i + 1}</span>
              <span>
                <strong>{s.title}</strong>
                <span className="muted small">{s.body}</span>
              </span>
            </label>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------- Page ---------- */

export default function DiviPage() {
  const { sys } = useDesignSystem()
  const [source, setSourceState] = useState<DiviExport | null>(() => {
    try {
      const raw = localStorage.getItem(SRC_KEY)
      return raw ? parseDiviExport(raw) : null
    } catch {
      return null
    }
  })
  const setSource = (s: DiviExport | null) => {
    setSourceState(s)
    try {
      if (s) localStorage.setItem(SRC_KEY, JSON.stringify(s))
      else localStorage.removeItem(SRC_KEY)
    } catch {
      /* ignore */
    }
  }
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const t = sessionStorage.getItem(OPEN_TAB_KEY)
      sessionStorage.removeItem(OPEN_TAB_KEY)
      if (t === 'diff') return 'diff'
    } catch {
      /* ignore */
    }
    return 'import'
  })
  const shownTab: Tab = tab === 'diff' && !source ? 'import' : tab
  useEffect(() => {
    if (sys) loadFonts([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)
  }, [sys?.fonts.heading, sys?.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page divi-page">
      <header className="page-head">
        <h1>Divi 5</h1>
        <p className="muted">Turn your design system into Divi 5 global colours, variables and presets, plan section colours, and get CSS for Theme Options. Taking over an existing site? Upload its export and build a design system from it.</p>
      </header>

      <SiteCard source={source} setSource={setSource} />

      {!sys ? (
        <div className="system-empty">
          <p>Create a design system first. Everything on this page is built from it.{source ? ' Or build one from the uploaded site above.' : ''}</p>
          <Link className="btn btn-primary" to="/system">
            Go to Design system
          </Link>
        </div>
      ) : (
        <>
          <Segmented
            label="Divi section"
            value={shownTab}
            onChange={setTab}
            options={[
              { id: 'import', label: 'Import file' },
              ...(source ? [{ id: 'diff' as Tab, label: 'Site differences' }] : []),
              { id: 'planner', label: 'Section planner' },
              { id: 'css', label: 'CSS & classes' },
              { id: 'checklist', label: 'Checklist' },
            ]}
          />
          {shownTab === 'import' && <ImportTab sys={sys} source={source} />}
          {shownTab === 'diff' && source && <DiffTab sys={sys} source={source} />}
          {shownTab === 'planner' && <PlannerTab sys={sys} />}
          {shownTab === 'css' && <CssTab sys={sys} />}
          {shownTab === 'checklist' && <ChecklistTab sys={sys} />}
        </>
      )}
    </div>
  )
}
