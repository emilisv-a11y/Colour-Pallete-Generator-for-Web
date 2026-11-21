import { differenceCiede2000 } from 'culori'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ColorField, Segmented, useCopy } from '../components/ui'
import { TAILWIND, TAILWIND_FLAT, TW_STEPS } from '../data/tailwind'
import { formatColor, readableOn } from '../lib/color'
import { paletteSlug } from '../lib/exports'

type CopyAs = 'hex' | 'class' | 'var' | 'oklch'
const deltaE = differenceCiede2000()

export function nearestTailwind(hex: string, count = 3) {
  return TAILWIND_FLAT.map((t) => ({ ...t, d: deltaE(hex, t.hex) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
}

export default function TailwindPage() {
  const copy = useCopy()
  const [as, setAs] = useState<CopyAs>('hex')
  const [probe, setProbe] = useState('#2a9d8f')
  const nearest = nearestTailwind(probe, 4)

  const valueFor = (name: string, step: number, hex: string) =>
    as === 'hex' ? hex.toUpperCase() : as === 'class' ? `bg-${name}-${step}` : as === 'var' ? `var(--color-${name}-${step})` : formatColor(hex, 'oklch')

  return (
    <div className="page tailwind-page">
      <header className="page-head">
        <h1>Tailwind colours</h1>
        <p className="muted">The default Tailwind CSS palette. Click any swatch to copy it. v4 defines the same scale in OKLCH, so these values match closely in both versions.</p>
      </header>

      <div className="row wrap">
        <span className="field-label">Copy as</span>
        <Segmented
          label="Copy as"
          value={as}
          onChange={setAs}
          options={[
            { id: 'hex', label: 'HEX' },
            { id: 'class', label: 'Class' },
            { id: 'var', label: 'CSS var (v4)' },
            { id: 'oklch', label: 'OKLCH' },
          ]}
        />
      </div>

      <div className="tw-grid" role="table" aria-label="Tailwind colour palette">
        <div className="tw-row tw-head" role="row">
          <span />
          {TW_STEPS.map((s) => (
            <span key={s} role="columnheader">
              {s}
            </span>
          ))}
        </div>
        {TAILWIND.map((c) => (
          <div key={c.name} className="tw-row" role="row">
            <span className="tw-name" role="rowheader">
              {c.name}
              <Link
                to={`/generate/${paletteSlug([1, 3, 5, 7, 9].map((i) => c.shades[i].hex))}`}
                className="tw-open"
                title={`Open ${c.name} 100–900 in the generator`}
                aria-label={`Open ${c.name} in generator`}
              >
                <Icon name="external" size={13} />
              </Link>
            </span>
            {c.shades.map((s) => (
              <button
                key={s.step}
                role="cell"
                className="tw-cell"
                style={{ background: s.hex, color: readableOn(s.hex) }}
                onClick={() => copy(valueFor(c.name, s.step, s.hex))}
                title={`${c.name}-${s.step} · ${s.hex.toUpperCase()}`}
                aria-label={`${c.name} ${s.step}, ${s.hex}`}
              >
                <span>{s.hex.slice(1).toUpperCase()}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <section className="tw-nearest">
        <h2>Find the nearest Tailwind colour</h2>
        <p className="muted small">Uses the CIEDE2000 colour difference. Under 2 is barely visible, under 5 is a close match.</p>
        <div className="tw-nearest-layout">
          <div style={{ maxWidth: 260 }}>
            <ColorField value={probe} onChange={setProbe} label="Your colour" />
          </div>
          <div className="stack grow">
            {nearest.map((n) => (
              <button key={`${n.name}-${n.step}`} className="nearest-row" onClick={() => copy(valueFor(n.name, n.step, n.hex))}>
                <span className="vision-swatch" style={{ background: probe }} />
                <span className="vision-swatch" style={{ background: n.hex }} />
                <span className="grow">
                  <strong>
                    {n.name}-{n.step}
                  </strong>{' '}
                  <span className="muted small">{n.hex.toUpperCase()}</span>
                </span>
                <span className={`badge ${n.d < 2 ? 'pass' : n.d < 5 ? 'pass' : 'fail'}`}>ΔE {n.d.toFixed(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
