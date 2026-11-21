import { describe, expect, it } from 'vitest'
import { alphaAt, analyze, findOpacity, helperColor, NO_OVERLAY, overlayCss } from '../imageText'
import { contrastRatio } from '../color'

/** Fake ImageData: left half white, right half mid-grey. */
function img(w = 100, h = 60) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const v = x < w / 2 ? 255 : 128
      data[i] = data[i + 1] = data[i + 2] = v
      data[i + 3] = 255
    }
  return { width: w, height: h, data, colorSpace: 'srgb' } as unknown as ImageData
}
const box = { x: 0, y: 0, w: 1, h: 1 }

describe('text on image', () => {
  it('measures worst-case contrast behind the text', () => {
    const a = analyze(img(), box, '#ffffff', NO_OVERLAY)
    expect(a.min).toBeCloseTo(1, 2)
    expect(a.share(4.5)).toBe(0)
    const black = analyze(img(), box, '#000000', NO_OVERLAY)
    expect(black.min).toBeCloseTo(contrastRatio('#000000', '#808080'), 1)
  })
  it('finds the overlay opacity that makes white text pass', () => {
    const op = findOpacity(img(), box, '#ffffff', { ...NO_OVERLAY, kind: 'solid', color: '#000000' }, 4.5, true)!
    expect(op).toBeGreaterThan(0.3)
    expect(op).toBeLessThan(0.7)
    const after = analyze(img(), box, '#ffffff', { ...NO_OVERLAY, kind: 'solid', color: '#000000', opacity: op })
    expect(after.min).toBeGreaterThanOrEqual(4.5)
    const before = analyze(img(), box, '#ffffff', { ...NO_OVERLAY, kind: 'solid', color: '#000000', opacity: op - 0.03 })
    expect(before.min).toBeLessThan(4.5)
  })
  it('returns null when no overlay can help', () => {
    expect(findOpacity(img(), box, '#ffffff', { ...NO_OVERLAY, kind: 'solid', color: '#ffffff' }, 4.5, true)).toBeNull()
  })
  it('fades a scrim linearly from its edge', () => {
    const ov = { ...NO_OVERLAY, kind: 'scrim' as const, opacity: 0.8, direction: 'bottom' as const, extent: 50 }
    expect(alphaAt(ov, 0.5, 1)).toBeCloseTo(0.8)
    expect(alphaAt(ov, 0.5, 0.75)).toBeCloseTo(0.4)
    expect(alphaAt(ov, 0.5, 0.4)).toBe(0)
    expect(overlayCss(ov, 50, 50, '#fff')).toContain('linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 50%)')
    const held = { ...ov, hold: 40, extent: 60 }
    expect(alphaAt(held, 0.5, 0.65)).toBeCloseTo(0.8)
    expect(alphaAt(held, 0.5, 0.5)).toBeCloseTo(0.4)
    expect(overlayCss(held, 50, 50, '#fff')).toContain('rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0) 60%')
  })
  it('picks a helpful overlay colour', () => {
    expect(helperColor('#ffffff')).toBe('#000000')
    expect(helperColor('#111111')).toBe('#ffffff')
  })
})
