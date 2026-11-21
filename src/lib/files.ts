import { cmykValues, formatColor, readableOn, rgbValues } from './color'
import { colorName } from './names'

/* ---------- Adobe Swatch Exchange (.ase) ---------- */

/** Build an ASE file (works in Photoshop, Illustrator, InDesign, Affinity). */
export function paletteAse(hexes: string[], groupName = 'D5 WebTool'): Blob {
  const chunks: number[] = []
  const u16 = (n: number) => chunks.push((n >> 8) & 255, n & 255)
  const u32 = (n: number) => chunks.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255)
  const f32 = (n: number) => {
    const b = new Uint8Array(new Float32Array([n]).buffer).reverse() // big-endian
    chunks.push(...b)
  }
  const utf16 = (s: string) => {
    const out: number[] = []
    const str = s + '\0'
    out.push((str.length >> 8) & 255, str.length & 255)
    for (const ch of str) {
      const c = ch.charCodeAt(0)
      out.push((c >> 8) & 255, c & 255)
    }
    return out
  }

  chunks.push(0x41, 0x53, 0x45, 0x46) // 'ASEF'
  u16(1)
  u16(0)
  u32(hexes.length + 2) // group start + colours + group end

  const group = utf16(groupName)
  u16(0xc001)
  u32(group.length)
  chunks.push(...group)

  hexes.forEach((hex, i) => {
    const name = utf16(colorName(hex) || `Color ${i + 1}`)
    const { r, g, b } = rgbValues(hex)
    const len = name.length + 4 + 12 + 2
    u16(0x0001)
    u32(len)
    chunks.push(...name)
    chunks.push(0x52, 0x47, 0x42, 0x20) // 'RGB '
    f32(r / 255)
    f32(g / 255)
    f32(b / 255)
    u16(2) // normal (process) colour
  })

  u16(0xc002)
  u32(0)
  return new Blob([new Uint8Array(chunks)], { type: 'application/octet-stream' })
}

/* ---------- PDF (hand-built, no dependencies) ---------- */

function pdfText(s: string) {
  // Standard Helvetica uses WinAnsi; replace anything outside Latin-1 and escape PDF specials.
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d\u201e]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    // letters outside Latin-1 (e.g. Lithuanian ą, č, ė) lose their accent rather than becoming "?"
    .replace(/[^\x20-\xff]/g, (ch) => ch.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\xff]/g, '') || '?').replace(/([\\()])/g, '\\$1')
}

/** A landscape A4 PDF: big swatches plus a table of values for each colour. */
export function palettePdf(hexes: string[], title = 'D5 WebTool palette'): Blob {
  const W = 842,
    H = 595,
    M = 40
  const ops: string[] = []
  const rgb = (hex: string) => {
    const { r, g, b } = rgbValues(hex)
    return `${(r / 255).toFixed(4)} ${(g / 255).toFixed(4)} ${(b / 255).toFixed(4)}`
  }
  const text = (x: number, y: number, size: number, s: string, font = 'F1', color = '0.086 0.094 0.114') =>
    ops.push(`${color} rg BT /${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfText(s)}) Tj ET`)

  text(M, H - M - 6, 20, title, 'F2')
  text(M, H - M - 26, 10, `${hexes.length} colours  ·  ${new Date().toLocaleDateString()}`, 'F1', '0.4 0.42 0.47')

  const top = H - M - 50
  const gap = 8
  const colW = (W - 2 * M - gap * (hexes.length - 1)) / hexes.length
  const swH = 260
  hexes.forEach((hex, i) => {
    const x = M + i * (colW + gap)
    ops.push(`${rgb(hex)} rg ${x.toFixed(1)} ${(top - swH).toFixed(1)} ${colW.toFixed(1)} ${swH} re f`)
    const fg = readableOn(hex) === '#000000' ? '0 0 0' : '1 1 1'
    const size = colW > 110 ? 14 : 10
    text(x + 8, top - swH + 12, size, hex.toUpperCase(), 'F2', fg)

    let y = top - swH - 22
    const name = colorName(hex)
    const maxChars = Math.floor(colW / 5.2)
    text(x, y, 10, name.length > maxChars ? name.slice(0, maxChars - 1) + '.' : name, 'F2')
    const cmyk = cmykValues(hex)
    const rows: [string, string][] = [
      ['HEX', hex.toUpperCase()],
      ['RGB', Object.values(rgbValues(hex)).join(', ')],
      ['CMYK', `${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`],
      ['HSL', formatColor(hex, 'hsl').replace(/^hsl\(|\)$/g, '')],
      ['OKLCH', formatColor(hex, 'oklch').replace(/^oklch\(|\)$/g, '')],
    ]
    rows.forEach(([k, v]) => {
      y -= 30
      text(x, y + 10, 7, k, 'F2', '0.45 0.47 0.52')
      text(x, y, colW > 110 ? 9 : 7, v)
    })
  })
  text(M, M - 12, 8, 'Made with D5 WebTool', 'F1', '0.55 0.57 0.62')

  const content = ops.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${latin1Length(content)} >>\nstream\n${content}\nendstream`,
  ]
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((o, i) => {
    offsets.push(latin1Length(out))
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = latin1Length(out)
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`

  const bytes = new Uint8Array(out.length)
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255
  return new Blob([bytes], { type: 'application/pdf' })
}

const latin1Length = (s: string) => s.length
