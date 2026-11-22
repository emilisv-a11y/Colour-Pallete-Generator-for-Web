/* ============================================================================
   Logo checker: find the colours in an SVG logo, check how visible it is on the
   brand's backgrounds, and make recoloured versions (one colour, white, brand…).
   ========================================================================== */

import { contrastRatio, normalizeHex } from './color'

// colour literals that can appear in SVG attributes, style attributes and <style> blocks
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g
const PROP_RE = /\b(fill|stroke|stop-color|color|flood-color|lighting-color)\s*[:=]\s*["']?\s*([a-zA-Z]+)\b/g
const SKIP = new Set(['none', 'currentcolor', 'transparent', 'inherit', 'initial', 'unset', 'url'])

export type LogoColor = { hex: string; count: number; implicit?: boolean }

/** SVG elements that draw something; without a fill they paint black. */
const SHAPES = /<(path|rect|circle|ellipse|polygon|polyline|text|tspan|use)\b([^>]*)>/gi

function hasDefaultFill(svg: string) {
  // a fill on the root <svg> or a <style> rule covering the shapes means nothing falls back to black
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? ''
  if (/\bfill\s*[:=]/.test(root)) return false
  const styles = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')
  for (const m of svg.matchAll(SHAPES)) {
    const attrs = m[2]
    if (/\bfill\s*[:=]/.test(attrs)) continue
    const cls = attrs.match(/\bclass\s*=\s*["']([^"']+)["']/)?.[1]
    if (cls && cls.split(/\s+/).some((c) => new RegExp(`\\.${c.replace(/[^\w-]/g, '')}\\b[^{]*\\{[^}]*fill\\s*:`).test(styles))) continue
    if (/(^|[\s,}])(path|rect|circle|polygon|svg|\*)\s*\{[^}]*fill\s*:/.test(styles)) continue
    return true
  }
  return false
}

/** Every distinct colour in the SVG, most used first. */
export function svgColors(svg: string): LogoColor[] {
  const counts = new Map<string, number>()
  const add = (raw: string) => {
    if (SKIP.has(raw.toLowerCase())) return
    const hex = normalizeHex(raw)
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }
  // ignore colours inside comments and metadata
  const body = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
  for (const m of body.matchAll(COLOR_RE)) add(m[0])
  for (const m of body.matchAll(PROP_RE)) add(m[2])
  const out: LogoColor[] = [...counts.entries()].map(([hex, count]) => ({ hex, count })).sort((a, b) => b.count - a.count)
  if (hasDefaultFill(body) && !counts.has('#000000')) out.push({ hex: '#000000', count: 1, implicit: true })
  return out
}

/** Replace colours (by their hex value) everywhere in the SVG. Unfilled shapes get the mapping for black. */
export function recolorSvg(svg: string, map: Record<string, string>): string {
  const swap = (raw: string) => {
    const hex = normalizeHex(raw)
    return hex && map[hex] ? map[hex] : raw
  }
  let out = svg.replace(COLOR_RE, swap).replace(PROP_RE, (all, _prop: string, value: string) => (SKIP.has(value.toLowerCase()) ? all : all.replace(value, swap(value))))
  if (map['#000000'] && hasDefaultFill(svg)) out = out.replace(/<svg\b/i, `<svg fill="${map['#000000']}"`)
  return out
}

/**
 * Every colour → one colour (keeps transparency and "none"). White details (like a tick inside a circle)
 * get `detail`, usually the background colour, so they stay visible instead of merging into the shape.
 */
export function monoSvg(svg: string, color: string, detail?: string): string {
  const map: Record<string, string> = {}
  const cols = svgColors(svg)
  cols.forEach((c) => (map[c.hex] = detail && cols.length > 1 && contrastRatio(c.hex, '#ffffff') < 1.25 ? detail : color))
  return recolorSvg(svg, map)
}

export type Visibility = { ratio: number; level: 'clear' | 'part' | 'weak' | 'low'; best: string; worst: string; worstRatio: number }

