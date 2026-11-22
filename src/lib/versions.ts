/* ============================================================================
   Version history for the design system. Versions live in the project's
   working data (d5wt:systemVersions), so they switch with the project and sync.
   ========================================================================== */

import { effectsOf } from './effects'
import { onBeforeSystemWrite, read, uid, write } from './storage'
import { ROLE_INFO, ROLE_KEYS, typeOf, type DesignSystem } from './system'

export const VERSIONS_KEY = 'd5wt:systemVersions'
export const AUTO_GAP = 15 * 60 * 1000 // an automatic version at most every 15 minutes of editing
const MAX_AUTO = 20
const MAX_TOTAL = 60

export type SystemVersion = { id: string; at: number; label: string; auto: boolean; system: DesignSystem }

export const getVersions = () => read<SystemVersion[]>(VERSIONS_KEY, [])

function prune(list: SystemVersion[]) {
  // keep every named version; drop the oldest automatic ones first
  const sorted = [...list].sort((a, b) => b.at - a.at)
  let autos = 0
  const kept = sorted.filter((v) => !v.auto || ++autos <= MAX_AUTO)
  return kept.slice(0, MAX_TOTAL)
}

const same = (a: DesignSystem, b: DesignSystem) => JSON.stringify(a) === JSON.stringify(b)

export function saveVersion(system: DesignSystem, label: string, auto = false, now = Date.now()): SystemVersion {
  const v: SystemVersion = { id: uid(), at: now, label: label.trim() || 'Saved version', auto, system: structuredClone(system) }
  write(VERSIONS_KEY, prune([v, ...getVersions()]))
  return v
}

/**
 * Called before the design system is overwritten: keeps the previous state as an automatic version
 * when the last version is older than AUTO_GAP (so a session of edits can always be undone).
 */
export function autoVersion(previous: DesignSystem | null, now = Date.now()) {
  if (!previous) return
  const list = getVersions()
  const last = list[0]
  if (last && now - last.at < AUTO_GAP) return
  if (last && same(last.system, previous)) return
  saveVersion(previous, `Before changes · ${new Date(now).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`, true, now)
}

export function deleteVersion(id: string) {
  write(
    VERSIONS_KEY,
    getVersions().filter((v) => v.id !== id),
  )
}

export function renameVersion(id: string, label: string) {
  write(
    VERSIONS_KEY,
    getVersions().map((v) => (v.id === id ? { ...v, label, auto: false } : v)),
  )
}

/* ---------- differences ---------- */

export type SystemChange = { area: 'Colours' | 'Fonts' | 'Shape' | 'Type' | 'Motion & sizes' | 'Tokens' | 'Details'; label: string; before: string; after: string; colour?: boolean }

export function diffSystems(a: DesignSystem, b: DesignSystem): SystemChange[] {
  const out: SystemChange[] = []
  const add = (area: SystemChange['area'], label: string, before: unknown, after: unknown, colour = false) => {
    const x = String(before ?? '—'),
      y = String(after ?? '—')
    if (x !== y) out.push({ area, label, before: x, after: y, colour })
  }
  if (a.name !== b.name) add('Details', 'Name', a.name, b.name)
  ROLE_KEYS.forEach((r) => {
    add('Colours', ROLE_INFO[r].label, a.roles[r].hex, b.roles[r].hex, true)
    const anchor = (x: number | null) => (x === null ? 'automatic' : `step ${[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950][x]}`)
    if (a.roles[r].hex === b.roles[r].hex) add('Colours', `${ROLE_INFO[r].label} position in scale`, anchor(a.roles[r].anchor), anchor(b.roles[r].anchor))
  })
  for (const mode of ['light', 'dark'] as const) {
    const keys = new Set([...Object.keys(a.overrides[mode] ?? {}), ...Object.keys(b.overrides[mode] ?? {})])
    keys.forEach((k) => add('Tokens', `${k} (${mode}, manual)`, a.overrides[mode]?.[k], b.overrides[mode]?.[k], true))
  }
  add('Fonts', 'Headings', a.fonts.heading, b.fonts.heading)
  add('Fonts', 'Body text', a.fonts.body, b.fonts.body)
  add('Shape', 'Corner radius', `${a.radius}px`, `${b.radius}px`)
  const ta = typeOf(a),
    tb = typeOf(b)
  add('Type', 'Body size', `${ta.minBase}–${ta.maxBase}px`, `${tb.minBase}–${tb.maxBase}px`)
  add('Type', 'Scale ratio', `${ta.minRatio} → ${ta.maxRatio}`, `${tb.minRatio} → ${tb.maxRatio}`)
  add('Type', 'Screen range', `${ta.minVw}–${ta.maxVw}px`, `${tb.minVw}–${tb.maxVw}px`)
  add('Type', 'Heading steps', ta.stepsUp, tb.stepsUp)
  const ea = effectsOf(a),
    eb = effectsOf(b)
  add('Shape', 'Shadow colour', ea.shadowTint, eb.shadowTint)
  add('Shape', 'Shadow strength', `${ea.shadowStrength}×`, `${eb.shadowStrength}×`)
  add('Shape', 'Borders', `${ea.borders.thin}/${ea.borders.base}/${ea.borders.thick}px`, `${eb.borders.thin}/${eb.borders.base}/${eb.borders.thick}px`)
  add('Motion & sizes', 'Button heights', `${ea.buttons.s}/${ea.buttons.m}/${ea.buttons.l}px`, `${eb.buttons.s}/${eb.buttons.m}/${eb.buttons.l}px`)
  add('Motion & sizes', 'Input height', `${ea.input}px`, `${eb.input}px`)
  add('Motion & sizes', 'Durations', `${ea.motion.fast}/${ea.motion.base}/${ea.motion.slow}ms`, `${eb.motion.fast}/${eb.motion.base}/${eb.motion.slow}ms`)
  add('Motion & sizes', 'Content widths', `${ea.widths.narrow}/${ea.widths.container}/${ea.widths.wide}px`, `${eb.widths.narrow}/${eb.widths.container}/${eb.widths.wide}px`)
  if (a.notes !== b.notes) add('Details', 'Usage notes', a.notes ? `${a.notes.length} characters` : 'empty', b.notes ? `${b.notes.length} characters` : 'empty')
  return out
}

// keep a version automatically while the design system is being edited
onBeforeSystemWrite((previous) => autoVersion(previous))
