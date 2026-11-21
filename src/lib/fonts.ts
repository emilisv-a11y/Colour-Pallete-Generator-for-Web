import { familyParam, getFont, injectStylesheet, type FontMeta } from './googleFonts'

/* Original curated list: still used as a fallback for weights/categories before the full
   Google Fonts library has loaded, so URLs are always valid. */
export const FONTS: { family: string; category: 'sans' | 'serif' | 'display'; weights: string }[] = [
  { family: 'Manrope', category: 'sans', weights: '400;600;800' },
  { family: 'Inter', category: 'sans', weights: '400;600;800' },
  { family: 'DM Sans', category: 'sans', weights: '400;600;800' },
  { family: 'Work Sans', category: 'sans', weights: '400;600;800' },
  { family: 'Poppins', category: 'sans', weights: '400;600;800' },
  { family: 'Montserrat', category: 'sans', weights: '400;600;800' },
  { family: 'Open Sans', category: 'sans', weights: '400;600;800' },
  { family: 'Lato', category: 'sans', weights: '400;700;900' },
  { family: 'Nunito', category: 'sans', weights: '400;600;800' },
  { family: 'Outfit', category: 'sans', weights: '400;600;800' },
  { family: 'Space Grotesk', category: 'display', weights: '400;600;700' },
  { family: 'Raleway', category: 'sans', weights: '400;600;800' },
  { family: 'Playfair Display', category: 'serif', weights: '400;600;800' },
  { family: 'Fraunces', category: 'serif', weights: '400;600;800' },
  { family: 'Lora', category: 'serif', weights: '400;600;700' },
  { family: 'Merriweather', category: 'serif', weights: '400;700;900' },
  { family: 'Source Serif 4', category: 'serif', weights: '400;600;800' },
  { family: 'Libre Baskerville', category: 'serif', weights: '400;700' },
]

export type MetaMap = Record<string, FontMeta> | undefined

/** Best known metadata for a family: saved with the design system → full library → curated list. */
export function metaFor(family: string, saved?: MetaMap): FontMeta | undefined {
  if (saved?.[family]) return saved[family]
  const g = getFont(family)
  if (g) return g
  const c = FONTS.find((f) => f.family === family)
  if (c) return { category: c.category === 'serif' ? 'serif' : 'sans-serif', weights: c.weights.split(';').map(Number), italic: false, variable: false }
  return undefined
}

const FALLBACKS: Record<string, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  monospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  handwriting: 'cursive',
  display: 'system-ui, sans-serif',
  'sans-serif': 'system-ui, -apple-system, sans-serif',
}

export const fontStack = (family: string, saved?: MetaMap) => `'${family}', ${FALLBACKS[metaFor(family, saved)?.category ?? 'sans-serif']}`

export function googleFontsUrl(families: string[], saved?: MetaMap) {
  const q = [...new Set(families)].map((f) => familyParam(f, metaFor(f, saved))).join('&')
  return `https://fonts.googleapis.com/css2?${q}&display=swap`
}

/** Load fonts into the page on demand. */
export function loadFonts(families: string[], saved?: MetaMap) {
  injectStylesheet(googleFontsUrl(families, saved))
}
