import { converter, formatHex } from 'culori'

const toOklab = converter('oklab')

export type Pixel = { x: number; y: number; r: number; g: number; b: number }
export type Extracted = { hex: string; x: number; y: number }[]

/** Downsample image data to at most ~maxSamples pixels, skipping transparent ones. */
export function samplePixels(data: ImageData, maxSamples = 12000): Pixel[] {
  const { width, height } = data
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / maxSamples)))
  const out: Pixel[] = []
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      if (data.data[i + 3] < 128) continue
      out.push({ x, y, r: data.data[i], g: data.data[i + 1], b: data.data[i + 2] })
    }
  }
  return out
}

/** Seeded PRNG so the same image + count always gives the same palette. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type ExtractStyle = 'balanced' | 'vibrant' | 'muted'

/**
 * k-means clustering in OKLab (perceptual), k-means++ initialisation.
 * Returns k colours, each with the coordinates of the real pixel nearest the cluster centre,
 * so pickers can be placed on the image.
 */
export function extractPalette(pixels: Pixel[], k: number, style: ExtractStyle = 'balanced', seed = 1): Extracted {
  if (!pixels.length) return []
  const rand = mulberry32(seed)
  const pts = pixels.map((p) => {
    const o = toOklab({ mode: 'rgb', r: p.r / 255, g: p.g / 255, b: p.b / 255 })
    const chroma = Math.hypot(o.a, o.b)
    // weight pixels by style so vibrant/muted extraction favours those colours
    const w = style === 'vibrant' ? 0.15 + chroma * 6 : style === 'muted' ? Math.max(0.05, 1 - chroma * 5) : 1
    return { l: o.l, a: o.a, b: o.b, w, src: p }
  })
  const d2 = (p: { l: number; a: number; b: number }, c: { l: number; a: number; b: number }) =>
    (p.l - c.l) ** 2 + (p.a - c.a) ** 2 + (p.b - c.b) ** 2

  // k-means++
  const centres = [{ ...pts[Math.floor(rand() * pts.length)] }]
  while (centres.length < k) {
    const dist = pts.map((p) => Math.min(...centres.map((c) => d2(p, c))) * p.w)
    const total = dist.reduce((a, b) => a + b, 0)
    if (total === 0) break
    let r = rand() * total
    let idx = 0
    while (r > dist[idx] && idx < dist.length - 1) r -= dist[idx++]
    centres.push({ ...pts[idx] })
  }

  const assign = new Int32Array(pts.length)
  for (let iter = 0; iter < 16; iter++) {
    let moved = 0
    pts.forEach((p, i) => {
      let best = 0,
        bd = Infinity
      centres.forEach((c, j) => {
        const d = d2(p, c)
        if (d < bd) {
          bd = d
          best = j
        }
      })
      if (assign[i] !== best) moved++
      assign[i] = best
    })
    const sums = centres.map(() => ({ l: 0, a: 0, b: 0, w: 0 }))
    pts.forEach((p, i) => {
      const s = sums[assign[i]]
      s.l += p.l * p.w
      s.a += p.a * p.w
      s.b += p.b * p.w
      s.w += p.w
    })
    sums.forEach((s, j) => {
      if (s.w > 0) Object.assign(centres[j], { l: s.l / s.w, a: s.a / s.w, b: s.b / s.w })
    })
    if (moved === 0) break
  }

  // Snap each centre to its nearest real pixel (so the colour truly exists in the image).
  const result = centres.map((c) => {
    let best = pts[0],
      bd = Infinity
    for (const p of pts) {
      const d = d2(p, c)
      if (d < bd) {
        bd = d
        best = p
      }
    }
    return { hex: formatHex({ mode: 'rgb', r: best.src.r / 255, g: best.src.g / 255, b: best.src.b / 255 }), x: best.src.x, y: best.src.y, l: c.l }
  })
  // Order dark to light for a tidy palette.
  result.sort((a, b) => a.l - b.l)
  return result.map(({ hex, x, y }) => ({ hex, x, y }))
}

/** Average a small square around (x, y) for a stable picked colour. */
export function pickAt(data: ImageData, x: number, y: number, radius = 2): string {
  let r = 0,
    g = 0,
    b = 0,
    n = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = Math.min(data.width - 1, Math.max(0, Math.round(x + dx)))
      const py = Math.min(data.height - 1, Math.max(0, Math.round(y + dy)))
      const i = (py * data.width + px) * 4
      r += data.data[i]
      g += data.data[i + 1]
      b += data.data[i + 2]
      n++
    }
  }
  return formatHex({ mode: 'rgb', r: r / n / 255, g: g / n / 255, b: b / n / 255 })
}
