import { describe, expect, it } from 'vitest'
import { buildDiviImport, DEFAULT_DIVI_OPTIONS, findBrokenRefs, latestVersion, parseDiviExport, parseRef, resolveColor, stableId, summarizeExport } from '../divi'
import { systemFromPalette } from '../system'
import fixture from './fixtures/divi-export.json'

const source = parseDiviExport(JSON.stringify(fixture))
const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], 'Test')

describe('reading a Divi 5 export', () => {
  it('parses and resolves colour references', () => {
    expect(resolveColor('gcid-body-color', source)).toEqual({ hex: '#ddfc18', relative: true })
    expect(resolveColor('gcid-c5iv4dvdf6', source)).toEqual({ hex: '#ddfc18', relative: false })
    const s = summarizeExport(source)
    expect(s.colors).toHaveLength(5)
    expect(s.variables[0].label).toBe('space-m')
    expect(latestVersion(source)).toBe('5.19.0')
  })
  it('rejects other JSON', () => {
    expect(() => parseDiviExport('{"a":1}')).toThrow()
  })
})

describe('building an import file', () => {
  const { file, changes } = buildDiviImport(sys, DEFAULT_DIVI_OPTIONS, source, 1790000000000)

  it('has the same top-level shape as a Divi export', () => {
    expect(Object.keys(file)).toEqual(Object.keys(source))
    expect(file.context).toBe('et_builder')
  })
  it('uses Divi-style ids and valid colour entries', () => {
    file.global_colors.forEach(([id, c]) => {
      expect(id).toMatch(/^gcid-([a-z0-9]{10}|primary-color|heading-color|body-color)$/)
      expect(c.status).toBe('active')
      expect(c.color.startsWith('#') || parseRef(c.color)?.type === 'color').toBe(true)
    })
    file.global_variables.forEach((v) => {
      expect(v.id).toMatch(/^gvid-[a-z0-9]{10}$/)
      expect(v.type).toBe('numbers')
      expect(v.variableType).toBe('numbers')
    })
    expect(new Set(file.global_colors.map(([id]) => id)).size).toBe(file.global_colors.length)
    expect(new Set(file.global_variables.map((v) => v.id)).size).toBe(file.global_variables.length)
  })
  it('reuses ids of existing items with the same label', () => {
    expect(file.global_variables.find((v) => v.label === 'space-m')!.id).toBe('gvid-fhq7meoltx')
    expect(file.global_variables.find((v) => v.label === 'radius-m')!.id).toBe('gvid-jn3ctjxa1h')
    expect(changes.filter((c) => c.action === 'update').map((c) => c.label)).toEqual(expect.arrayContaining(['space-m', 'radius-m', 'Primary Color']))
  })
  it('keeps the site default presets and adds new presets', () => {
    expect(file.presets.module['divi/heading'].default).toBe('q4aszwzx0a')
    expect(file.presets.module['divi/heading'].items['q4aszwzx0a'].name).toBe('Heading Preset 1')
    expect(Object.keys(file.presets.module['divi/heading'].items).length).toBeGreaterThan(5)
    expect(file.presets.group['divi/border'].default).toBe('i6zdqb2vo9')
    const h1 = Object.values(file.presets.module['divi/heading'].items).find((p) => p.name === 'H1 Heading')!
    expect(JSON.stringify(h1.renderAttrs)).toContain('"headingLevel":"h1"')
    expect(JSON.stringify(h1.styleAttrs)).not.toContain('headingLevel')
    expect(h1.version).toBe('5.19.0')
  })
  it('has no broken references', () => {
    expect(findBrokenRefs(file, source)).toEqual([])
    const bare = buildDiviImport(sys, DEFAULT_DIVI_OPTIONS, null).file
    expect(findBrokenRefs(bare)).toEqual([])
  })
  it('falls back to plain values when colours/variables are not exported', () => {
    const minimal = buildDiviImport(sys, { ...DEFAULT_DIVI_OPTIONS, scales: 'none', tokens: 'none', mapBuiltins: false, typeVars: false, spaceVars: false, radiusVars: false }, null).file
    expect(minimal.global_colors).toHaveLength(0)
    expect(findBrokenRefs(minimal)).toEqual([])
    expect(JSON.stringify(minimal.presets)).toContain('clamp(')
  })
  it('can keep existing site values instead of updating them', () => {
    const kept = buildDiviImport(sys, { ...DEFAULT_DIVI_OPTIONS, onConflict: 'keep' }, source)
    expect(kept.file.global_variables.some((v) => v.id === 'gvid-fhq7meoltx')).toBe(false)
    expect(kept.changes.find((c) => c.label === 'space-m')!.action).toBe('keep')
    // presets still point at the site's own variable
    expect(JSON.stringify(kept.file.presets)).toContain('gvid-jn3ctjxa1h')
    expect(findBrokenRefs(kept.file, source)).toEqual([])
  })
  it('is stable across rebuilds', () => {
    const again = buildDiviImport(sys, DEFAULT_DIVI_OPTIONS, source, 1790000000000).file
    expect(again.global_colors.map(([id]) => id)).toEqual(file.global_colors.map(([id]) => id))
    expect(stableId('x')).toMatch(/^[a-z0-9]{10}$/)
  })
})
