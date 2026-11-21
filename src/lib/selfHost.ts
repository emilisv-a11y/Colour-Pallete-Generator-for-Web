/* ============================================================================
   Self-hosted Google Fonts
   Fetches the Google Fonts CSS (a modern browser receives WOFF2 links), keeps only
   the chosen weights/styles/language subsets, downloads the files from
   fonts.gstatic.com (CORS-enabled) and packs them with ready @font-face CSS.
   Serving fonts from your own domain means visitors' IPs are not sent to Google,
   which EU privacy rulings (e.g. LG München, 2022) consider personal data.
   ========================================================================== */

import { zipSync } from 'fflate'
import type { FontMeta } from './googleFonts'

export type FontRequest = { family: string; weights: number[]; italic: boolean; variable: boolean }
export type Face = { family: string; style: 'normal' | 'italic'; weightMin: number; weightMax: number; url: string; unicodeRange: string; subset: string }
export type FontFile = Face & { file: string; size?: number }

export const SUBSET_LABELS: Record<string, string> = {
  latin: 'Latin (basic)',
  'latin-ext': 'Latin Extended (ą, č, ė, ł, ő…)',
  cyrillic: 'Cyrillic',
  'cyrillic-ext': 'Cyrillic Extended',
  greek: 'Greek',
  'greek-ext': 'Greek Extended',
  vietnamese: 'Vietnamese',
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** css2 query for exactly the requested weights/styles (variable fonts as one range per style). */
export function requestParam(r: FontRequest): string {
  const name = r.family.replace(/ /g, '+')
  const ws = [...new Set(r.weights)].sort((a, b) => a - b)
  if (!ws.length) return `family=${name}`
  const range = r.variable && ws.length > 1 ? `${ws[0]}..${ws[ws.length - 1]}` : null
  if (!r.italic) return range ? `family=${name}:wght@${range}` : ws.length === 1 && ws[0] === 400 ? `family=${name}` : `family=${name}:wght@${ws.join(';')}`
  const tuples = range ? [`0,${range}`, `1,${range}`] : [...ws.map((w) => `0,${w}`), ...ws.map((w) => `1,${w}`)]
  return `family=${name}:ital,wght@${tuples.join(';')}`
}

export function cssUrl(reqs: FontRequest[]) {
  return `https://fonts.googleapis.com/css2?${reqs.map(requestParam).join('&')}&display=swap`
}

/** Parse Google's CSS: each @font-face is preceded by a comment naming its subset. */
export function parseFontCss(css: string): Face[] {
  const faces: Face[] = []
  const re = /\/\*\s*([a-z0-9-]+|\[\d+\])\s*\*\/\s*@font-face\s*\{([^}]*)\}/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) {
    const body = m[2]
    const get = (k: string) => body.match(new RegExp(`${k}:\\s*([^;]+);`))?.[1].trim() ?? ''
    const url = body.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1]
    if (!url) continue
    const w = get('font-weight').split(/\s+/).map(Number)
    faces.push({
      family: get('font-family').replace(/['"]/g, ''),
      style: get('font-style') === 'italic' ? 'italic' : 'normal',
      weightMin: w[0],
      weightMax: w[1] ?? w[0],
      url,
      unicodeRange: get('unicode-range'),
      subset: m[1],
    })
  }
  return faces
}

/** Keep chosen subsets and merge faces that share a file (variable fonts serve one file for several weights). */
export function planFiles(faces: Face[], subsets: string[]): FontFile[] {
  const byUrl = new Map<string, Face>()
  for (const f of faces) {
    if (!subsets.includes(f.subset)) continue
    const prev = byUrl.get(f.url)
    if (prev) {
      prev.weightMin = Math.min(prev.weightMin, f.weightMin)
      prev.weightMax = Math.max(prev.weightMax, f.weightMax)
    } else byUrl.set(f.url, { ...f })
  }
  return [...byUrl.values()].map((f) => {
    const w = f.weightMin === f.weightMax ? String(f.weightMin) : `${f.weightMin}-${f.weightMax}`
    return { ...f, file: `${slug(f.family)}-${w}${f.style === 'italic' ? '-italic' : ''}-${f.subset}.woff2` }
  })
}

export function fontFaceCss(files: FontFile[], dir = 'fonts/') {
  return files
    .map(
      (f) => `/* ${f.family} ${f.weightMin === f.weightMax ? f.weightMin : `${f.weightMin}–${f.weightMax}`} ${f.style} · ${f.subset} */
@font-face {
  font-family: '${f.family}';
  font-style: ${f.style};
  font-weight: ${f.weightMin === f.weightMax ? f.weightMin : `${f.weightMin} ${f.weightMax}`};
  font-display: swap;
  src: url('${dir}${f.file}') format('woff2');
  unicode-range: ${f.unicodeRange};
}`,
    )
    .join('\n\n')
}

