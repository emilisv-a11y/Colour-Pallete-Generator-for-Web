import { formatHex, interpolate, type Color } from 'culori'

export type GradientType = 'linear' | 'radial' | 'conic'
export type GradientSpace = 'srgb' | 'oklab' | 'oklch'
export type Stop = { id: string; color: string; pos: number }
export type Gradient = { type: GradientType; angle: number; space: GradientSpace; shape: 'circle' | 'ellipse'; cx: number; cy: number; stops: Stop[] }

const sorted = (stops: Stop[]) => [...stops].sort((a, b) => a.pos - b.pos)

/** Colour at position t (0–100) using the chosen interpolation space. */
export function sampleGradient(stops: Stop[], t: number, space: GradientSpace): string {
  const s = sorted(stops)
  if (t <= s[0].pos) return s[0].color
  if (t >= s[s.length - 1].pos) return s[s.length - 1].color
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i],
      b = s[i + 1]
    if (t >= a.pos && t <= b.pos) {
      const local = b.pos === a.pos ? 0 : (t - a.pos) / (b.pos - a.pos)
      const mode = space === 'srgb' ? 'rgb' : space
      return formatHex(interpolate([a.color, b.color], mode)(local) as Color).toLowerCase()
    }
  }
  return s[0].color
}

/** Evenly spaced colours along the gradient (endpoints included). */
export function gradientPalette(g: Gradient, steps: number): string[] {
  return Array.from({ length: steps }, (_, i) => sampleGradient(g.stops, (i / (steps - 1)) * 100, g.space))
}

export function stopsCss(stops: Stop[]) {
  return sorted(stops)
    .map((s) => `${s.color} ${Math.round(s.pos)}%`)
    .join(', ')
}

function prefix(g: Gradient, withSpace: boolean) {
  const sp = withSpace && g.space !== 'srgb' ? ` in ${g.space}` : ''
  if (g.type === 'linear') return `${g.angle}deg${sp}`
  if (g.type === 'radial') return `${g.shape} at ${g.cx}% ${g.cy}%${sp}`
  return `from ${g.angle}deg at ${g.cx}% ${g.cy}%${sp}`
}

export function gradientCss(g: Gradient, withSpace = true) {
  return `${g.type}-gradient(${prefix(g, withSpace)}, ${stopsCss(g.stops)})`
}

/**
 * CSS with a fallback for older browsers. When a perceptual space is used, the fallback
 * approximates it by adding sampled intermediate sRGB stops.
 */
export function gradientCode(g: Gradient) {
  const modern = gradientCss(g, true)
  let fallback = gradientCss(g, false)
  if (g.space !== 'srgb') {
    const dense = Array.from({ length: 11 }, (_, i) => ({ id: String(i), color: sampleGradient(g.stops, i * 10, g.space), pos: i * 10 }))
    fallback = gradientCss({ ...g, stops: dense }, false)
  }
  return {
    css: g.space === 'srgb' ? `background: ${modern};` : `background: ${fallback};\nbackground: ${modern};`,
    modern,
  }
}
