import { simulateVision, VISIONS, type VisionId } from '../lib/color'
import type { Tokens } from '../lib/system'

/** "See as…" picker for colour-blindness simulation. */
export function VisionSelect({ value, onChange }: { value: VisionId; onChange: (v: VisionId) => void }) {
  return (
    <label className="field vision-select">
      <span className="field-label">See as</span>
      <select value={value} onChange={(e) => onChange(e.target.value as VisionId)}>
        {VISIONS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
            {v.note ? ` · ${v.note}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Tokens as someone with this type of colour vision would see them. */
export function simulateTokens(t: Tokens, vision: VisionId): Tokens {
  if (vision === 'normal') return t
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { ...v, hex: simulateVision(v.hex, vision) }])) as Tokens
}

/** Any object of colour strings (e.g. a section style), simulated recursively. */
export function simulateDeep<T>(value: T, vision: VisionId): T {
  if (vision === 'normal') return value
  if (typeof value === 'string') return (/^#[0-9a-f]{6}$/i.test(value) ? simulateVision(value, vision) : value) as T
  if (Array.isArray(value)) return value.map((x) => simulateDeep(x, vision)) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, simulateDeep(v, vision)])) as T
  return value
}
