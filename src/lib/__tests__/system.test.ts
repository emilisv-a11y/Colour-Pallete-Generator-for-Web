import { describe, expect, it } from 'vitest'
import { apcaContrast } from '../apca'
import { hexToOklch } from '../color'
import { generatePalette } from '../generate'
import { allTokenNames, buildScale, buildTokens, checkPairs, suggestFix, systemFromPalette } from '../system'

describe('APCA', () => {
  it('matches reference values', () => {
    expect(apcaContrast('#000000', '#ffffff')).toBeCloseTo(106.04, 1)
    expect(apcaContrast('#ffffff', '#000000')).toBeCloseTo(-107.88, 1)
    expect(Math.abs(apcaContrast('#888888', '#ffffff'))).toBeCloseTo(63.06, 0)
  })
})

describe('scales', () => {
  it('puts the exact colour at the anchor and orders lightness', () => {
    for (const hex of ['#2a9d8f', '#e9c46a', '#1d3557', '#ff006e', '#777777']) {
      for (const anchor of [null, 2, 5, 8]) {
        const s = buildScale(hex, anchor)
        expect(s).toHaveLength(11)
        if (anchor !== null) expect(s[anchor]).toBe(hex)
        else expect(s).toContain(hex)
        const ls = s.map((h) => hexToOklch(h).l)
        for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeLessThan(ls[i - 1] + 1e-6)
      }
    }
  })
})

describe('tokens', () => {
  it('creates every token in both modes', () => {
    const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'])
    for (const mode of ['light', 'dark'] as const) {
      const t = buildTokens(sys, mode)
      allTokenNames().forEach((n) => expect(t[n]?.hex).toMatch(/^#[0-9a-f]{6}$/))
    }
  })
  it('passes nearly all intended WCAG pairs for random palettes', () => {
    let total = 0,
      failed = 0
    const failures = new Map<string, number>()
    for (let i = 0; i < 60; i++) {
      const sys = systemFromPalette(generatePalette(Array(5).fill(null), 'auto'))
      for (const mode of ['light', 'dark'] as const) {
        checkPairs(buildTokens(sys, mode)).forEach((r) => {
          total++
          if (!r.pass) {
            failed++
            failures.set(`${mode}:${r.fg}/${r.bg}`, (failures.get(`${mode}:${r.fg}/${r.bg}`) ?? 0) + 1)
          }
        })
      }
    }
    console.log('pass rate', ((1 - failed / total) * 100).toFixed(1) + '%', [...failures.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8))
    expect(failed / total).toBeLessThan(0.01)
  })
  it('fixes a failing pair with an override', () => {
    const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a'])
    sys.overrides.light.text = '#bbbbbb'
    const t = buildTokens(sys, 'light')
    const bad = checkPairs(t).find((r) => r.fg === 'text' && r.bg === 'bg')!
    expect(bad.pass).toBe(false)
    const fix = suggestFix(t, bad)!
    sys.overrides.light[fix.token] = fix.hex
    expect(checkPairs(buildTokens(sys, 'light')).find((r) => r.fg === 'text' && r.bg === 'bg')!.pass).toBe(true)
  })
})
