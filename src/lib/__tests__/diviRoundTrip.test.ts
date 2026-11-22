import { beforeAll, describe, expect, it } from 'vitest'
import { buildDiviImport, DEFAULT_DIVI_OPTIONS, parseDiviExport } from '../divi'
import { defaultSelection, diffSite, selectiveImport } from '../diviDiff'
import { applyRelative, applyReview, clampIssue, evalLength, readDiviSite, readFluid, stepForLabel } from '../diviRead'
import { loadLibrary } from '../googleFonts'
import site from './fixtures/divi-site.json'

const src = parseDiviExport(JSON.stringify(site))

beforeAll(async () => {
  await loadLibrary()
})

describe('CSS lengths', () => {
  it('evaluates px, rem, vw, calc, clamp, min and max', () => {
    expect(evalLength('12px', 1000)).toBe(12)
    expect(evalLength('1.5rem', 1000)).toBe(24)
    expect(evalLength('calc(1rem + 2vw)', 1000)).toBe(36)
    expect(evalLength('clamp(1rem, 0.5rem + 2vw, 2rem)', 300)).toBe(16)
    expect(evalLength('clamp(1rem, 0.5rem + 2vw, 2rem)', 2000)).toBe(32)
    expect(evalLength('min(10px, 2vw)', 1000)).toBe(10)
    expect(evalLength('max(10px, -2vw)', 1000)).toBe(10)
    expect(evalLength('calc(0.001613 * (100vw - 360px) + 14px)', 1600)).toBeCloseTo(16, 1)
    expect(evalLength('auto', 1000)).toBeNull()
    expect(evalLength('10%', 1000)).toBeNull()
  })
  it('reads where a fluid value starts and stops changing', () => {
    expect(readFluid('clamp(1rem, 0.9583rem + 0.1852vw, 1.125rem)')).toEqual({ minPx: 16, maxPx: 18, minVw: 360, maxVw: 1440, fluid: true })
    expect(readFluid('20px')).toEqual({ minPx: 20, maxPx: 20, minVw: 0, maxVw: 0, fluid: false })
  })
  it('spots a clamp whose minimum is larger than its maximum', () => {
    expect(clampIssue('clamp(0.56rem, calc(8.96px - 0.002297 * (100vw - 360px)), 0.382rem)')).toMatch(/always use 8.96px/)
    expect(clampIssue('clamp(1rem, 1rem + 1vw, 2rem)')).toBeNull()
  })
  it('maps variable names to type steps', () => {
    expect(stepForLabel('text-base')).toBe(0)
    expect(stepForLabel('text-xl')).toBe(2)
    expect(stepForLabel('font-size-sm')).toBe(-1)
    expect(stepForLabel('h1')).toBe(6)
    expect(stepForLabel('text-h6')).toBe(1)
    expect(stepForLabel('space-m')).toBeNull()
  })
  it('approximates Divi relative colours', () => {
    expect(applyRelative('#ddfc18', { lightness: -120 })).toBe('#000000')
    expect(applyRelative('#808080', { lightness: 0 })).toBe('#808080')
  })
})

describe('reading a site into a design system', () => {
  const r = readDiviSite(src, 'Client site')
  const role = (k: string) => r.roles.find((x) => x.role === k)!

  it('assigns roles from labels, ignoring near-duplicates', () => {
    expect(role('primary')).toMatchObject({ hex: '#2459e0', how: 'label' })
    expect(role('secondary')).toMatchObject({ hex: '#f5a524', how: 'label' })
    expect(role('neutral')).toMatchObject({ hex: '#6b7280', how: 'label' })
    expect(role('success')).toMatchObject({ hex: '#16a34a', how: 'label' })
    expect(role('error').how).toBe('generated')
    expect(r.notes.some((n) => n.text.includes('Brand Blue (copy)'))).toBe(true)
  })
  it('reads fonts, the fluid type scale, radius and the main button', () => {
    expect(r.fonts.heading).toMatchObject({ family: 'Playfair Display', how: 'preset', known: true })
    expect(r.fonts.body).toMatchObject({ family: 'Lato', how: 'preset', known: true })
    expect(r.type.how).toBe('variables')
    expect(r.type.settings).toMatchObject({ minVw: 360, maxVw: 1440, minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.25 })
    expect(r.radius).toMatchObject({ px: 12, how: 'variable' })
    expect(r.button).toMatchObject({ name: 'Main Button', background: '#2459e0', text: '#ffffff' })
  })
  it('keeps the dark text colour and flags the broken spacing variable', () => {
    expect(r.textColor?.hex).toBe(applyRelative('#6b7280', { lightness: -30 }))
    expect(r.system.overrides.light.text).toBe(r.textColor?.hex)
    expect(r.notes.some((n) => n.level === 'warn' && n.text.includes('space-xs'))).toBe(true)
    expect(r.system.fonts.meta?.Lato).toBeTruthy()
  })
  it('applies review edits', () => {
    const sys = applyReview(r, { roles: { accent: '#e11d48' }, heading: 'Inter', name: 'Renamed', keepTextColour: false })
    expect(sys.roles.accent).toEqual({ hex: '#e11d48', anchor: null })
    expect(sys.fonts.heading).toBe('Inter')
    expect(sys.name).toBe('Renamed')
    expect(sys.overrides.light.text).toBeUndefined()
    expect(sys.fonts.meta?.Inter).toBeTruthy()
  })
})

describe('differences and the update file', () => {
  const r = readDiviSite(src, 'Client site')
  const build = buildDiviImport(r.system, DEFAULT_DIVI_OPTIONS, src)
  const items = diffSite(build, src)
  const find = (label: string) => items.find((i) => i.label === label)!

  it('classifies every item', () => {
    expect(find('text-base')).toMatchObject({ status: 'same' }) // same numbers, written differently
    expect(find('radius-m').status).toBe('same')
    expect(find('space-xs').status).toBe('changed')
    expect(find('Primary Color')).toMatchObject({ status: 'changed', relinkOnly: true })
    expect(find('Brand Blue (copy)').status).toBe('site-only')
    expect(find('Hero Title')).toMatchObject({ kind: 'preset', status: 'site-only' })
    expect(items.find((i) => i.label === 'Primary 500')?.status).toBe('new')
    expect(items.some((i) => i.label === 'Heading Preset 1')).toBe(false) // unchanged defaults are hidden
  })
  it('builds a file with only the chosen items plus what they need', () => {
    const h1 = items.find((i) => i.kind === 'preset' && i.label === 'H1 Heading')!
    const res = selectiveImport(build, src, new Set([h1.key]))
    expect(res.broken).toEqual([])
    expect(res.file.global_colors.map(([, c]) => c.label)).not.toContain('Brand Blue')
    expect(res.added.length).toBeGreaterThan(0)
    expect(Object.keys(res.file.presets.module['divi/heading'].items)).toEqual(expect.arrayContaining([h1.id, 'hdef000001']))
    expect(res.file.presets.module['divi/button']).toBeUndefined()
  })
  it('leaves unticked site items untouched', () => {
    const sel = defaultSelection(items)
    sel.delete(find('space-xs').key)
    const res = selectiveImport(build, src, sel)
    expect(res.broken).toEqual([])
    expect(res.file.global_variables.find((v) => v.label === 'space-xs')).toBeUndefined()
    expect(res.file.global_variables.find((v) => v.label === 'text-base')).toBeUndefined() // same → not ticked
  })
})
