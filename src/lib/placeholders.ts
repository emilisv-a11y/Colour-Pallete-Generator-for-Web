/* Brand-tinted placeholder pictures for the Divi layouts, drawn on a canvas in the browser.
   Photos/products become JPG, logos PNG with transparency. Returned as base64 (Divi's "encoded"). */

import type { Placeholder, PlaceholderImages } from './diviLayouts'
import { buildScales, buildTokens, type DesignSystem } from './system'

type Palette = { a: string; b: string; ink: string; soft: string }

function palette(sys: DesignSystem, i: number): Palette {
  const sc = buildScales(sys)
  const t = buildTokens(sys, 'light')
  const pairs: [string, string][] = [
    [sc.primary[1], sc.secondary[2]],
    [sc.secondary[1], sc.accent[2]],
    [sc.accent[1], sc.primary[2]],
    [sc.neutral[1], sc.primary[1]],
  ]
  const [a, b] = pairs[i % pairs.length]
  return { a, b, ink: sc.primary[6], soft: t['text-muted'].hex }
}

/** Draw one placeholder: soft gradient + a simple shape that says what goes there. */
export function drawPlaceholder(ctx: CanvasRenderingContext2D, ph: Placeholder, p: Palette) {
  const { w, h } = ph
  ctx.clearRect(0, 0, w, h)
  if (ph.kind === 'logo') {
    // a simple wordmark-like shape in the muted text colour
    ctx.fillStyle = p.soft
    const r = h * 0.28
    ctx.beginPath()
    ctx.arc(h * 0.5, h * 0.5, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(h * 0.95, h * 0.36, w * 0.55, h * 0.28, h * 0.08)
    ctx.fill()
    return
  }
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, p.a)
  g.addColorStop(1, p.b)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = p.ink
  const m = Math.min(w, h)
  if (ph.kind === 'avatar') {
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.4, m * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.95, m * 0.34, m * 0.28, 0, Math.PI, 0)
    ctx.fill()
  } else if (ph.kind === 'product') {
    ctx.beginPath()
    ctx.roundRect(w * 0.3, h * 0.28, w * 0.4, h * 0.46, m * 0.04)
    ctx.fill()
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    ctx.ellipse(w / 2, h * 0.8, w * 0.26, h * 0.04, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // landscape: sun + two hills
    ctx.beginPath()
    ctx.arc(w * 0.72, h * 0.32, m * 0.09, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(w * 0.32, h * 0.52)
    ctx.lineTo(w * 0.6, h)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(w * 0.35, h)
    ctx.lineTo(w * 0.68, h * 0.6)
    ctx.lineTo(w, h * 0.85)
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Encode the placeholders a layout needs (browser only). */
export async function placeholderImages(sys: DesignSystem, list: Placeholder[]): Promise<PlaceholderImages> {
  const out: PlaceholderImages = {}
  let i = 0
  for (const ph of list) {
    const c = document.createElement('canvas')
    c.width = ph.w
    c.height = ph.h
    drawPlaceholder(c.getContext('2d')!, ph, palette(sys, i++))
    const url = ph.kind === 'logo' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82)
    out[ph.key] = url.slice(url.indexOf(',') + 1)
  }
  return out
}

/** Small CSS background for the in-app previews (same colours as the files). */
export function placeholderCss(sys: DesignSystem, i: number, kind: Placeholder['kind']): string {
  const p = palette(sys, i)
  return kind === 'logo' ? 'transparent' : `linear-gradient(135deg, ${p.a}, ${p.b})`
}
