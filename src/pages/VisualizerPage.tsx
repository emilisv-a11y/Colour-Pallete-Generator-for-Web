import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { MiniPalette } from '../components/generator/Panels'
import { Segmented } from '../components/ui'
import { contrastRatio, hexToOklch, readableOn } from '../lib/color'
import { autoRoles, ROLES, type Roles } from '../lib/roles'
import { paletteSlug } from '../lib/exports'
import { useGenerator } from '../state/GeneratorContext'

function vars(r: Roles): React.CSSProperties {
  return {
    ['--v-bg' as string]: r.background,
    ['--v-surface' as string]: r.surface,
    ['--v-text' as string]: r.text,
    ['--v-primary' as string]: r.primary,
    ['--v-on-primary' as string]: readableOn(r.primary),
    ['--v-accent' as string]: r.accent,
    ['--v-on-accent' as string]: readableOn(r.accent),
    ['--v-muted' as string]: r.muted,
  }
}

function Landing() {
  return (
    <div className="v-landing">
      <nav>
        <b className="v-logo">◆ Northwind</b>
        <span>Product</span>
        <span>Pricing</span>
        <span>About</span>
        <span className="v-btn v-btn-primary small">Sign up</span>
      </nav>
      <div className="v-hero">
        <div>
          <span className="v-pill">New · Spring collection</span>
          <h1>Design that feels like home.</h1>
          <p>Handmade furniture from sustainable oak, delivered to your door in under two weeks.</p>
          <div className="v-actions">
            <span className="v-btn v-btn-primary">Shop now</span>
            <span className="v-btn v-btn-ghost">Learn more</span>
          </div>
        </div>
        <div className="v-hero-art">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="v-features">
        {['Free delivery', '10-year warranty', 'Made to order'].map((t, i) => (
          <div key={t} className="v-card">
            <span className={`v-icon ${i === 1 ? 'alt' : ''}`}>★</span>
            <h3>{t}</h3>
            <p>Thoughtful details in every piece, built to last for generations.</p>
          </div>
        ))}
      </div>
      <footer>© 2026 Northwind Studio · Privacy · Terms</footer>
    </div>
  )
}

