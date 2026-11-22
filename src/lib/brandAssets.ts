/* ============================================================================
   Brand assets: favicon + app icons (ICO, PNG, SVG, web manifest, HTML tags)
   and social share images, drawn on a canvas with the brand colours and fonts.
   ========================================================================== */

import { zipSync } from 'fflate'
import { contrastRatio } from './color'

/* ---------- icons ---------- */

export type IconShape = 'square' | 'rounded' | 'circle'
export type IconSpec = {
  source: 'monogram' | 'logo'
  text: string
  font: string // CSS font-family stack for the monogram
  weight: number
  bg: string // '' = transparent
  fg: string
  shape: IconShape
  /** inner padding as a share of the icon size (0–0.35) */
  padding: number
}

export const ICON_SIZES = { ico: [16, 32, 48], apple: 180, android: [192, 512] } as const

/** Initials for a monogram: "Corner Café" → "CC", "studio" → "S". */
export function initials(name: string, max = 2): string {
  const words = name.trim().split(/[\s\-_&+]+/).filter((w) => /\p{L}|\d/u.test(w))
  if (!words.length) return 'A'
  const letters = words.length === 1 ? [...words[0]].filter((c) => /\p{L}|\d/u.test(c)).slice(0, 1) : words.slice(0, max).map((w) => [...w].find((c) => /\p{L}|\d/u.test(c)) ?? '')
  return letters.join('').toUpperCase()
}

function shapePath(ctx: CanvasRenderingContext2D, size: number, shape: IconShape) {
  ctx.beginPath()
  if (shape === 'circle') ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  else if (shape === 'rounded') ctx.roundRect(0, 0, size, size, size * 0.22)
  else ctx.rect(0, 0, size, size)
}

/**
 * Draw the icon. `img` is the logo when source = 'logo'. `maskable` adds the Android safe zone
 * (content inside the middle 80%, background filling the whole square).
 */
export function drawIcon(ctx: CanvasRenderingContext2D, size: number, spec: IconSpec, img?: CanvasImageSource & { width: number; height: number }, maskable = false) {
  ctx.clearRect(0, 0, size, size)
  const bg = spec.bg || (maskable ? '#ffffff' : '')
  if (bg) {
    ctx.fillStyle = bg
    if (maskable) ctx.fillRect(0, 0, size, size)
    else {
      shapePath(ctx, size, spec.shape)
      ctx.fill()
    }
  }
  // tiny favicons get less padding so the mark stays readable
  const pad = size * (maskable ? Math.max(spec.padding, 0.2) : size <= 32 ? Math.min(spec.padding, 0.12) : spec.padding)
  const box = size - pad * 2
  if (spec.source === 'logo' && img && img.width && img.height) {
    const r = Math.min(box / img.width, box / img.height)
    const w = img.width * r,
      h = img.height * r
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
    return
  }
  const text = spec.text || 'A'
  ctx.fillStyle = spec.fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  let px = box * (text.length > 1 ? 0.62 : 0.82)
  ctx.font = `${spec.weight} ${px}px ${spec.font}`
  const m = ctx.measureText(text)
  if (m.width > box) {
    px *= box / m.width
    ctx.font = `${spec.weight} ${px}px ${spec.font}`
  }
  const mm = ctx.measureText(text)
  const asc = mm.actualBoundingBoxAscent || px * 0.72
  const desc = mm.actualBoundingBoxDescent || 0
  ctx.fillText(text, size / 2, size / 2 + (asc - desc) / 2)
}

export function canvasBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not create the image'))), type, quality))
}

export async function iconPng(spec: IconSpec, size: number, img?: CanvasImageSource & { width: number; height: number }, maskable = false): Promise<Uint8Array> {
  const c = document.createElement('canvas')
  c.width = c.height = size
  drawIcon(c.getContext('2d')!, size, spec, img, maskable)
  return new Uint8Array(await (await canvasBlob(c)).arrayBuffer())
}

