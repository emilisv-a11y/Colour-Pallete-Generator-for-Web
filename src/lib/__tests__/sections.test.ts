import { describe, expect, it } from 'vitest'
import { FULL_PAGES } from '../../data/diviSections'
import { DEFAULT_DIVI_OPTIONS, diviCss, findBrokenRefs } from '../divi'
import { buildLayoutFile, buildThemeBuilderFile, colFraction, LAYOUT_GROUPS, LAYOUTS, parseBlocks, placeholdersFor } from '../diviLayouts'
import { systemFromPalette } from '../system'

const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], 'Test')
type Node = { name: string; attrs: Record<string, unknown> | null; children: Node[] }
const walk = (nodes: Node[], fn: (n: Node) => void) => nodes.forEach((n) => (fn(n), walk(n.children, fn)))
// column structures Divi offers
const ALLOWED = new Set(['4_4', '1_2,1_2', '1_3,1_3,1_3', '1_4,1_4,1_4,1_4', '2_3,1_3', '1_3,2_3', '1_4,3_4', '3_4,1_4', '1_4,1_2,1_4', '1_5,1_5,1_5,1_5,1_5', '2_5,3_5', '3_5,2_5'])

describe('layout library', () => {
  it('has unique ids, a group for every section and enough of each group', () => {
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length)
    for (const g of LAYOUT_GROUPS) expect(LAYOUTS.filter((l) => l.group === g.id && !l.part).length, g.id).toBeGreaterThanOrEqual(g.id === 'shop' ? 4 : 2)
    expect(LAYOUTS.filter((l) => !l.part).length).toBeGreaterThanOrEqual(26)
    expect(LAYOUTS.filter((l) => l.part === 'header').length).toBe(2)
    expect(LAYOUTS.filter((l) => l.part === 'footer').length).toBe(2)
  })
  it('every section builds valid blocks with Divi column structures and real presets', () => {
    for (const spec of LAYOUTS) {
      const { file, build } = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, [spec.id])
      const markup = Object.values(file.data as unknown as Record<string, string>)[0]
      const tree = parseBlocks(markup) as Node[]
      const presetIds = new Set(Object.values(build.file.presets.module).flatMap((g) => Object.keys(g.items)))
      walk(tree, (n) => {
        if (n.name === 'divi/row') {
          const s = (n.attrs as never as { module: { advanced: { columnStructure: { desktop: { value: string } } } } }).module.advanced.columnStructure.desktop.value
          expect(ALLOWED.has(s), `${spec.id}: ${s}`).toBe(true)
          expect(s.split(',').reduce((a, w) => a + colFraction(w), 0)).toBeCloseTo(1, 5)
        }
        if (['divi/heading', 'divi/text', 'divi/button', 'divi/section'].includes(n.name)) {
          const id = (n.attrs?.modulePreset as string[])[0]
          expect(presetIds.has(id), `${spec.id}: ${n.name} preset`).toBe(true)
        }
      })
      expect(findBrokenRefs(file, null), spec.id).toEqual([])
    }
  })
  it('pictures point at the embedded placeholder files', () => {
    const ids = ['hero-split', 'products', 'team', 'logos']
    const phs = placeholdersFor(ids)
    expect(phs.map((p) => p.kind)).toEqual(['photo', 'product', 'product', 'product', 'product', 'avatar', 'avatar', 'avatar', 'avatar', 'logo', 'logo', 'logo', 'logo', 'logo'])
    const images = Object.fromEntries(phs.map((p) => [p.key, 'QUJD']))
    const { file } = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ids, null, images)
    const embedded = file.images as unknown as Record<string, { encoded: string; url: string }>
    expect(Object.keys(embedded)).toEqual(phs.map((p) => p.url))
    expect(Object.values(embedded)[0]).toEqual({ encoded: 'QUJD', url: phs[0].url })
    const srcs: string[] = []
    walk(parseBlocks(Object.values(file.data as unknown as Record<string, string>)[0]) as Node[], (n) => {
      if (n.name === 'divi/image') srcs.push((n.attrs as never as { image: { innerContent: { desktop: { value: { src: string } } } } }).image.innerContent.desktop.value.src)
    })
    expect(srcs).toEqual(phs.map((p) => p.url))
    expect(phs.find((p) => p.kind === 'photo')).toMatchObject({ w: 1200, h: 900 })
  })
  it('bento tiles get the readable colour classes and heading colours', () => {
    const { file } = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ['bento'])
    const markup = Object.values(file.data as unknown as Record<string, string>)[0]
    expect(markup).toContain('d5-tile-brand')
    expect(markup).toContain('d5-tile-dark')
    const css = diviCss(sys)
    for (const c of ['.d5-tile-brand', '.d5-avatar img', '.d5-table', '.d5-swatch', '.d5-logo img']) expect(css).toContain(c)
  })
  it('full pages use existing sections', () => {
    for (const p of FULL_PAGES) {
      for (const id of p.sections) expect(LAYOUTS.some((l) => l.id === id && !l.part), `${p.id}: ${id}`).toBe(true)
      const { file } = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, p.sections)
      const tree = parseBlocks(Object.values(file.data as unknown as Record<string, string>)[0]) as Node[]
      expect(tree[0].children.length).toBe(p.sections.length)
    }
  })
  it('Theme Builder file uses the chosen header and footer', () => {
    const tb = buildThemeBuilderFile(sys, DEFAULT_DIVI_OPTIONS, null, 'header-centered', 'footer-cta')
    const t = tb.templates[0]
    const header = tb.layouts[t.layouts.header.id] as { post_type: string; post_title: string }
    const footer = tb.layouts[t.layouts.footer.id] as { post_type: string; post_title: string }
    expect(header).toMatchObject({ post_type: 'et_header_layout', post_title: 'Test Header: centred logo' })
    expect(footer).toMatchObject({ post_type: 'et_footer_layout', post_title: 'Test Footer with call to action' })
  })
})

