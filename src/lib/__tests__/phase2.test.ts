import { describe, expect, it } from 'vitest'
import { extractPalette, type Pixel } from '../extract'
import { gradientCode, gradientPalette, sampleGradient, type Gradient } from '../gradient'
import { paletteAse, palettePdf } from '../files'
import { autoRoles } from '../roles'
import { CURATED } from '../../data/palettes'
import { TAILWIND_FLAT } from '../../data/tailwind'

const px = (r: number, g: number, b: number, n: number): Pixel[] => Array.from({ length: n }, (_, i) => ({ x: i, y: 0, r, g, b }))

describe('image extraction', () => {
  it('finds the distinct colours in an image', () => {
    const pixels = [...px(255, 0, 0, 300), ...px(0, 0, 255, 300), ...px(255, 255, 255, 300)]
    const out = extractPalette(pixels, 3).map((c) => c.hex).sort()
    expect(out).toEqual(['#0000ff', '#ff0000', '#ffffff'])
  })
  it('is deterministic for the same seed', () => {
    const pixels = Array.from({ length: 500 }, (_, i) => ({ x: i, y: 0, r: (i * 37) % 256, g: (i * 91) % 256, b: (i * 13) % 256 }))
    expect(extractPalette(pixels, 5, 'balanced', 3)).toEqual(extractPalette(pixels, 5, 'balanced', 3))
  })
})

describe('gradients', () => {
  const g: Gradient = { type: 'linear', angle: 90, space: 'oklab', shape: 'circle', cx: 50, cy: 50, stops: [{ id: 'a', color: '#000000', pos: 0 }, { id: 'b', color: '#ffffff', pos: 100 }] }
  it('samples endpoints and builds palettes', () => {
    expect(sampleGradient(g.stops, 0, 'oklab')).toBe('#000000')
    expect(sampleGradient(g.stops, 100, 'oklab')).toBe('#ffffff')
    expect(gradientPalette(g, 5)).toHaveLength(5)
  })
  it('emits modern CSS with an sRGB fallback', () => {
    const { css } = gradientCode(g)
    expect(css).toContain('linear-gradient(90deg in oklab, #000000 0%, #ffffff 100%)')
    expect(css.split('\n')).toHaveLength(2)
  })
})

describe('file exports', () => {
  it('writes a valid ASE header', async () => {
    const buf = new Uint8Array(await paletteAse(['#ff0000', '#00ff00']).arrayBuffer())
    expect(String.fromCharCode(...buf.slice(0, 4))).toBe('ASEF')
    expect(buf[11]).toBe(4) // group start + 2 colours + group end
  })
  it('writes a PDF with a correct xref offset', async () => {
    const text = new TextDecoder('latin1').decode(await palettePdf(['#264653', '#2a9d8f']).arrayBuffer())
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    const startxref = Number(text.match(/startxref\n(\d+)/)![1])
    expect(text.slice(startxref, startxref + 4)).toBe('xref')
  })
})

describe('data', () => {
  it('has a few hundred valid curated palettes', () => {
    expect(CURATED.length).toBeGreaterThanOrEqual(200)
    CURATED.forEach((p) => p.colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/)))
  })
  it('has the full Tailwind palette', () => {
    expect(TAILWIND_FLAT).toHaveLength(22 * 11)
  })
  it('assigns UI roles', () => {
    const r = autoRoles(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#ffffff'])
    expect(r.background).toBe('#ffffff')
    expect(r.text).toBe('#264653')
  })
})