/**
 * How well the logo stands out on a background: the best contrast among its colours.
 * 3:1 is the WCAG minimum for graphics (logos are exempt, but it's a good guide for legibility).
 */
export function visibility(colors: string[], bg: string): Visibility {
  let best = colors[0] ?? '#000000'
  let ratio = 1
  let worst = best
  let worstRatio = 22
  // white details usually sit on the logo's own shapes (a tick in a circle), not on the background
  const isDetail = (c: string) => colors.length > 1 && contrastRatio(c, '#ffffff') < 1.25 && colors.some((x) => contrastRatio(x, '#ffffff') >= 1.25)
  for (const c of colors) {
    const r = contrastRatio(c, bg)
    if (r > ratio) {
      ratio = r
      best = c
    }
    if (r < worstRatio && !isDetail(c)) {
      worstRatio = r
      worst = c
    }
  }
  // the logo stands out, but one of its colours (e.g. dark text on a dark background) nearly disappears
  const part = ratio >= 3 && worstRatio < 1.5
  return { ratio, best, worst, worstRatio, level: part ? 'part' : ratio >= 3 ? 'clear' : ratio >= 1.8 ? 'weak' : 'low' }
}

/** Basic checks on the file itself. */
export function svgIssues(svg: string): string[] {
  const issues: string[] = []
  if (!/viewBox\s*=/.test(svg)) issues.push('No viewBox: the logo may not scale well. Add a viewBox in your design tool’s SVG export settings.')
  if (/<image\b/i.test(svg)) issues.push('It contains an embedded bitmap image, which won’t recolour and may look blurry when enlarged.')
  if (/<text\b/i.test(svg)) issues.push('It contains live text, which depends on fonts installed on the visitor’s device. Convert text to outlines.')
  if (/<script\b/i.test(svg) || /\son[a-z]+\s*=/i.test(svg)) issues.push('It contains scripts or event handlers. They are removed in the preview; use a clean export on the website.')
  if (svg.length > 100_000) issues.push(`It’s ${Math.round(svg.length / 1024)} KB. Logos are usually under 20 KB; try an optimiser such as SVGOMG.`)
  return issues
}

/** Remove scripts and event handlers so the SVG is safe to show. */
export function safeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href\s*=\s*["'])\s*javascript:[^"']*/gi, '$1#')
}

/** Render an SVG to a PNG blob at a given width (keeps the aspect ratio). */
export async function svgToPng(svg: string, width = 1024): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('Could not draw this SVG'))
      img.src = url
    })
    const ratio = img.naturalHeight && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1
    const c = document.createElement('canvas')
    c.width = width
    c.height = Math.max(1, Math.round(width * ratio))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG failed'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ---------- bitmap logos (PNG/WebP with transparency) ---------- */

/** Main colours of a bitmap logo (ignores transparent pixels) and whether it has transparency. */
export function bitmapColors(data: ImageData): { colors: string[]; transparent: boolean } {
  const buckets = new Map<string, number>()
  let transparent = false
  for (let i = 0; i < data.data.length; i += 4) {
    const a = data.data[i + 3]
    if (a < 250) transparent = true
    if (a < 128) continue
    const q = (v: number) => Math.min(255, Math.round(v / 24) * 24)
    const key = `${q(data.data[i])},${q(data.data[i + 1])},${q(data.data[i + 2])}`
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  const total = [...buckets.values()].reduce((a, b) => a + b, 0) || 1
  const colors = [...buckets.entries()]
    .filter(([, n]) => n / total > 0.02)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => {
      const [r, g, b] = k.split(',').map(Number)
      return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
    })
  return { colors, transparent }
}

/** Bitmap logo in one colour, keeping its transparency. */
export function monoBitmap(data: ImageData, color: string): ImageData {
  const n = parseInt(color.slice(1), 16)
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255
  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height)
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = r
    out.data[i + 1] = g
    out.data[i + 2] = b
  }
  return out
}
