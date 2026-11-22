import { describe, expect, it } from 'vitest'
import { buildDiviImport, DEFAULT_DIVI_OPTIONS, diviCss, findBrokenRefs } from '../divi'
import { buttonSizes, DEFAULT_EFFECTS, effectsCss, effectsOf, effectVars, shadowColor, shadowCss } from '../effects'
import { brandKitHtml, DEFAULT_PARTS } from '../handoff'
import { systemFromPalette } from '../system'
import { exportTokens } from '../tokens'

const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], 'Test')

describe('shape & motion tokens', () => {
  it('defaults for older design systems and merges partial settings', () => {
    expect(effectsOf(sys)).toEqual(DEFAULT_EFFECTS)
    const e = effectsOf({ ...sys, effects: { ...DEFAULT_EFFECTS, widths: { narrow: 680 } } as never })
    expect(e.widths).toEqual({ narrow: 680, container: 1200, wide: 1440 })
  })
  it('tints shadows with the brand, uses black and more strength in dark mode', () => {
    const brand = shadowColor(sys)
    const neutral = shadowColor({ ...sys, effects: { ...DEFAULT_EFFECTS, shadowTint: 'neutral' } })
    expect(brand).not.toBe(neutral)
    expect(brand).not.toBe('#000000')
    expect(shadowColor(sys, 'dark')).toBe('#000000')
    expect(shadowCss(sys, 'md')).toMatch(/^0 2px 4px rgb\(\d+ \d+ \d+ \/ 0\.06\), 0 6px 12px rgb\(\d+ \d+ \d+ \/ 0\.1\)$/)
    expect(shadowCss(sys, 'md', 'dark')).toContain('rgb(0 0 0 / 0.24)')
    const strong = shadowCss({ ...sys, effects: { ...DEFAULT_EFFECTS, shadowStrength: 2 } }, 'sm')
    expect(strong).toContain('/ 0.12)')
  })
  it('works out button padding so each button reaches its height', () => {
    for (const b of buttonSizes(sys)) {
      expect(Math.abs(b.padY * 2 + b.fontPx * 1.2 - b.height)).toBeLessThanOrEqual(2)
      expect(b.padX).toBe(Math.round(b.height / 2))
    }
    expect(buttonSizes(sys).map((b) => b.height)).toEqual([36, 44, 52])
  })
  it('writes CSS variables with dark shadows and reduced motion', () => {
    const css = effectsCss(sys)
    expect(css).toContain('--shadow-lg:')
    expect(css).toContain('--width-container: 1200px;')
    expect(css).toContain('--ease-standard: cubic-bezier(0.2, 0, 0, 1);')
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*--duration-base: 0ms/)
    expect(css).toMatch(/data-theme='dark'[\s\S]*--shadow-sm: 0 1px 2px rgb\(0 0 0/)
    expect(effectVars(sys).filter((v) => v.group === 'button')).toHaveLength(13)
  })
})

describe('in every export', () => {
  it('token formats', () => {
    expect(exportTokens(sys, 'css')).toContain('--shadow-md:')
    expect(exportTokens(sys, 'tailwind4')).toContain('--shadow-sm:')
    expect(exportTokens(sys, 'tailwind3')).toContain("maxWidth: { narrow: '720px'")
    expect(exportTokens(sys, 'scss')).toContain('$duration-fast: 120ms;')
    const dtcg = JSON.parse(exportTokens(sys, 'dtcg'))
    expect(dtcg.shadow.light.md.$value).toHaveLength(2)
    expect(dtcg.shadow.light.md.$value[1].offsetY).toEqual({ value: 6, unit: 'px' })
    expect(dtcg.easing.standard.$value).toEqual([0.2, 0, 0, 1])
    expect(dtcg.duration.base.$value).toEqual({ value: 200, unit: 'ms' })
    expect(JSON.parse(exportTokens(sys, 'json')).effects['width-wide']).toBe('1440px')
  })
  it('Divi import: variables and button size presets', () => {
    const b = buildDiviImport(sys, DEFAULT_DIVI_OPTIONS)
    const labels = b.file.global_variables.map((v) => v.label)
    expect(labels).toEqual(expect.arrayContaining(['border-base', 'btn-m-pad-y', 'btn-l-font', 'input-height', 'duration-slow', 'width-container']))
    const sizes = Object.values(b.file.presets.group['divi/button'].items).filter((p) => p.name.startsWith('Button Size'))
    expect(sizes.map((p) => p.name)).toEqual(['Button Size S', 'Button Size M', 'Button Size L'])
    expect(sizes[0].groupId).toBe('designButton')
    expect(findBrokenRefs(b.file)).toEqual([])
    const off = buildDiviImport(sys, { ...DEFAULT_DIVI_OPTIONS, effectVars: false, presetButtonSizes: false })
    expect(off.file.global_variables.some((v) => v.label === 'width-container')).toBe(false)
    expect(findBrokenRefs(off.file)).toEqual([])
    expect(diviCss(sys)).toContain('.d5-shadow-md { box-shadow: var(--shadow-md); }')
  })
  it('brand kit', () => {
    const html = brandKitHtml({ project: { name: 'P', client: '', website: '', notes: '' }, sys } as never, 'lt', DEFAULT_PARTS)
    expect(html).toContain('Forma ir judesys')
    expect(html).toContain('width-container')
  })
})
