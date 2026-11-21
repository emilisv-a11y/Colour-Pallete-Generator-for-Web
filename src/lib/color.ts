import {
  clampChroma,
  converter,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
  filterGrayscale,
  formatHex,
  interpolate,
  parse,
  wcagContrast,
  wcagLuminance,
  type Color,
  type Oklch,
} from 'culori'

export const toOklch = converter('oklch')
const toRgb = converter('rgb')
const toHsl = converter('hsl')
const toHsv = converter('hsv')
const toLab = converter('lab')

/** Normalise any CSS colour string to a lowercase 6-digit hex (with #). Returns null if invalid. */
export function normalizeHex(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const candidate = /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s) ? `#${s}` : s
  const c = parse(candidate)
  if (!c) return null
  return formatHex(c).toLowerCase()
}

export function isValidColor(input: string): boolean {
  return normalizeHex(input) !== null
}

/** Build a hex from OKLCH, mapping into the sRGB gamut by reducing chroma. */
export function oklchToHex(l: number, c: number, h: number): string {
  const col: Oklch = { mode: 'oklch', l: clamp(l, 0, 1), c: Math.max(0, c), h: ((h % 360) + 360) % 360 }
  return formatHex(clampChroma(col, 'oklch')).toLowerCase()
}

export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const o = toOklch(hex)!
  return { l: o.l, c: o.c ?? 0, h: o.h ?? 0 }
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

const r = (n: number, d = 0) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

export type FormatId = 'hex' | 'rgb' | 'hsl' | 'hsb' | 'cmyk' | 'lab' | 'oklch'

export const FORMATS: { id: FormatId; label: string }[] = [
  { id: 'hex', label: 'HEX' },
  { id: 'rgb', label: 'RGB' },
  { id: 'hsl', label: 'HSL' },
  { id: 'hsb', label: 'HSB' },
  { id: 'cmyk', label: 'CMYK' },
  { id: 'lab', label: 'LAB' },
  { id: 'oklch', label: 'OKLCH' },
]

export function rgbValues(hex: string) {
  const c = toRgb(hex)!
  return { r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) }
}

export function cmykValues(hex: string) {
  const { r: R, g: G, b: B } = rgbValues(hex)
  const rp = R / 255,
    gp = G / 255,
    bp = B / 255
  const k = 1 - Math.max(rp, gp, bp)
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: r(((1 - rp - k) / (1 - k)) * 100),
    m: r(((1 - gp - k) / (1 - k)) * 100),
    y: r(((1 - bp - k) / (1 - k)) * 100),
    k: r(k * 100),
  }
}

/** Format a colour as a CSS-ish string in the requested notation. */
export function formatColor(hex: string, format: FormatId): string {
  switch (format) {
    case 'hex':
      return hex.toUpperCase()
    case 'rgb': {
      const { r: R, g, b } = rgbValues(hex)
      return `rgb(${R}, ${g}, ${b})`
    }
    case 'hsl': {
      const c = toHsl(hex)!
      return `hsl(${r(c.h ?? 0)}, ${r((c.s ?? 0) * 100)}%, ${r(c.l * 100)}%)`
    }
    case 'hsb': {
      const c = toHsv(hex)!
      return `hsb(${r(c.h ?? 0)}, ${r((c.s ?? 0) * 100)}%, ${r(c.v * 100)}%)`
    }
    case 'cmyk': {
      const c = cmykValues(hex)
      return `cmyk(${c.c}%, ${c.m}%, ${c.y}%, ${c.k}%)`
    }
    case 'lab': {
      const c = toLab(hex)!
      return `lab(${r(c.l, 1)}% ${r(c.a, 1)} ${r(c.b, 1)})`
    }
    case 'oklch': {
      const c = hexToOklch(hex)
      return `oklch(${r(c.l * 100, 1)}% ${r(c.c, 3)} ${r(c.h, 1)})`
    }
  }
}