/** ICO file holding PNG images (supported by every current browser and Windows Vista+). */
export function encodeIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const header = 6 + images.length * 16
  const total = header + images.reduce((n, i) => n + i.png.length, 0)
  const out = new Uint8Array(total)
  const v = new DataView(out.buffer)
  v.setUint16(0, 0, true)
  v.setUint16(2, 1, true) // icon
  v.setUint16(4, images.length, true)
  let offset = header
  images.forEach((img, i) => {
    const e = 6 + i * 16
    out[e] = img.size >= 256 ? 0 : img.size
    out[e + 1] = img.size >= 256 ? 0 : img.size
    out[e + 2] = 0
    out[e + 3] = 0
    v.setUint16(e + 4, 1, true) // colour planes
    v.setUint16(e + 6, 32, true) // bits per pixel
    v.setUint32(e + 8, img.png.length, true)
    v.setUint32(e + 12, offset, true)
    out.set(img.png, offset)
    offset += img.png.length
  })
  return out
}

/** Scalable favicon: the logo on its background shape (monograms use live text, so a PNG is safer for them). */
export function iconSvg(spec: IconSpec, logoSvg?: string): string {
  const shape = spec.bg ? (spec.shape === 'circle' ? `<circle cx="50" cy="50" r="50" fill="${spec.bg}"/>` : `<rect width="100" height="100" rx="${spec.shape === 'rounded' ? 22 : 0}" fill="${spec.bg}"/>`) : ''
  const pad = spec.padding * 100
  if (spec.source === 'logo' && logoSvg) {
    const inner = logoSvg.replace(/<\?xml[^>]*>/, '').replace(/<svg\b/, `<svg x="${pad}" y="${pad}" width="${100 - pad * 2}" height="${100 - pad * 2}" preserveAspectRatio="xMidYMid meet"`)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shape}${inner}</svg>`
  }
  const size = (100 - pad * 2) * (spec.text.length > 1 ? 0.62 : 0.82)
  const font = spec.font.replace(/"/g, "'")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shape}<text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="${font}" font-weight="${spec.weight}" font-size="${size.toFixed(1)}" fill="${spec.fg}">${spec.text.replace(/[<&]/g, '')}</text></svg>`
}

export function manifest(name: string, themeColor: string, bgColor: string) {
  const short = name.length > 12 ? name.split(/\s+/)[0].slice(0, 12) : name
  return JSON.stringify(
    {
      name,
      short_name: short,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      theme_color: themeColor,
      background_color: bgColor,
      display: 'standalone',
    },
    null,
    2,
  )
}

