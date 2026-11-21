import { describe, expect, it } from 'vitest'
import { cmykValues, contrastRatio, fixContrast, formatColor, normalizeHex, readableOn, shadeStrip, simulateVision } from '../color'
import { generatePalette, MODES } from '../generate'
import { exportCode, paletteSlug } from '../exports'
import { initialState, paletteReducer } from '../../state/palette'

describe('colour maths', () => {
  it('normalises inputs', () => {
    expect(normalizeHex('FFF')).toBe('#ffffff')
    expect(normalizeHex('2A9D8F')).toBe('#2a9d8f')
    expect(normalizeHex('rgb(255, 0, 0)')).toBe('#ff0000')
    expect(normalizeHex('tomato')).toBe('#ff6347')
    expect(normalizeHex('nope')).toBeNull()
  })
  it('formats colours', () => {
    expect(formatColor('#ff0000', 'rgb')).toBe('rgb(255, 0, 0)')
    expect(formatColor('#ff0000', 'hsl')).toBe('hsl(0, 100%, 50%)')
    expect(cmykValues('#000000')).toEqual({ c: 0, m: 0, y: 0, k: 100 })
  })
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(readableOn('#ffff00')).toBe('#000000')
    expect(readableOn('#1d2433')).toBe('#ffffff')
  })
  it('fixes contrast to the target', () => {
    const fixed = fixContrast('#888888', '#ffffff', 4.5)!
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })
  it('keeps the original colour in the shade strip', () => {
    expect(shadeStrip('#2a9d8f').some((s) => s.original && s.hex === '#2a9d8f')).toBe(true)
  })
  it('simulates vision deficiencies', () => {
    expect(simulateVision('#ff0000', 'normal')).toBe('#ff0000')
    const g = simulateVision('#ff0000', 'achromatopsia')
    expect(g.slice(1, 3)).toBe(g.slice(3, 5))
  })
})

describe('generator', () => {
  it('respects locked colours in every mode', () => {
    for (const m of MODES) {
      const out = generatePalette(['#2a9d8f', null, null, '#e76f51', null], m.id)
      expect(out).toHaveLength(5)
      expect(out[0]).toBe('#2a9d8f')
      expect(out[3]).toBe('#e76f51')
      out.forEach((h) => expect(h).toMatch(/^#[0-9a-f]{6}$/))
    }
  })
})

describe('palette history', () => {
  it('undoes and redoes', () => {
    let s = initialState(['#111111', '#222222', '#333333'])
    s = paletteReducer(s, { type: 'generate', mode: 'auto' })
    const generated = s.present.map((x) => x.hex)
    s = paletteReducer(s, { type: 'undo' })
    expect(s.present.map((x) => x.hex)).toEqual(['#111111', '#222222', '#333333'])
    s = paletteReducer(s, { type: 'redo' })
    expect(s.present.map((x) => x.hex)).toEqual(generated)
  })
  it('collapses a picker edit into a single history step', () => {
    let s = initialState(['#111111', '#222222'])
    const id = s.present[0].id
    s = paletteReducer(s, { type: 'beginEdit' })
    s = paletteReducer(s, { type: 'edit', id, hex: '#aa0000' })
    s = paletteReducer(s, { type: 'edit', id, hex: '#bb0000' })
    s = paletteReducer(s, { type: 'endEdit' })
    expect(s.past).toHaveLength(1)
    s = paletteReducer(s, { type: 'beginEdit' })
    s = paletteReducer(s, { type: 'endEdit' })
    expect(s.past).toHaveLength(1)
  })
  it('enforces min/max colours', () => {
    let s = initialState(['#111111', '#222222'])
    s = paletteReducer(s, { type: 'remove', id: s.present[0].id })
    expect(s.present).toHaveLength(2)
    for (let i = 0; i < 12; i++) s = paletteReducer(s, { type: 'insert', index: 1 })
    expect(s.present).toHaveLength(10)
  })
})

describe('exports', () => {
  it('builds slugs and code', () => {
    expect(paletteSlug(['#264653', '#2a9d8f'])).toBe('264653-2a9d8f')
    const css = exportCode(['#264653', '#2a9d8f'], 'css', 'numbered')
    expect(css).toContain('--color-1: #264653;')
    expect(exportCode(['#264653'], 'tailwind4', 'numbered')).toContain('--color-1: #264653;')
  })
})
