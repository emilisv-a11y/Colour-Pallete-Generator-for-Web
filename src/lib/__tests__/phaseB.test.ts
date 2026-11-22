import { describe, expect, it } from 'vitest'
import { buildDiviImport, DEFAULT_DIVI_OPTIONS, diviGradient, findBrokenRefs, gradientPresetFile } from '../divi'
import { darkBodyScript, darkColorVars, darkHeadScript, darkModeCss } from '../diviDark'
import { blockAttrs, buildLayoutFile, buildThemeBuilderFile, colFraction, LAYOUTS, parseBlocks } from '../diviLayouts'
import { monoSvg, recolorSvg, safeSvg, svgColors, svgIssues, visibility } from '../logo'
import { systemFromPalette } from '../system'

const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], 'Test')

type Node = { name: string; attrs: Record<string, unknown> | null; children: Node[] }
const walk = (nodes: Node[], fn: (n: Node) => void) => nodes.forEach((n) => (fn(n), walk(n.children, fn)))

describe('layout library', () => {
  it('escapes block JSON like WordPress', () => {
    const s = blockAttrs({ a: '<p>x & "y"</p>', b: '--et_global_body_font' })
    expect(s).not.toMatch(/[<>&]|--/)
    expect(s).toContain('\\u003cp\\u003e')
    expect(s).toContain('\\u0022y\\u0022')
    expect(JSON.parse(s)).toEqual({ a: '<p>x & "y"</p>', b: '--et_global_body_font' })
  })
  it('builds a valid page file with every section, using real preset ids', () => {
    const ids = LAYOUTS.filter((l) => !l.part).map((l) => l.id)
    const { file, build } = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ids)
    expect(Object.keys(file)).toEqual(['context', 'data', 'presets', 'global_colors', 'global_variables', 'page_settings_meta', 'canvases', 'components', 'images', 'thumbnails'])
    const markup = Object.values(file.data as unknown as Record<string, string>)[0]
    expect(markup.startsWith('<!-- wp:divi/placeholder -->')).toBe(true)
    const tree = parseBlocks(markup) as Node[]
    expect(tree[0].name).toBe('divi/placeholder')
    const sections = tree[0].children
    expect(sections).toHaveLength(ids.length)
    expect(sections.every((s) => s.name === 'divi/section')).toBe(true)
    const presetIds = new Set(Object.values(build.file.presets.module).flatMap((g) => Object.keys(g.items)))
    let modules = 0
    walk(tree, (n) => {
      if (n.name === 'divi/placeholder') return
      const mp = n.attrs?.modulePreset as string[]
      expect(Array.isArray(mp)).toBe(true)
      if (['divi/heading', 'divi/text', 'divi/button', 'divi/section'].includes(n.name)) {
        expect(presetIds.has(mp[0])).toBe(true)
        modules++
      }
      if (n.name === 'divi/row') {
        const structure = (n.attrs as never as { module: { advanced: { columnStructure: { desktop: { value: string } } } } }).module.advanced.columnStructure.desktop.value
        expect(structure.split(',').reduce((a, w) => a + colFraction(w), 0)).toBeCloseTo(1, 5)
        expect(n.children).toHaveLength(structure.split(',').length)
      }
    })
    expect(modules).toBeGreaterThan(30)
    expect(findBrokenRefs(file, null)).toEqual([])
  })
  it('gives headings on coloured sections a readable colour', () => {
    const { file } = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ['cta'])
    const tree = parseBlocks(Object.values(file.data as unknown as Record<string, string>)[0]) as Node[]
    let colour: unknown
    walk(tree, (n) => {
      if (n.name === 'divi/heading') colour = (n.attrs as never as { title: { decoration: { font: { font: { desktop: { value: { color?: string } } } } } } }).title.decoration.font.font.desktop.value.color
    })
    expect(String(colour)).toMatch(/^\$variable\(|^#/)
  })
  it('builds a Theme Builder file shaped like a real export', () => {
    const tb = buildThemeBuilderFile(sys, DEFAULT_DIVI_OPTIONS)
    expect(tb.context).toBe('et_theme_builder')
    const t = tb.templates[0]
    const header = tb.layouts[t.layouts.header.id] as { post_type: string; theme_builder: { is_global: boolean }; data: Record<string, string> }
    const footer = tb.layouts[t.layouts.footer.id] as { post_type: string; data: Record<string, string> }
    expect(header.post_type).toBe('et_header_layout')
    expect(footer.post_type).toBe('et_footer_layout')
    expect(header.theme_builder.is_global).toBe(true)
    expect(Object.keys(header.data)).toEqual([String(t.layouts.header.id)])
    expect(() => parseBlocks(Object.values(footer.data)[0])).not.toThrow()
  })
})

