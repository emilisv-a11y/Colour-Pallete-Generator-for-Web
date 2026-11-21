import { converter, formatHex } from 'culori'

const toOklab = converter('oklab')
const toRgb = converter('rgb')

export type MeshPoint = { id: string; color: string; x: number; y: number; spread: number }
export type MeshMode = 'css' | 'smooth'
export type Mesh = {
  base: string
  points: MeshPoint[]
  mode: MeshMode
  /** smooth mode: how far each colour reaches (higher = sharper colour regions) */
  sharpness: number
  /** 0–100 film grain added to image exports and the preview */
  grain: number
}

/* ---------- CSS (layered radial gradients) ---------- */

/** Layered radial gradients over a base colour: the standard CSS "mesh gradient" technique. */
export function meshCssValue(m: Mesh) {
  return m.points.map((p) => `radial-gradient(at ${Math.round(p.x)}% ${Math.round(p.y)}%, ${p.color} 0px, ${p.color}00 ${Math.round(p.spread)}%)`)
}

export function meshCss(m: Mesh) {
  return `background-color: ${m.base};\nbackground-image:\n  ${meshCssValue(m).join(',\n  ')};`
}

/**
 * Draw exactly what the CSS produces. A radial-gradient with no size is an ellipse sized to the
 * farthest corner, with the aspect ratio of farthest-side: rx = √2·max(x, W−x), ry = √2·max(y, H−y).
 */
export function renderCss(ctx: CanvasRenderingContext2D, W: number, H: number, m: Mesh) {
  ctx.save()
  ctx.fillStyle = m.base
  ctx.fillRect(0, 0, W, H)
  // first CSS layer is on top, so paint from the last point to the first
  for (const p of [...m.points].reverse()) {
    const px = (p.x / 100) * W
    const py = (p.y / 100) * H
    const rx = Math.SQRT2 * Math.max(px, W - px)
    const ry = Math.SQRT2 * Math.max(py, H - py)
    ctx.save()
    ctx.translate(px, py)
    ctx.scale(1, ry / rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, p.color)
    g.addColorStop(Math.min(1, Math.max(0.001, p.spread / 100)), `${p.color}00`)
    g.addColorStop(1, `${p.color}00`)
    ctx.fillStyle = g
    ctx.fillRect(-px, (-py * rx) / ry, W, (H * rx) / ry)
    ctx.restore()
  }
  ctx.restore()
}

/* ---------- Smooth mesh (perceptual blend, image only) ---------- */

/**
 * Inverse-distance weighted blend in OKLab, computed on a small grid and upscaled with smoothing.
 * Looks like a true mesh gradient (no grey seams); it can only be exported as an image.
 */
export function renderSmooth(ctx: CanvasRenderingContext2D, W: number, H: number, m: Mesh) {
  const gw = 220
  const gh = Math.max(2, Math.round((gw * H) / W))
  const aspect = W / H
  const base = toOklab(m.base)!
  const pts = m.points.map((p) => ({ ...toOklab(p.color)!, x: (p.x / 100) * aspect, y: p.y / 100, s: p.spread / 60 }))
  const power = m.sharpness
  const img = new ImageData(gw, gh)
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = (i / (gw - 1)) * aspect
      const y = j / (gh - 1)
      let wl = 0.35,
        L = base.l * 0.35,
        A = base.a * 0.35,
        B = base.b * 0.35
      for (const p of pts) {
        const d2 = (x - p.x) ** 2 + (y - p.y) ** 2
        const w = (p.s * p.s) / Math.pow(d2 + 0.0004, power / 2)
        wl += w
        L += p.l * w
        A += p.a * w
        B += p.b * w
      }
      const c = toRgb({ mode: 'oklab', l: L / wl, a: A / wl, b: B / wl })
      const k = (j * gw + i) * 4
      img.data[k] = Math.max(0, Math.min(255, Math.round(c.r * 255)))
      img.data[k + 1] = Math.max(0, Math.min(255, Math.round(c.g * 255)))
      img.data[k + 2] = Math.max(0, Math.min(255, Math.round(c.b * 255)))
      img.data[k + 3] = 255
    }
  }
  const small = document.createElement('canvas')
  small.width = gw
  small.height = gh
  small.getContext('2d')!.putImageData(img, 0, 0)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(small, 0, 0, W, H)
  ctx.restore()
}

/** Monochrome film grain; also hides 8-bit banding in large exports. */
export function addGrain(ctx: CanvasRenderingContext2D, W: number, H: number, amount: number) {
  if (amount <= 0) return
  const data = ctx.getImageData(0, 0, W, H)
  const strength = amount * 0.6
  // seeded so the preview doesn't flicker while dragging points
  let seed = 7
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = 0; i < data.data.length; i += 4) {
    const n = (rand() - 0.5) * strength
    data.data[i] += n
    data.data[i + 1] += n
    data.data[i + 2] += n
  }
  ctx.putImageData(data, 0, 0)
}

export function renderMesh(ctx: CanvasRenderingContext2D, W: number, H: number, m: Mesh) {
  if (m.mode === 'css') renderCss(ctx, W, H, m)
  else renderSmooth(ctx, W, H, m)
  addGrain(ctx, W, H, m.grain)
}

/** Average colour of the rendered mesh, handy as a fallback background or text-contrast check. */
export function meshAverage(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const d = ctx.getImageData(0, 0, W, H).data
  let r = 0,
    g = 0,
    b = 0
  const step = 4 * 37
  let n = 0
  for (let i = 0; i < d.length; i += step) {
    r += d[i]
    g += d[i + 1]
    b += d[i + 2]
    n++
  }
  return formatHex({ mode: 'rgb', r: r / n / 255, g: g / n / 255, b: b / n / 255 })
}