/** Short label shown on a swatch (hex without #, or compact value). */
export function swatchLabel(hex: string, format: FormatId): string {
  if (format === 'hex') return hex.slice(1).toUpperCase()
  return formatColor(hex, format)
}

export function luminance(hex: string) {
  return wcagLuminance(hex)
}

export function contrastRatio(a: string, b: string) {
  return wcagContrast(a, b)
}

/** Pick black or white text for the best contrast on a background. */
export function readableOn(bg: string): '#000000' | '#ffffff' {
  return contrastRatio(bg, '#000000') >= contrastRatio(bg, '#ffffff') ? '#000000' : '#ffffff'
}

export function isLight(hex: string) {
  return readableOn(hex) === '#000000'
}

export type WcagResult = { aaNormal: boolean; aaLarge: boolean; aaaNormal: boolean; aaaLarge: boolean; ui: boolean }

export function wcagLevels(ratio: number): WcagResult {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    ui: ratio >= 3,
  }
}

export function ratingLabel(ratio: number) {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fail'
}

/**
 * Find the colour nearest to `fg` (same hue and chroma, lightness changed) that reaches
 * `target` contrast against `bg`. Returns null if impossible.
 */
export function fixContrast(fg: string, bg: string, target: number): string | null {
  if (contrastRatio(fg, bg) >= target) return fg
  const { l, c, h } = hexToOklch(fg)
  let best: string | null = null
  let bestDist = Infinity
  for (const dir of [-1, 1]) {
    for (let step = 1; step <= 100; step++) {
      const nl = l + dir * step * 0.01
      if (nl < 0 || nl > 1) break
      const cand = oklchToHex(nl, c, h)
      if (contrastRatio(cand, bg) >= target) {
        if (step < bestDist) {
          bestDist = step
          best = cand
        }
        break
      }
    }
  }
  return best
}

/** A strip of lighter-to-darker variations of a colour, with the original included. */
export function shadeStrip(hex: string, count = 20): { hex: string; original: boolean }[] {
  const { l, c, h } = hexToOklch(hex)
  const out: { hex: string; l: number; original: boolean }[] = []
  for (let i = 0; i < count; i++) {
    const nl = 0.98 - (i / (count - 1)) * 0.86
    // keep chroma proportional, tapering at the extremes so tints/shades stay natural
    const taper = 1 - Math.abs(nl - l) * 0.6
    out.push({ hex: oklchToHex(nl, c * Math.max(0.2, taper), h), l: nl, original: false })
  }
  // replace the closest step with the exact original
  let idx = 0
  out.forEach((s, i) => {
    if (Math.abs(s.l - l) < Math.abs(out[idx].l - l)) idx = i
  })
  out[idx] = { hex, l, original: true }
  return out.map(({ hex: x, original }) => ({ hex: x, original }))
}

/** Mix with white (tints) or black (shades) in OKLab, Tailwind-like steps. */
export function tintsAndShades(hex: string, steps = 10) {
  const toWhite = interpolate([hex, '#ffffff'], 'oklab')
  const toBlack = interpolate([hex, '#000000'], 'oklab')
  const tints: string[] = []
  const shades: string[] = []
  for (let i = 1; i <= steps; i++) {
    tints.push(formatHex(toWhite(i / (steps + 1)) as Color).toLowerCase())
    shades.push(formatHex(toBlack(i / (steps + 1)) as Color).toLowerCase())
  }
  return { tints, shades }
}

export type HarmonyId = 'complementary' | 'analogous' | 'triadic' | 'split' | 'tetradic' | 'square' | 'monochromatic'

export const HARMONIES: { id: HarmonyId; label: string; offsets: number[] }[] = [
  { id: 'complementary', label: 'Complementary', offsets: [0, 180] },
  { id: 'split', label: 'Split complementary', offsets: [0, 150, 210] },
  { id: 'analogous', label: 'Analogous', offsets: [-30, 0, 30] },
  { id: 'triadic', label: 'Triadic', offsets: [0, 120, 240] },
  { id: 'tetradic', label: 'Tetradic', offsets: [0, 60, 180, 240] },
  { id: 'square', label: 'Square', offsets: [0, 90, 180, 270] },
]

