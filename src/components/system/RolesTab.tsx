import { useState } from 'react'
import { readableOn } from '../../lib/color'
import { FONTS, fontStack } from '../../lib/fonts'
import { autoAnchor, buildScale, defaultStatus, ROLE_INFO, ROLE_KEYS, STEPS, type DesignSystem, type RoleKey } from '../../lib/system'
import { Icon } from '../Icon'
import { ColorField, Popover } from '../ui'

function RoleCard({ role, sys, palette, onChange }: { role: RoleKey; sys: DesignSystem; palette: string[]; onChange: (hex: string, anchor: number | null) => void }) {
  const [open, setOpen] = useState(false)
  const r = sys.roles[role]
  const scale = buildScale(r.hex, r.anchor)
  const anchor = r.anchor ?? autoAnchor(r.hex)
  return (
    <article className="role-card">
      <div className="pop-anchor">
        <button className="role-swatch" style={{ background: r.hex, color: readableOn(r.hex) }} onClick={() => setOpen(true)} aria-label={`Edit ${ROLE_INFO[role].label} colour`}>
          <span>{r.hex.toUpperCase()}</span>
          <Icon name="edit" size={14} />
        </button>
        {open && (
          <Popover onClose={() => setOpen(false)} className="role-pop">
            <ColorField value={r.hex} onChange={(hex) => onChange(hex, r.anchor)} />
          </Popover>
        )}
      </div>
      <div className="role-body">
        <div className="row space-between">
          <h3>{ROLE_INFO[role].label}</h3>
          <label className="anchor-select" title="Which scale step is exactly this colour">
            <span className="sr-only">Scale step for {ROLE_INFO[role].label}</span>
            <select value={r.anchor ?? 'auto'} onChange={(e) => onChange(r.hex, e.target.value === 'auto' ? null : Number(e.target.value))}>
              <option value="auto">Auto ({STEPS[autoAnchor(r.hex)]})</option>
              {STEPS.map((s, i) => (
                <option key={s} value={i}>
                  Sits at {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small">{ROLE_INFO[role].hint}</p>
        <div className="mini-scale">
          {scale.map((h, i) => (
            <span key={i} className={i === anchor ? 'anchor' : ''} style={{ background: h }} title={`${STEPS[i]} · ${h.toUpperCase()}`} />
          ))}
        </div>
        {palette.length > 0 && (
          <div className="row wrap role-chips">
            {palette.map((h, i) => (
              <button key={`${h}-${i}`} className={`chip-btn small ${h === r.hex ? 'selected' : ''}`} style={{ background: h }} onClick={() => onChange(h, null)} aria-label={`Use ${h}`} title={`Use ${h.toUpperCase()}`} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export function RolesTab({ sys, palette, update }: { sys: DesignSystem; palette: string[]; update: (fn: (s: DesignSystem) => void) => void }) {
  return (
    <div className="stack">
      <div className="role-grid">
        {ROLE_KEYS.map((role) => (
          <RoleCard
            key={role}
            role={role}
            sys={sys}
            palette={palette}
            onChange={(hex, anchor) =>
              update((s) => {
                s.roles[role] = { hex, anchor }
              })
            }
          />
        ))}
      </div>
      <div className="row wrap">
        <button
          className="btn"
          onClick={() =>
            update((s) => {
              const st = defaultStatus(s.roles.primary.hex)
              ;(['success', 'warning', 'error', 'info'] as const).forEach((k) => (s.roles[k] = { hex: st[k], anchor: null }))
            })
          }
        >
          <Icon name="wand" size={16} /> Re-tune status colours to primary
        </button>
      </div>

      <section className="type-card">
        <h2>Typography &amp; shape</h2>
        <div className="type-grid">
          <label className="field">
            <span className="field-label">Heading font</span>
            <select value={sys.fonts.heading} onChange={(e) => update((s) => void (s.fonts.heading = e.target.value))}>
              {FONTS.map((f) => (
                <option key={f.family}>{f.family}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Body font</span>
            <select value={sys.fonts.body} onChange={(e) => update((s) => void (s.fonts.body = e.target.value))}>
              {FONTS.map((f) => (
                <option key={f.family}>{f.family}</option>
              ))}
            </select>
          </label>
          <label className="slider">
            <span className="row space-between">
              <span>Corner radius</span>
              <span className="muted">{sys.radius}px</span>
            </span>
            <input type="range" min={0} max={28} value={sys.radius} onChange={(e) => update((s) => void (s.radius = Number(e.target.value)))} />
          </label>
        </div>
        <div className="type-sample" style={{ borderRadius: sys.radius }}>
          <h3 style={{ fontFamily: fontStack(sys.fonts.heading) }}>Good design is as little design as possible</h3>
          <p style={{ fontFamily: fontStack(sys.fonts.body) }}>
            Body copy in {sys.fonts.body}. A comfortable line length is 60–75 characters, with a line height around 1.5 for easy reading on screens of every size.
          </p>
        </div>
      </section>
    </div>
  )
}
