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