function Dashboard() {
  const bars = [40, 65, 52, 80, 70, 95, 60]
  return (
    <div className="v-dash">
      <aside>
        <b className="v-logo">◆ Metrics</b>
        {['Overview', 'Sales', 'Customers', 'Reports', 'Settings'].map((x, i) => (
          <span key={x} className={i === 0 ? 'on' : ''}>
            {x}
          </span>
        ))}
      </aside>
      <div className="v-dash-main">
        <h2>Overview</h2>
        <div className="v-stats">
          {[
            ['Revenue', '$48.2k', '+12%'],
            ['Orders', '1,284', '+4%'],
            ['Visitors', '23.9k', '-2%'],
          ].map(([k, v, d]) => (
            <div key={k} className="v-card">
              <small>{k}</small>
              <strong>{v}</strong>
              <span className={`v-delta ${d.startsWith('-') ? 'down' : ''}`}>{d}</span>
            </div>
          ))}
        </div>
        <div className="v-card v-chart">
          <small>Weekly sales</small>
          <div className="v-bars">
            {bars.map((b, i) => (
              <span key={i} style={{ height: `${b}%` }} className={i === 5 ? 'hi' : ''} />
            ))}
          </div>
        </div>
        <div className="v-card v-table">
          {[
            ['#1042', 'Ava Chen', 'Paid'],
            ['#1041', 'Leo Park', 'Pending'],
            ['#1040', 'Mia Ross', 'Paid'],
          ].map((r) => (
            <div key={r[0]} className="v-tr">
              <span>{r[0]}</span>
              <span>{r[1]}</span>
              <span className={`v-tag ${r[2] === 'Pending' ? 'alt' : ''}`}>{r[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Mobile() {
  return (
    <div className="v-phone-wrap">
      <div className="v-phone">
        <div className="v-phone-head">
          <small>Good morning</small>
          <h2>Your plants</h2>
        </div>
        {['Monstera', 'Fiddle leaf', 'Snake plant'].map((p, i) => (
          <div key={p} className="v-card v-row">
            <span className={`v-avatar ${i === 1 ? 'alt' : ''}`} />
            <div>
              <strong>{p}</strong>
              <small>Water in {i + 1} day{i ? 's' : ''}</small>
            </div>
            <span className="v-check">✓</span>
          </div>
        ))}
        <span className="v-btn v-btn-primary block">Add a plant</span>
        <div className="v-tabbar">
          <span className="on">●</span>
          <span>○</span>
          <span>○</span>
        </div>
      </div>
      <div className="v-phone dark-variant">
        <div className="v-phone-head accent">
          <small>Today</small>
          <h2>Schedule</h2>
        </div>
        {['09:00 Stand-up', '11:30 Design review', '15:00 Client call'].map((p) => (
          <div key={p} className="v-card v-row">
            <span className="v-dot" />
            <strong>{p}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function Poster() {
  return (
    <div className="v-poster">
      <div className="v-poster-shapes">
        <span className="s1" />
        <span className="s2" />
        <span className="s3" />
      </div>
      <div className="v-poster-text">
        <small>Live at the Harbour Hall</small>
        <h1>
          SUMMER
          <br />
          SOUNDS
        </h1>
        <p>12 — 14 July 2026</p>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="v-brand">
      <div className="v-bcard front">
        <span className="v-mark">◆</span>
        <b>Northwind</b>
      </div>
      <div className="v-bcard back">
        <b>Jordan Lee</b>
        <small>Creative Director</small>
        <p>
          hello@northwind.studio
          <br />
          +44 20 7946 0000
        </p>
        <span className="v-stripe" />
      </div>
      <div className="v-swatches">
        {['primary', 'accent', 'text', 'surface', 'bg'].map((r) => (
          <span key={r} style={{ background: `var(--v-${r})` }} />
        ))}
      </div>
    </div>
  )
}

const TEMPLATES = [
  { id: 'landing', label: 'Landing page', C: Landing },
  { id: 'dashboard', label: 'Dashboard', C: Dashboard },
  { id: 'mobile', label: 'Mobile app', C: Mobile },
  { id: 'poster', label: 'Poster', C: Poster },
  { id: 'brand', label: 'Brand', C: Brand },
] as const

export default function VisualizerPage() {
  const { state } = useGenerator()
  const hexes = state.present.map((s) => s.hex)
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]['id']>('landing')
  const [dark, setDark] = useState(false)
  const auto = useMemo(() => autoRoles(hexes, dark), [hexes.join(), dark]) // eslint-disable-line react-hooks/exhaustive-deps
  const [roles, setRoles] = useState<Roles>(auto)
  useEffect(() => setRoles(auto), [auto])
  const T = TEMPLATES.find((t) => t.id === template)!.C
  const textContrast = contrastRatio(roles.text, roles.background)

  const shuffle = () => {
    const pool = [...hexes].sort(() => Math.random() - 0.5)
    const byL = [...pool].sort((a, b) => hexToOklch(b).l - hexToOklch(a).l)
    const [bg, text] = dark ? [byL[byL.length - 1], byL[0]] : [byL[0], byL[byL.length - 1]]
    const others = pool.filter((h) => h !== bg && h !== text)
    setRoles({ ...roles, background: bg, text, primary: others[0] ?? roles.primary, accent: others[1] ?? roles.accent, surface: others[2] && Math.abs(hexToOklch(others[2]).l - hexToOklch(bg).l) < 0.15 ? others[2] : roles.surface })
  }

  return (
    <div className="page visualizer-page">
      <header className="page-head row space-between wrap">
        <div>
          <h1>Palette visualizer</h1>
          <p className="muted">Your current generator palette on real designs. Roles are picked automatically; change any of them below.</p>
        </div>
        <Link className="btn" to={`/generate/${paletteSlug(hexes)}`}>
          <Icon name="arrowLeft" size={16} /> Back to generator
        </Link>
      </header>

      <div className="row wrap">
        <Segmented label="Template" value={template} onChange={setTemplate} options={TEMPLATES.map(({ id, label }) => ({ id, label }))} />
        <Segmented
          label="Mode"
          value={dark ? 'dark' : 'light'}
          onChange={(v) => setDark(v === 'dark')}
          options={[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
          ]}
        />
        <button className="btn" onClick={shuffle}>
          <Icon name="wand" size={16} /> Shuffle roles
        </button>
        <button className="btn" onClick={() => setRoles(auto)}>
          Reset
        </button>
      </div>

      <div className="role-pickers">
        {ROLES.map((r) => (
          <div key={r} className="role-picker">
            <span className="field-label">{r}</span>
            <div className="row wrap">
              {[...new Set([...hexes, roles[r]])].map((h) => (
                <button
                  key={h}
                  className={`chip-btn ${roles[r] === h ? 'selected' : ''}`}
                  style={{ background: h }}
                  onClick={() => setRoles({ ...roles, [r]: h })}
                  aria-label={`Use ${h} for ${r}`}
                  aria-pressed={roles[r] === h}
                  title={h.toUpperCase()}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className={`small ${textContrast >= 4.5 ? 'muted' : 'warn'}`}>
        Text on background contrast: <strong>{textContrast.toFixed(2)}:1</strong> {textContrast >= 4.5 ? '(passes AA)' : '(below AA 4.5:1; choose a darker text or lighter background)'}
      </p>

      <div className="v-frame" style={vars(roles)}>
        <T />
      </div>
      <MiniPalette hexes={hexes} />
    </div>
  )
}
