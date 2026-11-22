import { beforeAll, describe, expect, it } from 'vitest'
import { KIT_GROUPS } from '../../data/starterKits'
import { encodeIco, iconSvg, iconTags, initials, manifest, type IconSpec } from '../brandAssets'
import { buildDiviImport, DEFAULT_DIVI_OPTIONS, findBrokenRefs } from '../divi'
import { getFont, loadLibrary } from '../googleFonts'
import { kitProjectData, kitSystem, STARTER_KITS } from '../starterKits'
import { buildTokens, checkPairs } from '../system'

beforeAll(async () => {
  await loadLibrary()
})

describe('icons', () => {
  it('makes initials from names, including Lithuanian letters', () => {
    expect(initials('Corner Café')).toBe('CC')
    expect(initials('studio')).toBe('S')
    expect(initials('Šviesos & Žalia studija')).toBe('ŠŽ')
    expect(initials('  ')).toBe('A')
  })
  it('writes a valid ICO header and directory', () => {
    const a = new Uint8Array([137, 80, 78, 71, 1, 2, 3])
    const b = new Uint8Array([137, 80, 78, 71, 9])
    const ico = encodeIco([
      { size: 16, png: a },
      { size: 256, png: b },
    ])
    const v = new DataView(ico.buffer)
    expect([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)]).toEqual([0, 1, 2])
    expect(ico[6]).toBe(16)
    expect(ico[22]).toBe(0) // 256 is stored as 0
    expect(v.getUint32(6 + 8, true)).toBe(a.length)
    expect(v.getUint32(6 + 12, true)).toBe(6 + 32)
    expect(v.getUint32(22 + 12, true)).toBe(6 + 32 + a.length)
    expect([...ico.slice(38, 38 + a.length)]).toEqual([...a])
    expect(ico.length).toBe(38 + a.length + b.length)
  })
  it('SVG favicon, manifest and tags', () => {
    const spec: IconSpec = { source: 'logo', text: 'A', font: 'Inter, sans-serif', weight: 700, bg: '#123456', fg: '#fff', shape: 'circle', padding: 0.1 }
    const svg = iconSvg(spec, '<?xml version="1.0"?><svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>')
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#123456"\/><svg x="10" y="10" width="80" height="80"/)
    expect(svg).not.toContain('<?xml')
    const m = JSON.parse(manifest('Corner Café Vilnius', '#c2603f', '#ffffff'))
    expect(m.short_name).toBe('Corner')
    expect(m.icons.map((i: { purpose?: string }) => i.purpose ?? 'any')).toEqual(['any', 'any', 'maskable'])
    expect(iconTags('#c2603f', false)).not.toContain('favicon.svg')
    expect(iconTags('#c2603f', true)).toContain('favicon.svg')
  })
})

describe('starter kits', () => {
  it('two or more per chosen industry group, unique ids', () => {
    for (const g of KIT_GROUPS) expect(STARTER_KITS.filter((k) => k.group === g.id).length).toBeGreaterThanOrEqual(2)
    expect(new Set(STARTER_KITS.map((k) => k.id)).size).toBe(STARTER_KITS.length)
  })
  it('every font is a Google Font with Lithuanian letters (Latin Extended)', () => {
    for (const k of STARTER_KITS)
      for (const f of [k.fonts.heading, k.fonts.body]) {
        const g = getFont(f)
        expect(g, `${k.id}: ${f}`).toBeTruthy()
        expect(g!.subsets, `${k.id}: ${f}`).toContain('latin-ext')
      }
  })
  it('builds accessible design systems and valid Divi files', () => {
    for (const k of STARTER_KITS) {
      const sys = kitSystem(k, 'Client')
      expect(sys.roles.primary.hex).toBe(k.palette[0])
      expect(sys.fonts.meta?.[k.fonts.heading]).toBeTruthy()
      for (const mode of ['light', 'dark'] as const) {
        const fails = checkPairs(buildTokens(sys, mode)).filter((p) => !p.pass)
        expect(fails.map((f) => f.label), `${k.id} ${mode}`).toEqual([])
      }
      expect(findBrokenRefs(buildDiviImport(sys, DEFAULT_DIVI_OPTIONS).file)).toEqual([])
      const data = kitProjectData(k, 'Client')
      expect((data['d5wt:current'] as { present: { hex: string }[] }).present.map((s) => s.hex)).toEqual(k.palette)
      expect(data['d5wt:sectionPlan']).toEqual(k.plan)
    }
  })
})
