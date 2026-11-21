import { describe, expect, it } from 'vitest'
import { fontStack, googleFontsUrl } from '../fonts'
import { familyParam, getFont, loadLibrary, previewUrl } from '../googleFonts'

describe('Google Fonts library', () => {
  it('loads the full built-in catalogue', async () => {
    const lib = await loadLibrary()
    expect(lib.length).toBeGreaterThan(1500)
    const inter = getFont('Inter')!
    expect(inter.category).toBe('sans-serif')
    expect(inter.variable).toBe(true)
    expect(inter.subsets).toContain('latin-ext')
  })
  it('builds valid family parameters', () => {
    expect(familyParam('Abel', { weights: [400], variable: false })).toBe('family=Abel')
    expect(familyParam('Lato', { weights: [100, 300, 400, 700, 900], variable: false })).toBe('family=Lato:wght@300;400;700')
    expect(familyParam('Inter', { weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], variable: true })).toBe('family=Inter:wght@300..800')
    expect(familyParam('Thin Only', { weights: [100, 200], variable: false })).toBe('family=Thin+Only:wght@100;200')
  })
  it('uses saved metadata and category-aware fallbacks', async () => {
    await loadLibrary()
    expect(googleFontsUrl(['Inter', 'Lora'])).toContain('family=Inter:wght@300..800')
    expect(fontStack('Lora')).toContain('serif')
    expect(fontStack('Fira Code')).toContain('monospace')
    expect(fontStack('Unknown Font', { 'Unknown Font': { category: 'handwriting', weights: [400], italic: false, variable: false } })).toContain('cursive')
  })
  it('requests only the preview glyphs', () => {
    expect(previewUrl('Open Sans', 'aab')).toContain('text=ab')
  })
})
