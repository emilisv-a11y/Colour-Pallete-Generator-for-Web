/* ============================================================================
   Text on image contrast
   Measures WCAG contrast between a text colour and every (sampled) pixel behind
   a text area, after an optional overlay. Overlays blend in sRGB, the same way
   browsers render a semi-transparent layer over a background image.
   ========================================================================== */

import { rgbValues } from './color'

const LIN = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const lum = (r: number, g: number, b: number) => 0.2126 * LIN[r] + 0.7152 * LIN[g] + 0.0722 * LIN[b]

export type OverlayKind = 'none' | 'solid' | 'scrim' | 'box'
export type ScrimDir = 'bottom' | 'top' | 'left' | 'right'
/** Scrim: full `opacity` from the edge to `hold`%, then fades to transparent at `extent`%. */
export type Overlay = { kind: OverlayKind; color: string; opacity: number; direction: ScrimDir; extent: number; hold: number }
export type Box = { x: number; y: number; w: number; h: number } // fractions of the frame (0–1)

export const NO_OVERLAY: Overlay = { kind: 'none', color: '#000000', opacity: 0.5, direction: 'bottom', extent: 70, hold: 0 }

/** Overlay opacity at a point (fractions of the frame). */
export function alphaAt(ov: Overlay, fx: number, fy: number): number {
  switch (ov.kind) {
    case 'none':
      return 0
    case 'solid':
    case 'box':
      return ov.opacity
    case 'scrim': {
      const hold = Math.max(0, Math.min(ov.hold, ov.extent - 1)) / 100
      const e = Math.max(hold + 0.01, ov.extent / 100)
      const d = ov.direction === 'bottom' ? 1 - fy : ov.direction === 'top' ? fy : ov.direction === 'left' ? fx : 1 - fx
      if (d <= hold) return ov.opacity
      return ov.opacity * Math.max(0, 1 - (d - hold) / (e - hold))
    }
  }
}

export type Analysis = {
  samples: number
  min: number
  p02: number
  p05: number
  median: number
  /** share of the area meeting `target` */
  share: (target: number) => number
  /** fractional coordinates of failing samples, for the heatmap */
  failing: (target: number) => [number, number][]
}

/** Contrast of `text` against every sampled pixel inside `box` (image is the frame-sized ImageData). */
export function analyze(img: ImageData, box: Box, text: string, ov: Overlay): Analysis {
  const { width: W, height: H, data } = img
  const x0 = Math.max(0, Math.floor(box.x * W)),
    x1 = Math.min(W, Math.ceil((box.x + box.w) * W))
  const y0 = Math.max(0, Math.floor(box.y * H)),
    y1 = Math.min(H, Math.ceil((box.y + box.h) * H))
  const area = Math.max(1, (x1 - x0) * (y1 - y0))
  const step = Math.max(1, Math.floor(Math.sqrt(area / 25000)))
  const t = rgbValues(text)
  const Lt = lum(t.r, t.g, t.b)
  const o = rgbValues(ov.color)
  const ratios: number[] = []
  const coords: [number, number][] = []
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * W + x) * 4
      const a = alphaAt(ov, x / W, y / H)
      const r = Math.round(data[i] * (1 - a) + o.r * a)
      const g = Math.round(data[i + 1] * (1 - a) + o.g * a)
      const b = Math.round(data[i + 2] * (1 - a) + o.b * a)
      const Lb = lum(r, g, b)
      ratios.push((Math.max(Lt, Lb) + 0.05) / (Math.min(Lt, Lb) + 0.05))
      coords.push([x / W, y / H])
    }
  }
  const sorted = [...ratios].sort((a, b) => a - b)
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 21
  return {
    samples: ratios.length,
    min: sorted[0] ?? 21,
    p02: pct(0.02),
    p05: pct(0.05),
    median: pct(0.5),
    share: (target) => (ratios.length ? ratios.filter((r) => r >= target).length / ratios.length : 1),
    failing: (target) => coords.filter((_, i) => ratios[i] < target),
  }
}

/** The metric a design must meet: the worst pixel (strict) or the 2nd percentile (ignores tiny specks like stars or highlights). */
export const metricOf = (a: Analysis, strict: boolean) => (strict ? a.min : a.p02)

/** Smallest overlay opacity that makes the text area pass, or null if even a fully opaque overlay can't. */
export function findOpacity(img: ImageData, box: Box, text: string, ov: Overlay, target: number, strict: boolean): number | null {
  const pass = (op: number) => metricOf(analyze(img, box, text, { ...ov, opacity: op }), strict) >= target
  if (pass(0) && ov.kind !== 'scrim') return 0
  if (!pass(1)) return null
  let lo = 0,
    hi = 1
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    if (pass(mid)) hi = mid
    else lo = mid
  }
  return Math.ceil(hi * 100) / 100
}

/** Overlay colour that helps a given text colour: dark behind light text, light behind dark text. */
export function helperColor(text: string) {
  const t = rgbValues(text)
  return lum(t.r, t.g, t.b) > 0.18 ? '#000000' : '#ffffff'
}

const rgba = (hex: string, a: number) => {
  const { r, g, b } = rgbValues(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`
}

/** CSS for a section with the image and overlay. */
export function overlayCss(ov: Overlay, posX: number, posY: number, text: string) {
  const pos = `${Math.round(posX)}% ${Math.round(posY)}%`
  const img = `url('your-image.jpg')`
  if (ov.kind === 'none' || ov.kind === 'box') {
    const base = `.hero {\n  background-image: ${img};\n  background-size: cover;\n  background-position: ${pos};\n  color: ${text};\n}`
    if (ov.kind === 'none') return base
    return `${base}\n\n/* Panel behind the text */\n.hero-text {\n  background-color: ${rgba(ov.color, ov.opacity)};\n  padding: 1.5rem 2rem;\n  border-radius: 12px;\n}`
  }
  const layer =
    ov.kind === 'solid'
      ? `linear-gradient(${rgba(ov.color, ov.opacity)}, ${rgba(ov.color, ov.opacity)})`
      : `linear-gradient(to ${({ bottom: 'top', top: 'bottom', left: 'right', right: 'left' } as const)[ov.direction]}, ${rgba(ov.color, ov.opacity)} 0%, ${ov.hold > 0 ? `${rgba(ov.color, ov.opacity)} ${Math.round(ov.hold)}%, ` : ''}${rgba(ov.color, 0)} ${ov.extent}%)`
  return `.hero {\n  background-image:\n    ${layer},\n    ${img};\n  background-size: cover;\n  background-position: ${pos};\n  color: ${text};\n}`
}
