import { useState } from 'react'
import { contrastRatio, formatColor, readableOn } from '../../lib/color'
import {
  autoAnchor,
  buildScales,
  buildTokens,
  NEUTRAL_TOKENS,
  ROLE_INFO,
  ROLE_KEYS,
  ROLE_TOKEN_SUFFIXES,
  roleToken,
  STEPS,
  TOKEN_ROLES,
  type DesignSystem,
  type Mode,
} from '../../lib/system'
import { Icon } from '../Icon'
import { ColorField, Popover, Segmented, useCopy } from '../ui'

export function ScalesTab({ sys }: { sys: DesignSystem }) {
  const copy = useCopy()
  const [fmt, setFmt] = useState<'hex' | 'oklch'>('hex')
  const scales = buildScales(sys)
  return (
    <div className="stack">
      <div className="row wrap space-between">
        <p className="muted small" style={{ margin: 0 }}>
          Each role becomes an 11-step scale. The outlined step is your exact colour. Dots show which text passes AA on that step: <b>W</b> white, <b>B</b> black.
        </p>
        <Segmented
          label="Value format"
          value={fmt}
          onChange={setFmt}
          options={[
            { id: 'hex', label: 'HEX' },
            { id: 'oklch', label: 'OKLCH' },
          ]}
        />
      </div>
      <div className="tw-grid" role="table" aria-label="Colour scales">
        <div className="tw-row tw-head" role="row">
          <span />
          {STEPS.map((s) => (
            <span key={s} role="columnheader">
              {s}
            </span>
          ))}
        </div>
        {ROLE_KEYS.map((r) => {
          const anchor = sys.roles[r].anchor ?? autoAnchor(sys.roles[r].hex)
          return (
            <div key={r} className="tw-row" role="row">
              <span className="tw-name" role="rowheader">
                {ROLE_INFO[r].label}
              </span>
              {scales[r].map((h, i) => (
                <button
                  key={i}
                  role="cell"
                  className={`tw-cell scale-cell ${i === anchor ? 'anchor' : ''}`}
                  style={{ background: h, color: readableOn(h) }}
                  onClick={() => copy(fmt === 'hex' ? h.toUpperCase() : formatColor(h, 'oklch'))}
                  title={`${r}-${STEPS[i]} · ${h.toUpperCase()} · click to copy`}
                >
                  <span className="scale-val">{fmt === 'hex' ? h.slice(1).toUpperCase() : formatColor(h, 'oklch').replace(/^oklch\(|\)$/g, '')}</span>
                  <span className="aa-dots">
                    {contrastRatio(h, '#ffffff') >= 4.5 && <i>W</i>}
                    {contrastRatio(h, '#000000') >= 4.5 && <i>B</i>}
                  </span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TokenRow({ name, hex, refName, overridden, onOverride, onReset }: { name: string; hex: string; refName: string | null; overridden?: boolean; onOverride: (hex: string) => void; onReset: () => void }) {
  const [open, setOpen] = useState(false)
  const copy = useCopy()
  return (
    <li className="token-row">
      <div className="pop-anchor">
        <button className="token-swatch" style={{ background: hex }} onClick={() => setOpen(true)} aria-label={`Override ${name}`} title="Click to override" />
        {open && (
          <Popover onClose={() => setOpen(false)} className="token-pop">
            <ColorField value={hex} onChange={onOverride} />
          </Popover>
        )}
      </div>
      <button className="token-name" onClick={() => copy(`var(--${name})`)} title="Copy var()">
        {name}
      </button>
      <span className="token-ref muted small">{overridden ? <span className="tag warn-tag">override</span> : refName}</span>
      <code className="small">{hex.toUpperCase()}</code>
      {overridden ? (
        <button className="icon-btn" onClick={onReset} aria-label={`Reset ${name}`} title="Back to automatic">
          <Icon name="undo" size={14} />
        </button>
      ) : (
        <span className="icon-spacer" />
      )}
    </li>
  )
}

export function TokensTab({ sys, update }: { sys: DesignSystem; update: (fn: (s: DesignSystem) => void) => void }) {
  const scales = buildScales(sys)
  const groups: { title: string; names: string[] }[] = [
    { title: 'Neutral', names: [...NEUTRAL_TOKENS] },
    ...TOKEN_ROLES.map((r) => ({ title: ROLE_INFO[r].label, names: ROLE_TOKEN_SUFFIXES.map((v) => roleToken(r, v)) })),
  ]
  const overrideCount = Object.keys(sys.overrides.light).length + Object.keys(sys.overrides.dark).length
  return (
    <div className="stack">
      <div className="row wrap space-between">
        <p className="muted small" style={{ margin: 0 }}>
          Semantic tokens are what you build with: <code>bg</code>, <code>text</code>, <code>primary</code>, <code>on-primary</code>… Each points at a scale step chosen so its text pairs pass WCAG AA. Click a swatch to override it.
        </p>
        {overrideCount > 0 && (
          <button className="btn btn-small" onClick={() => update((s) => void (s.overrides = { light: {}, dark: {} }))}>
            Reset {overrideCount} override{overrideCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
      <div className="token-columns">
        {(['light', 'dark'] as Mode[]).map((mode) => {
          const t = buildTokens(sys, mode, scales)
          return (
            <div key={mode} className={`token-col token-col-${mode}`} style={{ background: t.bg.hex, color: t.text.hex }}>
              <h3 style={{ color: t.text.hex }}>{mode === 'light' ? 'Light mode' : 'Dark mode'}</h3>
              {groups.map((g) => (
                <div key={g.title} className="token-group" style={{ background: t.surface.hex, borderColor: t.border.hex }}>
                  <h4 style={{ color: t['text-muted'].hex }}>{g.title}</h4>
                  <ul>
                    {g.names.map((n) => (
                      <TokenRow
                        key={n}
                        name={n}
                        hex={t[n].hex}
                        refName={t[n].ref}
                        overridden={t[n].overridden}
                        onOverride={(hex) => update((s) => void (s.overrides[mode][n] = hex))}
                        onReset={() => update((s) => void delete s.overrides[mode][n])}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