export function iconTags(themeColor: string, withSvg: boolean) {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    withSvg ? '<link rel="icon" href="/favicon.svg" type="image/svg+xml">' : '',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    `<meta name="theme-color" content="${themeColor}">`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Everything for the site's root folder, zipped. */
export async function iconZip(spec: IconSpec, opts: { name: string; themeColor: string; bgColor: string; img?: CanvasImageSource & { width: number; height: number }; logoSvg?: string; readme: string }): Promise<Uint8Array> {
  const icoImgs = await Promise.all(ICON_SIZES.ico.map(async (size) => ({ size, png: await iconPng(spec, size, opts.img) })))
  const files: Record<string, Uint8Array> = {
    'favicon.ico': encodeIco(icoImgs),
    'favicon-32.png': icoImgs[1].png,
    'apple-touch-icon.png': await iconPng({ ...spec, bg: spec.bg || '#ffffff', shape: 'square' }, ICON_SIZES.apple, opts.img),
    'icon-192.png': await iconPng(spec, 192, opts.img),
    'icon-512.png': await iconPng(spec, 512, opts.img),
    'icon-maskable-512.png': await iconPng(spec, 512, opts.img, true),
    'site.webmanifest': new TextEncoder().encode(manifest(opts.name, opts.themeColor, opts.bgColor)),
    'html-tags.txt': new TextEncoder().encode(iconTags(opts.themeColor, spec.source === 'logo' && !!opts.logoSvg)),
    'README.txt': new TextEncoder().encode(opts.readme),
  }
  if (spec.source === 'logo' && opts.logoSvg) files['favicon.svg'] = new TextEncoder().encode(iconSvg(spec, opts.logoSvg))
  return zipSync(files, { level: 6 })
}

/* ---------- social share images ---------- */

export type SocialTemplate = 'split' | 'centered' | 'card' | 'bold'
export type SocialSpec = {
  template: SocialTemplate
  title: string
  subtitle: string
  site: string
  colors: { primary: string; onPrimary: string; secondary: string; accent: string; bg: string; text: string; muted: string; dark: string; onDark: string; subtle: string }
  fonts: { heading: string; body: string }
  radius: number
}

export const SOCIAL_SIZES = [
  { id: 'og', label: 'Link preview 1200 × 630', w: 1200, h: 630, note: 'Facebook, LinkedIn, X, WhatsApp, Slack' },
  { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080, note: 'Instagram and Facebook posts' },
] as const

/** Split text into lines that fit a width (and at most `max` lines, adding … when cut). */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= width || !line) line = next
    else {
      lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  if (lines.length > max) {
    const kept = lines.slice(0, max)
    let last = kept[max - 1]
    while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1)
    kept[max - 1] = last.trimEnd() + '…'
    return kept
  }
  return lines
}

/** Largest font size (within limits) at which the text fits in `maxLines` lines. */
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, width: number, maxLines: number, hi: number, lo: number) {
  for (let px = hi; px >= lo; px -= 2) {
    ctx.font = font(px)
    const lines = wrapLines(ctx, text, width, 99)
    if (lines.length <= maxLines) return { px, lines }
  }
  ctx.font = font(lo)
  return { px: lo, lines: wrapLines(ctx, text, width, maxLines) }
}

