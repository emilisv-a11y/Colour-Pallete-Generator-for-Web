import { describe, expect, it } from 'vitest'
import { DEFAULT_TYPE, exportType, fluid, sizeAt, spaceScale, typeIssues, typeScale } from '../typography'

describe('fluid clamp', () => {
  it('matches the reference formula (16→20px over 320→1240px)', () => {
    expect(fluid(16, 20, { minVw: 320, maxVw: 1240, rootPx: 16 }).css).toBe('clamp(1rem, 0.913rem + 0.4348vw, 1.25rem)')
  })
  it('resolves to the endpoints at the min and max viewport', () => {
    const s = { minVw: 360, maxVw: 1440, rootPx: 16 }
    const f = fluid(18, 30, s)
    const at = (vw: number) => (f.interceptRem * 16 + (f.slopeVw / 100) * vw)
    expect(at(360)).toBeCloseTo(18, 1)
    expect(at(1440)).toBeCloseTo(30, 1)
    expect(sizeAt(f, 100, s)).toBe(18)
    expect(sizeAt(f, 5000, s)).toBe(30)
  })
  it('handles shrinking sizes and equal sizes', () => {
    expect(fluid(20, 16, { minVw: 320, maxVw: 1240, rootPx: 16 }).css).toContain(' - ')
    expect(fluid(16, 16, { minVw: 320, maxVw: 1240, rootPx: 16 }).css).toBe('1rem')
  })
})

describe('type scale', () => {
  it('builds steps with headings and body', () => {
    const steps = typeScale(DEFAULT_TYPE)
    expect(steps).toHaveLength(DEFAULT_TYPE.stepsUp + DEFAULT_TYPE.stepsDown + 1)
    expect(steps.find((s) => s.step === 0)!.min).toBe(16)
    expect(steps.find((s) => s.el === 'h1')!.step).toBe(6)
    expect(steps.find((s) => s.el === 'h6')!.step).toBe(1)
    expect(spaceScale(DEFAULT_TYPE).find((s) => s.name === 's')!.max).toBe(18)
  })
  it('warns about zoom risk and small body text', () => {
    const issues = typeIssues({ ...DEFAULT_TYPE, minBase: 14, minRatio: 1.1, maxRatio: 1.5 })
    expect(issues.some((i) => /16px/.test(i.text))).toBe(true)
    expect(issues.some((i) => /2.5/.test(i.text))).toBe(true)
  })
  it('exports every format', () => {
    for (const f of ['css', 'tailwind4', 'scss', 'json'] as const) expect(exportType(DEFAULT_TYPE, f).length).toBeGreaterThan(200)
    JSON.parse(exportType(DEFAULT_TYPE, 'json'))
  })
})