/** The single most important file to preload: body family, regular, latin. */
export function preloadFile(files: FontFile[], bodyFamily: string) {
  const cands = files.filter((f) => f.family === bodyFamily && f.style === 'normal' && f.subset === 'latin')
  return cands.find((f) => f.weightMin <= 400 && f.weightMax >= 400) ?? cands[0] ?? files[0]
}

export async function fetchPlan(reqs: FontRequest[], subsets: string[]): Promise<FontFile[]> {
  const res = await fetch(cssUrl(reqs))
  if (!res.ok) throw new Error(`Google Fonts returned ${res.status}`)
  return planFiles(parseFontCss(await res.text()), subsets)
}

/** File sizes from HEAD requests (Content-Length is readable cross-origin). */
export async function fetchSizes(files: FontFile[]): Promise<FontFile[]> {
  return Promise.all(
    files.map(async (f) => {
      try {
        const r = await fetch(f.url, { method: 'HEAD' })
        const n = Number(r.headers.get('content-length'))
        return { ...f, size: Number.isFinite(n) && n > 0 ? n : undefined }
      } catch {
        return f
      }
    }),
  )
}

export function readme(files: FontFile[], families: string[], body: string, dir = 'fonts/') {
  const pre = preloadFile(files, body)
  return `Self-hosted fonts · generated by D5 WebTool
================================================

Families: ${families.join(', ')}
Files: ${files.length} WOFF2 files in /${dir}

WHY
Loading fonts from Google's servers sends each visitor's IP address to Google.
Serving them from your own site avoids that and is usually faster.

INSTALL ON A DIVI / WORDPRESS SITE
1. Upload the "${dir.replace(/\/$/, '')}" folder to your child theme, e.g.
   /wp-content/themes/your-child-theme/${dir}
2. Paste the contents of fonts.css at the top of the child theme's style.css
   (the paths are relative, so they work from the child theme folder).
   If you paste the CSS somewhere else (e.g. Theme Options > Custom CSS), change
   url('${dir}...') to the full address, e.g.
   url('/wp-content/themes/your-child-theme/${dir}...').
3. Stop Divi loading the same fonts from Google: in Divi's Theme Options, turn
   off Google Fonts loading (option names vary slightly between versions), and
   keep using the same font names in Divi's typography settings.
4. Optional, for faster first paint, add to the site <head>:
   <link rel="preload" href="/wp-content/themes/your-child-theme/${dir}${pre?.file ?? ''}" as="font" type="font/woff2" crossorigin>
5. Check in the browser's developer tools (Network tab) that no requests go to
   fonts.googleapis.com or fonts.gstatic.com.

LICENCE
Google Fonts are released under the SIL Open Font License or Apache License 2.0,
which allow self-hosting. Licence details for each family:
${families.map((f) => `  https://fonts.google.com/specimen/${f.replace(/ /g, '+')}/license`).join('\n')}
`
}

/** Download every file and pack fonts.css, README.txt and the WOFF2 files into a ZIP. */
export async function buildFontZip(files: FontFile[], families: string[], body: string, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {}
  let done = 0
  await Promise.all(
    files.map(async (f) => {
      const r = await fetch(f.url)
      if (!r.ok) throw new Error(`Could not download ${f.file} (${r.status})`)
      entries[`fonts/${f.file}`] = new Uint8Array(await r.arrayBuffer())
      onProgress?.(++done, files.length)
    }),
  )
  const enc = new TextEncoder()
  entries['fonts.css'] = enc.encode(`/* Self-hosted fonts · generated by D5 WebTool */\n\n${fontFaceCss(files)}\n`)
  entries['README.txt'] = enc.encode(readme(files, families, body))
  // WOFF2 is already compressed: store files as-is (level 0) for speed
  const zip = zipSync(entries, { level: 0 })
  return new Blob([zip as BlobPart], { type: 'application/zip' })
}

/** Default weights to self-host for a role: what the design actually uses, limited to what exists. */
export function defaultWeights(meta: FontMeta | undefined, role: 'heading' | 'body'): number[] {
  const avail = meta?.weights ?? [400, 700]
  const want = role === 'heading' ? [700] : [400, 700]
  const pick = want.map((w) => avail.reduce((best, a) => (Math.abs(a - w) < Math.abs(best - w) ? a : best), avail[0]))
  return [...new Set(pick)].sort((a, b) => a - b)
}

export const formatBytes = (n?: number) => (n === undefined ? '…' : n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`)