describe('layouts v3', () => {
  const markupOf = (ids: string[]) => Object.values(buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ids).file.data as unknown as Record<string, string>)[0]
  it('adds the new groups with several sections each', () => {
    for (const g of ['restaurant', 'trust', 'media', 'utility']) expect(LAYOUTS.filter((l) => l.group === g).length, g).toBeGreaterThanOrEqual(4)
    expect(LAYOUTS.filter((l) => !l.part).length).toBeGreaterThanOrEqual(45)
  })
  it('uses Divi’s Shop module styled with the design system', () => {
    let shop: Node | undefined
    walk(parseBlocks(markupOf(['products-woo'])) as Node[], (n) => n.name === 'divi/shop' && (shop = n))
    const a = shop!.attrs as Record<string, Record<string, unknown>>
    expect(JSON.stringify(a.saleBadge)).toMatch(/\$variable/)
    expect(JSON.stringify(a.title)).toContain('--et_global_heading_font')
    expect(JSON.stringify(a.title)).toContain('"hover"')
  })
  it('video gets a placeholder thumbnail that is embedded in the file', () => {
    const phs = placeholdersFor(['video'])
    expect(phs).toHaveLength(1)
    expect(markupOf(['video'])).toContain(phs[0].url)
  })
  it('text presets have link colours with a hover state, header links get the nav class', () => {
    const b = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ['header']).build
    const body = Object.values(b.file.presets.module['divi/text'].items).find((p) => p.name === 'Body Text')!
    const link = (body.attrs as { content: { decoration: { bodyFont: { link: { font: { desktop: { value: unknown; hover: unknown } } } } } } }).content.decoration.bodyFont.link.font.desktop
    expect(link.value).toBeTruthy()
    expect(link.hover).toBeTruthy()
    expect(markupOf(['header'])).toContain('d5-nav')
    const css = diviCss(sys)
    expect(css).toContain('.et_pb_button:hover')
    expect(css).toContain('.d5-nav a:hover')
    expect(css).toContain(':focus-visible')
  })
  it('sizes use rem instead of px (borders stay px)', () => {
    const vars = Object.fromEntries(buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ['hero']).build.file.global_variables.map((v) => [v.label, v.value]))
    expect(vars['radius-m']).toMatch(/rem$/)
    expect(vars['btn-m-pad-x']).toMatch(/rem$/)
    expect(vars['width-container']).toBe('75rem')
    expect(vars['border-thin']).toBe('1px')
  })
  it('builds a realistic preview page', async () => {
    const { layoutDocument } = await import('../layoutHtml')
    const html = layoutDocument(sys, ['hero-split', 'bento', 'products-woo', 'faq-split'], 'dark')
    expect(html).toContain('data-theme="dark"')
    expect(html.match(/<section class="pv-sec/g)).toHaveLength(4)
    expect(html).toContain('d5-tile-brand')
    expect(html).toContain('.d5-btn-primary:hover')
    expect(html).toContain('@media (max-width: 980px)')
    expect(html).toContain('fonts.googleapis.com')
    expect(html).toContain('<details open>')
  })
})

describe('gradient presets', () => {
  it('link their colour stops to global colours', () => {
    const b = buildLayoutFile(sys, DEFAULT_DIVI_OPTIONS, ['hero']).build
    const brand = Object.values(b.file.presets.module['divi/section'].items).find((p) => p.name === 'Section Gradient Brand')!
    const stops = (brand.attrs as { module: { decoration: { background: { desktop: { value: { gradient: { stops: { color: string }[] } } } } } } }).module.decoration.background.desktop.value.gradient.stops
    expect(stops.every((s) => s.color.startsWith('$variable('))).toBe(true)
    expect(findBrokenRefs(b.file)).toEqual([])
  })
})
