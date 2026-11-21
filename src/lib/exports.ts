import { formatColor, rgbValues } from './color'
import { colorName, slugify } from './names'

export type CodeFormat = 'css' | 'scss' | 'less' | 'tailwind4' | 'tailwind3' | 'json' | 'js' | 'xml' | 'gpl'

export const CODE_FORMATS: { id: CodeFormat; label: string; ext: string }[] = [
  { id: 'css', label: 'CSS variables', ext: 'css' },
  { id: 'scss', label: 'SCSS', ext: 'scss' },
  { id: 'less', label: 'LESS', ext: 'less' },
  { id: 'tailwind4', label: 'Tailwind v4 (@theme)', ext: 'css' },
  { id: 'tailwind3', label: 'Tailwind v3 config', ext: 'js' },
  { id: 'json', label: 'JSON', ext: 'json' },
  { id: 'js', label: 'JS array', ext: 'js' },
  { id: 'xml', label: 'XML', ext: 'xml' },
  { id: 'gpl', label: 'GIMP / Inkscape (.gpl)', ext: 'gpl' },
]

export type Naming = 'names' | 'numbered'

/** Variable-friendly names for a palette, deduplicated. */
export function paletteKeys(hexes: string[], naming: Naming): string[] {
  const used = new Map<string, number>()
  return hexes.map((hex, i) => {
    let base = naming === 'names' ? slugify(colorName(hex)) : ''
    if (!base) base = `color-${i + 1}`
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    return n ? `${base}-${n + 1}` : base
  })
}

export function exportCode(hexes: string[], format: CodeFormat, naming: Naming): string {
  const keys = paletteKeys(hexes, naming)
  const pairs = hexes.map((h, i) => [keys[i], h] as const)
  const url = shareUrl(hexes)
  switch (format) {
    case 'css':
      return `/* D5 WebTool palette: ${url} */\n:root {\n${pairs.map(([k, h]) => `  --${k}: ${h};`).join('\n')}\n}\n`
    case 'scss':
      return `// D5 WebTool palette: ${url}\n${pairs.map(([k, h]) => `$${k}: ${h};`).join('\n')}\n\n$palette: (\n${pairs
        .map(([k, h]) => `  "${k}": ${h},`)
        .join('\n')}\n);\n`
    case 'less':
      return `// D5 WebTool palette: ${url}\n${pairs.map(([k, h]) => `@${k}: ${h};`).join('\n')}\n`
    case 'tailwind4':
      return `/* D5 WebTool palette: ${url} */\n@import "tailwindcss";\n\n@theme {\n${pairs
        .map(([k, h]) => `  --color-${k.replace(/^color-/, '')}: ${h};`)
        .join('\n')}\n}\n`
    case 'tailwind3':
      return `// D5 WebTool palette: ${url}\n/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${pairs
        .map(([k, h]) => `        '${k}': '${h}',`)
        .join('\n')}\n      },\n    },\n  },\n}\n`
    case 'json':
      return (
        JSON.stringify(
          Object.fromEntries(
            pairs.map(([k, h]) => [
              k,
              { hex: h, name: colorName(h) || undefined, rgb: formatColor(h, 'rgb'), hsl: formatColor(h, 'hsl'), oklch: formatColor(h, 'oklch') },
            ]),
          ),
          null,
          2,
        ) + '\n'
      )
    case 'js':
      return `// D5 WebTool palette: ${url}\nexport const palette = [${hexes.map((h) => `'${h}'`).join(', ')}]\n`
    case 'xml':
      return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- D5 WebTool palette: ${url} -->\n<palette>\n${pairs
        .map(([k, h]) => {
          const { r, g, b } = rgbValues(h)
          return `  <color name="${escapeXml(colorName(h) || k)}" hex="${h.slice(1)}" r="${r}" g="${g}" b="${b}" />`
        })
        .join('\n')}\n</palette>\n`
    case 'gpl':
      return `GIMP Palette\nName: D5 WebTool palette\nColumns: ${hexes.length}\n#\n${pairs
        .map(([k, h]) => {
          const { r, g, b } = rgbValues(h)
          return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${colorName(h) || k}`
        })
        .join('\n')}\n`
  }
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!)
}

/* ---------- URL ---------- */

export function paletteSlug(hexes: string[]) {
  return hexes.map((h) => h.slice(1)).join('-')
}

export function shareUrl(hexes: string[]) {
  const base = typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''
  return `${base}#/generate/${paletteSlug(hexes)}`
}

/* ---------- Images ---------- */

export function paletteSvg(hexes: string[], opts: { width?: number; height?: number; labels?: boolean } = {}) {
  const width = opts.width ?? 1200
  const height = opts.height ?? 600
  const labels = opts.labels ?? true
  const w = width / hexes.length
  const swatchH = labels ? height - 110 : height
  const body = hexes
    .map((h, i) => {
      const x = (i * w).toFixed(2)
      const rect = `<rect x="${x}" y="0" width="${(w + 0.5).toFixed(2)}" height="${swatchH}" fill="${h}"/>`
      if (!labels) return rect
      const cx = (i * w + w / 2).toFixed(2)
      return `${rect}<text x="${cx}" y="${swatchH + 46}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#14161c">${h
        .slice(1)
        .toUpperCase()}</text><text x="${cx}" y="${swatchH + 78}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#6b7080">${escapeXml(
        colorName(h),
      )}</text>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`
}

export async function palettePngBlob(hexes: string[], scale = 2): Promise<Blob> {
  const width = 1200,
    height = 600
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  const w = width / hexes.length
  const swatchH = height - 110
  hexes.forEach((h, i) => {
    ctx.fillStyle = h
    ctx.fillRect(Math.floor(i * w), 0, Math.ceil(w) + 1, swatchH)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#14161c'
    ctx.font = '700 22px Helvetica, Arial, sans-serif'
    ctx.fillText(h.slice(1).toUpperCase(), i * w + w / 2, swatchH + 46)
    ctx.fillStyle = '#6b7080'
    ctx.font = '15px Helvetica, Arial, sans-serif'
    ctx.fillText(colorName(h), i * w + w / 2, swatchH + 78, w - 16)
  })
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'))
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(text: string, filename: string, type = 'text/plain') {
  downloadBlob(new Blob([text], { type }), filename)
}