export function harmony(hex: string, offsets: number[]): string[] {
  const { l, c, h } = hexToOklch(hex)
  return offsets.map((o) => (o === 0 ? hex : oklchToHex(l, c, h + o)))
}

export function monochromatic(hex: string, count = 5): string[] {
  const { c, h } = hexToOklch(hex)
  return Array.from({ length: count }, (_, i) => oklchToHex(0.25 + (i / (count - 1)) * 0.65, c, h))
}

/* ---------- Palette adjustments ---------- */

export type Adjustments = { hue: number; saturation: number; brightness: number; temperature: number }
export const NO_ADJUSTMENTS: Adjustments = { hue: 0, saturation: 0, brightness: 0, temperature: 0 }

export function isNeutralAdjust(a: Adjustments) {
  return !a.hue && !a.saturation && !a.brightness && !a.temperature
}

export function adjustColor(hex: string, a: Adjustments): string {
  if (isNeutralAdjust(a)) return hex
  let { l, c, h } = hexToOklch(hex)
  h += a.hue
  c = c * (1 + a.saturation / 100)
  l = clamp(l + (a.brightness / 100) * 0.4, 0, 1)
  let out = oklchToHex(l, c, h)
  if (a.temperature) {
    const t = a.temperature / 100
    const rgb = toRgb(out)!
    rgb.r = clamp(rgb.r + t * 0.12, 0, 1)
    rgb.g = clamp(rgb.g + t * 0.03, 0, 1)
    rgb.b = clamp(rgb.b - t * 0.12, 0, 1)
    out = formatHex(rgb).toLowerCase()
  }
  return out
}

/* ---------- Colour-blindness simulation ---------- */

export type VisionId =
  | 'normal'
  | 'protanopia'
  | 'protanomaly'
  | 'deuteranopia'
  | 'deuteranomaly'
  | 'tritanopia'
  | 'tritanomaly'
  | 'achromatopsia'
  | 'achromatomaly'

export const VISIONS: { id: VisionId; label: string; note: string }[] = [
  { id: 'normal', label: 'Normal vision', note: '' },
  { id: 'protanopia', label: 'Protanopia', note: 'No red cones' },
  { id: 'protanomaly', label: 'Protanomaly', note: 'Weak red' },
  { id: 'deuteranopia', label: 'Deuteranopia', note: 'No green cones' },
  { id: 'deuteranomaly', label: 'Deuteranomaly', note: 'Weak green (most common)' },
  { id: 'tritanopia', label: 'Tritanopia', note: 'No blue cones' },
  { id: 'tritanomaly', label: 'Tritanomaly', note: 'Weak blue' },
  { id: 'achromatopsia', label: 'Achromatopsia', note: 'No colour' },
  { id: 'achromatomaly', label: 'Achromatomaly', note: 'Weak colour' },
]

const visionFilters: Record<Exclude<VisionId, 'normal'>, (c: Color) => Color> = {
  protanopia: filterDeficiencyProt(1),
  protanomaly: filterDeficiencyProt(0.6),
  deuteranopia: filterDeficiencyDeuter(1),
  deuteranomaly: filterDeficiencyDeuter(0.6),
  tritanopia: filterDeficiencyTrit(1),
  tritanomaly: filterDeficiencyTrit(0.6),
  achromatopsia: filterGrayscale(1),
  achromatomaly: filterGrayscale(0.6),
}

export function simulateVision(hex: string, vision: VisionId): string {
  if (vision === 'normal') return hex
  const c = parse(hex)
  if (!c) return hex
  return formatHex(visionFilters[vision](c)).toLowerCase()
}

export function randomHex() {
  return oklchToHex(0.35 + Math.random() * 0.55, 0.04 + Math.random() * 0.16, Math.random() * 360)
}