describe('dark mode', () => {
  it('switches the global colours the import creates', () => {
    const build = buildDiviImport(sys, DEFAULT_DIVI_OPTIONS)
    const vars = darkColorVars(sys, DEFAULT_DIVI_OPTIONS)
    expect(vars.length).toBeGreaterThan(10)
    expect(vars.every((v) => v.light !== v.dark)).toBe(true)
    expect(vars.map((v) => v.id)).toContain(build.ids.colors.bg)
    expect(vars.map((v) => v.id)).toContain('gcid-body-color')
    const css = darkModeCss(sys, DEFAULT_DIVI_OPTIONS)
    expect(css).toContain(`--${build.ids.colors.bg}:`)
    expect(css).toMatch(/prefers-color-scheme: dark[\s\S]*:root:not\(\[data-theme='light'\]\)/)
    expect(css).toContain('.d5-theme-toggle.d5-floating')
  })
  it('scripts are valid JavaScript and remember the choice', () => {
    const head = darkHeadScript().replace(/<\/?script>/g, '')
    expect(() => new Function(head)).not.toThrow()
    for (const b of ['floating', 'manual'] as const) {
      const body = darkBodyScript({ button: b, position: 'bottom-left' }).replace(/<\/?script>/g, '')
      expect(() => new Function(body)).not.toThrow()
      expect(body).toContain("localStorage.setItem(KEY, next)")
    }
    expect(darkBodyScript({ button: 'manual', position: 'bottom-right' })).not.toContain('d5-floating')
  })
})

describe('gradient presets', () => {
  it('uses Divi’s gradient format', () => {
    const g = diviGradient([{ color: '#ff0000', pos: 100 }, { color: '#0000ff', pos: 0 }], 'linear', '135deg')
    expect(g).toEqual({ enabled: 'on', type: 'linear', direction: '135deg', stops: [{ position: 0, color: '#0000ff' }, { position: 100, color: '#ff0000' }], length: '100%' })
    expect(diviGradient([{ color: '#fff', pos: 0 }], 'circular', 'top left')).toMatchObject({ type: 'circular', directionRadial: 'top left' })
  })
  it('adds brand gradient section presets and a one-preset file', () => {
    const b = buildDiviImport(sys, DEFAULT_DIVI_OPTIONS)
    const names = Object.values(b.file.presets.module['divi/section'].items).map((p) => p.name)
    expect(names).toEqual(expect.arrayContaining(['Section Gradient Brand', 'Section Gradient Soft', 'Section Gradient Dark', 'Section Gradient Glow']))
    const f = gradientPresetFile('My Gradient', diviGradient([{ color: '#123456', pos: 0 }, { color: '#abcdef', pos: 100 }], 'linear', '90deg'))
    const items = Object.values(f.presets.module['divi/section'].items)
    expect(items.map((p) => p.name)).toEqual(['Section Preset 1', 'My Gradient'])
    expect(findBrokenRefs(f)).toEqual([])
  })
})

describe('logo checker', () => {
  const svg = `<svg viewBox="0 0 10 10"><style>.a{fill:#FF0000}</style><rect class="a" width="5" height="5"/><circle r="2" fill="#00f"/><path d="M0 0" style="stroke: rgb(0, 128, 0); fill:none"/><path d="M1 1"/><!-- #123456 --></svg>`
  it('finds colours, including implicit black, ignoring comments', () => {
    const cols = svgColors(svg)
    expect(cols.map((c) => c.hex).sort()).toEqual(['#000000', '#0000ff', '#008000', '#ff0000'])
    expect(cols.find((c) => c.hex === '#000000')?.implicit).toBe(true)
  })
  it('recolours and makes one-colour versions', () => {
    const r = recolorSvg(svg, { '#ff0000': '#112233' })
    expect(r).toContain('#112233')
    expect(r).not.toMatch(/#FF0000/i)
    const mono = monoSvg(svg, '#ffffff')
    expect(svgColors(mono).map((c) => c.hex)).toEqual(['#ffffff'])
    expect(mono).toMatch(/^<svg fill="#ffffff"/)
    expect(mono).toContain('fill:none')
    const knock = monoSvg('<svg><circle fill="#2457e6"/><path stroke="#ffffff"/></svg>', '#111111', '#fafafa')
    expect(knock).toBe('<svg fill="#111111"><circle fill="#111111"/><path stroke="#fafafa"/></svg>')
  })
  it('rates visibility, flags issues and strips scripts', () => {
    expect(visibility(['#000000'], '#ffffff')).toMatchObject({ level: 'clear', best: '#000000' })
    expect(visibility(['#ffffff', '#000000'], '#ffffff').level).toBe('clear') // white detail on a black shape
    expect(visibility(['#ffffff', '#2457e6', '#1b1f2a'], '#16181d')).toMatchObject({ level: 'part', worst: '#1b1f2a' })
    expect(visibility(['#eeeeee'], '#ffffff').level).toBe('low')
    expect(visibility(['#2457e6', '#1b1f2a'], '#16181d')).toMatchObject({ level: 'part', worst: '#1b1f2a' })
    expect(svgIssues('<svg><text>Hi</text></svg>').length).toBe(2)
    expect(safeSvg('<svg onload="x()"><script>alert(1)</script><a href="javascript:x"/></svg>')).toBe('<svg><a href="#"/></svg>')
  })
})
