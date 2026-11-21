import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { MiniPalette } from '../components/generator/Panels'
import { AccessibilityTab } from '../components/system/AccessibilityTab'
import { PreviewTab } from '../components/system/PreviewTab'
import { RolesTab } from '../components/system/RolesTab'
import { ScalesTab, TokensTab } from '../components/system/ScalesTokensTabs'
import { TypeTab } from '../components/system/TypeTab'
import { useDesignSystem } from '../components/system/useDesignSystem'
import { CodeBlock, Segmented, useToast } from '../components/ui'
import { downloadText } from '../lib/exports'
import { loadFonts } from '../lib/fonts'
import { setSystem } from '../lib/storage'
import { buildTokens, checkPairs, systemFromPalette, type DesignSystem, type Mode } from '../lib/system'
import { exportTokens, TOKEN_FORMATS, type TokenFormat } from '../lib/tokens'
import { useGenerator } from '../state/GeneratorContext'

type Tab = 'roles' | 'scales' | 'tokens' | 'type' | 'a11y' | 'preview' | 'export'
const TAB_KEY = 'd5wt:systemTab'

function ExportTab({ sys }: { sys: DesignSystem }) {
  const [format, setFormat] = useState<TokenFormat>('css')
  const f = TOKEN_FORMATS.find((x) => x.id === format)!
  const code = exportTokens(sys, format)
  const slug = sys.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design-system'
  return (
    <div className="stack">
      <div className="row wrap">
        <label className="field grow">
          <span className="field-label">Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as TokenFormat)}>
            {TOKEN_FORMATS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => downloadText(code, `${slug}-tokens.${f.ext}`)}>
          <Icon name="download" size={16} /> Download .{f.ext}
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {f.note}
      </p>
      <CodeBlock code={code} label={f.label} />
      <p className="muted small">Divi 5 global colours, variables and presets come in Phase 4 (once the sample Divi export file is available).</p>
    </div>
  )
}

export default function SystemPage() {
  const { state } = useGenerator()
  const toast = useToast()
  const { sys, update } = useDesignSystem()
  const palette = state.present.map((s) => s.hex)
  const [tab, setTabState] = useState<Tab>(() => {
    try {
      return (localStorage.getItem(TAB_KEY) as Tab) || 'roles'
    } catch {
      return 'roles'
    }
  })
  const [mode, setMode] = useState<Mode>('light')
  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (sys) loadFonts([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)
  }, [sys?.fonts.heading, sys?.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!sys) {
    return (
      <div className="page system-page">
        <header className="page-head">
          <h1>Design system</h1>
          <p className="muted">
            Turn a palette into a complete, accessible colour system: roles, 50–950 scales, light and dark tokens, contrast checks, a live website preview and
            ready-to-use code.
          </p>
        </header>
        <div className="system-empty">
          <MiniPalette hexes={palette} />
          <button className="btn btn-primary" onClick={() => setSystem(systemFromPalette(palette))}>
            <Icon name="wand" size={16} /> Create from current palette
          </button>
          <p className="muted small">
            Uses the palette that's open in the <Link to="/generate">generator</Link>. You can change every role afterwards.
          </p>
        </div>
      </div>
    )
  }

  const fails = (['light', 'dark'] as Mode[]).reduce((n, m) => n + checkPairs(buildTokens(sys, m)).filter((r) => !r.pass).length, 0)
  const showMode = tab === 'a11y' || tab === 'preview'

  return (
    <div className="page system-page">
      <header className="page-head row space-between wrap">
        <div className="grow">
          <input className="system-name" value={sys.name} onChange={(e) => update((s) => void (s.name = e.target.value))} aria-label="Design system name" />
          <p className="muted small" style={{ margin: 0 }}>
            Saved automatically in this browser and included when you save a session.
          </p>
        </div>
        <div className="row wrap">
          <button
            className="btn"
            onClick={() => {
              if (!confirm('Rebuild roles from the current generator palette? Fonts, typography and radius are kept; overrides are cleared.')) return
              const fresh = systemFromPalette(palette, sys.name)
              setSystem({ ...fresh, fonts: sys.fonts, radius: sys.radius, notes: sys.notes, type: sys.type })
              toast('Rebuilt from current palette')
            }}
          >
            <Icon name="wand" size={16} /> Rebuild from palette
          </button>
          <Link className="btn btn-dark" to="/brand-kit">
            <Icon name="layout" size={16} /> Brand kit
          </Link>
        </div>
      </header>

      <div className="row wrap space-between system-tabs">
        <Segmented
          label="Section"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'roles', label: 'Roles' },
            { id: 'scales', label: 'Scales' },
            { id: 'tokens', label: 'Tokens' },
            { id: 'type', label: 'Type' },
            { id: 'a11y', label: fails ? `Accessibility (${fails})` : 'Accessibility ✓' },
            { id: 'preview', label: 'Preview' },
            { id: 'export', label: 'Export' },
          ]}
        />
        {showMode && (
          <Segmented
            label="Colour mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
            ]}
          />
        )}
      </div>

      {tab === 'roles' && <RolesTab sys={sys} palette={palette} update={update} />}
      {tab === 'scales' && <ScalesTab sys={sys} />}
      {tab === 'tokens' && <TokensTab sys={sys} update={update} />}
      {tab === 'type' && <TypeTab sys={sys} update={update} />}
      {tab === 'a11y' && <AccessibilityTab sys={sys} mode={mode} update={update} />}
      {tab === 'preview' && <PreviewTab sys={sys} mode={mode} />}
      {tab === 'export' && <ExportTab sys={sys} />}
    </div>
  )
}
