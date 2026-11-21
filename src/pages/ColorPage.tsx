import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useCopy } from '../components/ui'
import {
  contrastRatio,
  FORMATS,
  formatColor,
  HARMONIES,
  hexToOklch,
  luminance,
  monochromatic,
  normalizeHex,
  harmony,
  randomHex,
  ratingLabel,
  readableOn,
  simulateVision,
  tintsAndShades,
  VISIONS,
} from '../lib/color'
import { loadNames, nearestNames, useColorNames } from '../lib/names'
import { paletteSlug } from '../lib/exports'
import { isSavedColor, toggleSavedColor, useStorageVersion } from '../lib/storage'

function SwatchRow({ hexes, highlight }: { hexes: string[]; highlight?: string }) {
  return (
    <div className="swatch-row">
      {hexes.map((h, i) => (
        <Link key={i} to={`/color/${h.slice(1)}`} className={`swatch-cell ${h === highlight ? 'current' : ''}`} style={{ background: h, color: readableOn(h) }} title={h.toUpperCase()}>
          <span>{h.slice(1).toUpperCase()}</span>
        </Link>
      ))}
    </div>
  )
}

export function ColorSearch({ initial = '' }: { initial?: string }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(initial)
  const hex = normalizeHex(q)
  return (
    <form
      className="color-search"
      onSubmit={(e) => {
        e.preventDefault()
        if (hex) navigate(`/color/${hex.slice(1)}`)
      }}
    >
      <Icon name="search" size={16} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a colour: #2a9d8f, rgb(…), tomato…" aria-label="Search a colour" spellCheck={false} />
      {hex && <span className="chip" style={{ background: hex }} />}
      <button className="btn btn-small" type="submit" disabled={!hex}>
        Go
      </button>
    </form>
  )
}