export function drawSocial(ctx: CanvasRenderingContext2D, w: number, h: number, s: SocialSpec, logo?: CanvasImageSource & { width: number; height: number }) {
  const c = s.colors
  const u = Math.min(w, h) / 630 // scale unit
  const pad = 72 * u
  const hf = (px: number) => `700 ${px}px ${s.fonts.heading}`
  const bf = (px: number, weight = 400) => `${weight} ${px}px ${s.fonts.body}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const square = h / w > 0.9

  const drawLogo = (x: number, y: number, maxW: number, maxH: number, align: 'left' | 'center' = 'left') => {
    if (!logo || !logo.width) return 0
    const r = Math.min(maxW / logo.width, maxH / logo.height)
    const lw = logo.width * r
    ctx.drawImage(logo, align === 'center' ? x - lw / 2 : x, y, lw, logo.height * r)
    return logo.height * r
  }
  const textBlock = (x: number, y: number, width: number, colour: string, sub: string, align: 'left' | 'center', maxTitle: number) => {
    ctx.textAlign = align
    const t = fitText(ctx, s.title || ' ', hf, width, square ? 4 : 3, maxTitle * u, 40 * u)
    // shrink until title + subtitle end above the website line (bottom 20% of the image)
    ctx.font = bf(30 * u)
    const subLines = s.subtitle ? wrapLines(ctx, s.subtitle, width, 2).length : 0
    const bottom = h - pad * 0.75 - 76 * u
    const needed = (px: number, n: number) => n * px * 1.12 + (subLines ? px * 0.35 + 46 * u + (subLines - 1) * 40 * u : 0)
    while (t.px > 36 * u && y + needed(t.px, t.lines.length) > bottom) {
      t.px -= 2
      ctx.font = hf(t.px)
      t.lines = wrapLines(ctx, s.title || ' ', width, square ? 5 : 3)
    }
    ctx.fillStyle = colour
    ctx.font = hf(t.px)
    let yy = y
    t.lines.forEach((line) => {
      yy += t.px * 1.12
      ctx.fillText(line, x, yy)
    })
    if (s.subtitle) {
      ctx.font = bf(30 * u)
      ctx.fillStyle = sub
      wrapLines(ctx, s.subtitle, width, 2).forEach((line, i) => ctx.fillText(line, x, yy + t.px * 0.35 + 46 * u + i * 40 * u))
    }
    ctx.textAlign = 'left'
  }
  const siteLine = (x: number, y: number, colour: string, align: 'left' | 'center' | 'right' = 'left') => {
    if (!s.site) return
    ctx.textAlign = align
    ctx.font = bf(24 * u, 600)
    ctx.fillStyle = colour
    ctx.fillText(s.site, x, y)
    ctx.textAlign = 'left'
  }

  switch (s.template) {
    case 'split': {
      ctx.fillStyle = c.primary
      ctx.fillRect(0, 0, w, h)
      // decorative shapes on the right
      // shapes stay clear of the text column so the title keeps its contrast
      ctx.fillStyle = c.secondary
      ctx.beginPath()
      if (square) ctx.arc(w * 0.98, h * 0.02, 120 * u, 0, Math.PI * 2)
      else ctx.arc(w * 0.92, h * 0.18, 210 * u, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = c.accent
      ctx.beginPath()
      if (square) ctx.arc(w * 0.9, h * 1.02, 130 * u, 0, Math.PI * 2)
      else ctx.arc(w * 0.8, h * 0.95, 150 * u, 0, Math.PI * 2)
      ctx.fill()
      const lh = drawLogo(pad, pad, 260 * u, 70 * u)
      textBlock(pad, pad + (lh ? lh + 30 * u : 10 * u), w * (square ? 0.7 : 0.6), c.onPrimary, c.onPrimary, 'left', 76)
      siteLine(pad, h - pad * 0.75, c.onPrimary)
      break
    }
    case 'centered': {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, c.primary)
      g.addColorStop(1, c.secondary)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      const onG = contrastRatio('#ffffff', c.primary) >= contrastRatio('#111111', c.primary) ? '#ffffff' : '#111111'
      const lh = drawLogo(w / 2, pad, 300 * u, 80 * u, 'center')
      textBlock(w / 2, (lh ? pad + lh : 0) + h * (square ? 0.22 : 0.12), w - pad * 2.4, onG, onG, 'center', 80)
      siteLine(w / 2, h - pad * 0.75, onG, 'center')
      break
    }
    case 'card': {
      ctx.fillStyle = c.subtle
      ctx.fillRect(0, 0, w, h)
      const m = 44 * u
      ctx.fillStyle = c.bg
      ctx.beginPath()
      ctx.roundRect(m, m, w - m * 2, h - m * 2, Math.min(40, s.radius * 2) * u)
      ctx.fill()
      ctx.fillStyle = c.primary
      ctx.fillRect(m, m + 60 * u, 14 * u, 120 * u)
      const lh = drawLogo(m + pad, m + 50 * u, 240 * u, 64 * u)
      textBlock(m + pad, m + (lh ? 50 * u + lh + 24 * u : 40 * u), w - m * 2 - pad * 2, c.text, c.muted, 'left', 70)
      siteLine(m + pad, h - m - 48 * u, c.primary)
      break
    }
    case 'bold': {
      ctx.fillStyle = c.dark
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = c.accent
      ctx.fillRect(pad, h - pad - 10 * u, 160 * u, 10 * u)
      const lh = drawLogo(pad, pad, 240 * u, 64 * u)
      textBlock(pad, pad + (lh ? lh + 20 * u : 0), w - pad * 2, c.onDark, c.onDark, 'left', 92)
      siteLine(w - pad, h - pad, c.onDark, 'right')
      break
    }
  }
}
