import { useState } from 'react'
import { apcaContrast, apcaLabel } from '../../lib/apca'
import { contrastRatio } from '../../lib/color'
import { buildTokens, checkPairs, suggestFix, type DesignSystem, type Mode } from '../../lib/system'
import { Icon } from '../Icon'
import { Segmented, useToast } from '../ui'

const MATRIX_FG = ['text', 'text-muted', 'primary-text', 'secondary-text', 'accent-text', 'success-text', 'warning-text', 'error-text', 'info-text', 'on-primary', 'on-secondary', 'on-accent']
const MATRIX_BG = ['bg', 'surface', 'surface-raised', 'primary', 'secondary', 'accent', 'primary-subtle', 'success-subtle', 'warning-subtle', 'error-subtle']

export function AccessibilityTab({ sys, mode, update }: { sys: DesignSystem; mode: Mode; update: (fn: (s: DesignSystem) => void) => void }) {
  const toast = useToast()
  const [algo, setAlgo] = useState<'wcag' | 'apca'>('wcag')
  const [onlyFails, setOnlyFails] = useState(false)
  const tokens = buildTokens(sys, mode)
  const results = checkPairs(tokens, algo)
  const passing = results.filter((r) => r.pass).length
  const fails = results.filter((r) => !r.pass)

  const applyFix = (r: (typeof results)[number]) => {
    const fix = suggestFix(tokens, r, algo)
    if (!fix) return toast('No fix found for this pair')
    update((s) => void (s.overrides[mode][fix.token] = fix.hex))
    toast(`Set ${fix.token} to ${fix.hex.toUpperCase()}`)
  }

  return (
    <div className="stack">
      <div className="row wrap">
        <Segmented
          label="Contrast method"
          value={algo}
          onChange={setAlgo}
          options={[
            { id: 'wcag', label: 'WCAG 2.2' },
            { id: 'apca', label: 'APCA (WCAG 3 draft)' },
          ]}
        />
        <label className="row small">
          <input type="checkbox" checked={onlyFails} onChange={(e) => setOnlyFails(e.target.checked)} /> Only show failures
        </label>
        {fails.length > 1 && (
          <button className="btn btn-small" onClick={() => fails.forEach((f) => applyFix(f))}>
            <Icon name="wand" size={14} /> Fix all
          </button>
        )}
      </div>

      <div className={`a11y-summary ${fails.length ? 'has-fails' : ''}`}>
        <strong>
          {passing} of {results.length}
        </strong>{' '}
        promised pairs pass in {mode} mode {algo === 'wcag' ? '(WCAG 2.2 AA)' : '(APCA Lc targets)'}.
        {fails.length === 0 && ' Everything people need to read is readable.'}
      </div>
      {algo === 'apca' && (
        <p className="muted small" style={{ margin: 0 }}>
          APCA is the draft method for WCAG 3. It is stricter than WCAG 2.2, especially for light text on dark backgrounds, so expect more failures here. The
          automatic tokens are tuned to WCAG 2.2 AA, today's legal standard. Use Fix to tighten individual pairs if you want APCA compliance too.
        </p>
      )}

      <ul className="pair-list">
        {results
          .filter((r) => !onlyFails || !r.pass)
          .map((r) => (
            <li key={`${r.fg}/${r.bg}`} className={r.pass ? 'pass' : 'fail'}>
              <span className="pair-chip" style={{ background: tokens[r.bg].hex, color: tokens[r.fg].hex }}>
                Aa
              </span>
              <div className="grow">
                <strong>{r.label}</strong>
                <div className="muted small">
                  <code>{r.fg}</code> on <code>{r.bg}</code> · needs {algo === 'wcag' ? `${r.min}:1` : `Lc ${r.apca}`}
                </div>
              </div>
              <span className="pair-score">
                {algo === 'wcag' ? `${r.ratio.toFixed(2)}:1` : `Lc ${Math.abs(r.lc).toFixed(0)}`}
              </span>
              <span className={`badge ${r.pass ? 'pass' : 'fail'}`}>{r.pass ? 'Pass' : 'Fail'}</span>
              {!r.pass ? (
                <button className="btn btn-small" onClick={() => applyFix(r)}>
                  Fix
                </button>
              ) : (
                <span className="fix-spacer" />
              )}
            </li>
          ))}
      </ul>

      <section>
        <h2>Contrast matrix</h2>
        <p className="muted small">
          Every text token against every background token in {mode} mode. Not every combination is meant to be used. Use this to see which ones are safe.
          {algo === 'apca' && ' APCA values: 75+ body text, 60+ buttons and content, 45+ headlines, 30+ icons and borders.'}
        </p>
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th />
                {MATRIX_BG.map((b) => (
                  <th key={b} scope="col">
                    <span className="matrix-head-chip" style={{ background: tokens[b].hex }} />
                    {b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_FG.map((f) => (
                <tr key={f}>
                  <th scope="row">{f}</th>
                  {MATRIX_BG.map((b) => {
                    const fg = tokens[f].hex,
                      bg = tokens[b].hex
                    const ratio = contrastRatio(fg, bg)
                    const lc = Math.abs(apcaContrast(fg, bg))
                    const level = algo === 'wcag' ? (ratio >= 7 ? 'aaa' : ratio >= 4.5 ? 'aa' : ratio >= 3 ? 'large' : 'fail') : lc >= 75 ? 'aaa' : lc >= 60 ? 'aa' : lc >= 45 ? 'large' : 'fail'
                    return (
                      <td key={b} className={`m-${level}`} style={{ background: bg, color: fg }} title={algo === 'wcag' ? `${ratio.toFixed(2)}:1` : `Lc ${lc.toFixed(0)}: ${apcaLabel(lc)}`}>
                        <b>Aa</b>
                        <span>{algo === 'wcag' ? ratio.toFixed(1) : lc.toFixed(0)}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row wrap small matrix-legend">
          <span className="m-key m-aaa">{algo === 'wcag' ? 'AAA 7+' : 'Lc 75+'}</span>
          <span className="m-key m-aa">{algo === 'wcag' ? 'AA 4.5+' : 'Lc 60+'}</span>
          <span className="m-key m-large">{algo === 'wcag' ? 'Large text 3+' : 'Lc 45+'}</span>
          <span className="m-key m-fail">Fail</span>
        </div>
      </section>
    </div>
  )
}