export default function ColorPage() {
  const { hex: param } = useParams()
  const navigate = useNavigate()
  const copy = useCopy()
  useStorageVersion()
  const { ready, name } = useColorNames()
  const hex = normalizeHex(param ?? '')
  const [similar, setSimilar] = useState<{ hex: string; name: string }[]>([])

  useEffect(() => {
    if (!hex) return
    loadNames().then(() => setSimilar(nearestNames(hex, 9).filter((n) => n.hex !== hex).slice(0, 8)))
  }, [hex, ready])

  if (!hex) {
    return (
      <div className="page">
        <h1>Colour details</h1>
        <p className="muted">Search for any colour to see its values, shades, harmonies and accessibility.</p>
        <ColorSearch />
        <div className="row">
          <button className="btn" onClick={() => navigate(`/color/${randomHex().slice(1)}`)}>
            Show me a random colour
          </button>
        </div>
      </div>
    )
  }

  const fg = readableOn(hex)
  const { tints, shades } = tintsAndShades(hex, 9)
  const onWhite = contrastRatio(hex, '#ffffff')
  const onBlack = contrastRatio(hex, '#000000')
  const o = hexToOklch(hex)

  return (
    <div className="page color-page">
      <div className="color-hero" style={{ background: hex, color: fg }}>
        <div>
          <div className="eyebrow">{ready ? name(hex) : '…'}</div>
          <h1>{hex.toUpperCase()}</h1>
          <div className="small">
            Luminance {(luminance(hex) * 100).toFixed(1)}% · {o.l > 0.78 ? 'Light' : o.l > 0.45 ? 'Mid-tone' : 'Dark'} ·{' '}
            {o.c < 0.03 ? 'Neutral' : o.c < 0.1 ? 'Muted' : 'Vivid'}
          </div>
        </div>
        <div className="row wrap">
          <button className="btn btn-glass" onClick={() => copy(hex.toUpperCase())}>
            <Icon name="copy" size={16} /> Copy
          </button>
          <button className="btn btn-glass" onClick={() => toggleSavedColor(hex)} aria-pressed={isSavedColor(hex)}>
            <Icon name={isSavedColor(hex) ? 'check' : 'heart'} size={16} /> {isSavedColor(hex) ? 'Saved' : 'Save colour'}
          </button>
          <Link className="btn btn-glass" to={`/generate/${paletteSlug(harmony(hex, [0, 150, 210]).concat(monochromatic(hex, 2)))}`}>
            <Icon name="wand" size={16} /> Palette from this
          </Link>
          <Link className="btn btn-glass" to={`/contrast/${readableOn(hex).slice(1)}/${hex.slice(1)}`}>
            Check contrast
          </Link>
        </div>
      </div>

      <ColorSearch />

      <section>
        <h2>Colour values</h2>
        <div className="values-grid">
          {FORMATS.map((f) => (
            <button key={f.id} className="value-card" onClick={() => copy(formatColor(hex, f.id), f.label)}>
              <span className="field-label">{f.label}</span>
              <code>{formatColor(hex, f.id)}</code>
              <Icon name="copy" size={14} />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Tints</h2>
        <SwatchRow hexes={[hex, ...tints]} highlight={hex} />
        <h2>Shades</h2>
        <SwatchRow hexes={[hex, ...shades]} highlight={hex} />
      </section>

      <section>
        <h2>Colour harmonies</h2>
        <div className="harmony-grid">
          {HARMONIES.map((h) => {
            const hs = harmony(hex, h.offsets)
            return (
              <div key={h.id} className="harmony">
                <div className="row space-between">
                  <h3>{h.label}</h3>
                  <Link className="btn btn-small" to={`/generate/${paletteSlug(hs)}`}>
                    Open
                  </Link>
                </div>
                <SwatchRow hexes={hs} highlight={hex} />
              </div>
            )
          })}
          <div className="harmony">
            <div className="row space-between">
              <h3>Monochromatic</h3>
              <Link className="btn btn-small" to={`/generate/${paletteSlug(monochromatic(hex))}`}>
                Open
              </Link>
            </div>
            <SwatchRow hexes={monochromatic(hex)} />
          </div>
        </div>
      </section>

      <section>
        <h2>Contrast</h2>
        <div className="contrast-cards">
          {[
            { bg: '#ffffff', ratio: onWhite, label: 'On white' },
            { bg: '#000000', ratio: onBlack, label: 'On black' },
          ].map((c) => (
            <div key={c.bg} className="contrast-card" style={{ background: c.bg, color: hex }}>
              <div className="big">Aa</div>
              <div>
                <strong>{c.ratio.toFixed(2)}:1</strong> <span className={`badge ${ratingLabel(c.ratio) === 'Fail' ? 'fail' : 'pass'}`}>{ratingLabel(c.ratio)}</span>
              </div>
              <div className="small" style={{ color: c.bg === '#ffffff' ? '#444' : '#bbb' }}>
                {c.label}
              </div>
            </div>
          ))}
          <div className="contrast-card" style={{ background: hex, color: fg }}>
            <div className="big">Aa</div>
            <div>
              <strong>{contrastRatio(hex, fg).toFixed(2)}:1</strong>
            </div>
            <div className="small">Best text colour: {fg === '#000000' ? 'black' : 'white'}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Colour blindness</h2>
        <div className="vision-grid">
          {VISIONS.map((v) => {
            const s = simulateVision(hex, v.id)
            return (
              <div key={v.id} className="vision-cell">
                <span className="vision-swatch" style={{ background: s }} />
                <div>
                  <strong>{v.label}</strong>
                  <div className="muted small">{s.toUpperCase()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {similar.length > 0 && (
        <section>
          <h2>Similar named colours</h2>
          <div className="similar-grid">
            {similar.map((s) => (
              <Link key={s.hex} to={`/color/${s.hex.slice(1)}`} className="similar">
                <span className="vision-swatch" style={{ background: s.hex }} />
                <span>
                  <strong>{s.name}</strong>
                  <span className="muted small"> {s.hex.toUpperCase()}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
