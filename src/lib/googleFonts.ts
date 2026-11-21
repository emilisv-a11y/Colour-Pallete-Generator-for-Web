/* ============================================================================
   Google Fonts library
   - Built-in catalogue of every Google Fonts family (src/data/google-fonts.json,
     rebuilt with `npm run fonts:update`), loaded on demand.
   - Optional live refresh from the official Google Fonts Developer API with the
     user's own API key (kept only in this browser), which also adds Google's
     real popularity order.
   - Fonts are loaded straight from fonts.googleapis.com.
   ========================================================================== */

export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace'
export type GFont = {
  family: string
  category: FontCategory
  weights: number[]
  italic: boolean
  variable: boolean
  subsets: string[]
  modified: string // YYYY-MM-DD
  /** lower = more popular; Infinity when unknown */
  rank: number
}
export type FontMeta = Pick<GFont, 'category' | 'weights' | 'italic' | 'variable'>

export const CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: 'sans-serif', label: 'Sans serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'monospace', label: 'Monospace' },
]

const CAT_CODES: Record<string, FontCategory> = { s: 'sans-serif', r: 'serif', d: 'display', h: 'handwriting', m: 'monospace' }

/** Widely used families, shown first when Google's own popularity order isn't available. */
export const POPULAR = [
  'Roboto', 'Open Sans', 'Inter', 'Montserrat', 'Lato', 'Poppins', 'Noto Sans', 'Roboto Condensed', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
  'Merriweather', 'Rubik', 'Work Sans', 'Lora', 'DM Sans', 'Mulish', 'Barlow', 'Fira Sans', 'Quicksand', 'Manrope', 'Outfit', 'Source Sans 3', 'PT Sans',
  'Kanit', 'Plus Jakarta Sans', 'Libre Baskerville', 'Josefin Sans', 'Bebas Neue', 'Space Grotesk', 'Archivo', 'IBM Plex Sans', 'Karla', 'Figtree',
  'Lexend', 'Sora', 'Urbanist', 'Jost', 'Red Hat Display', 'Libre Franklin', 'Cabin', 'Heebo', 'Titillium Web', 'Noto Serif', 'EB Garamond',
  'Cormorant Garamond', 'Crimson Text', 'Source Serif 4', 'Fraunces', 'Bitter', 'Arvo', 'DM Serif Display', 'Abril Fatface', 'Anton', 'Dancing Script',
  'Pacifico', 'Caveat', 'Lobster', 'JetBrains Mono', 'Fira Code', 'Space Mono', 'Inconsolata', 'IBM Plex Mono',
]

/** Hand-picked heading/body pairings. */
export const PAIRINGS: { heading: string; body: string; note: string }[] = [
  { heading: 'Playfair Display', body: 'Source Sans 3', note: 'Classic editorial' },
  { heading: 'Montserrat', body: 'Merriweather', note: 'Modern headline, readable serif body' },
  { heading: 'Space Grotesk', body: 'Inter', note: 'Tech / startup' },
  { heading: 'Fraunces', body: 'Work Sans', note: 'Warm and characterful' },
  { heading: 'DM Serif Display', body: 'DM Sans', note: 'Matching superfamily' },
  { heading: 'Poppins', body: 'Lora', note: 'Friendly geometric + bookish' },
  { heading: 'Oswald', body: 'Roboto', note: 'Bold, condensed impact' },
  { heading: 'Cormorant Garamond', body: 'Mulish', note: 'Luxury / wedding' },
  { heading: 'Outfit', body: 'Outfit', note: 'Single clean family' },
  { heading: 'Sora', body: 'Figtree', note: 'Crisp product UI' },
  { heading: 'Bebas Neue', body: 'Open Sans', note: 'Posters and sports' },
  { heading: 'Libre Baskerville', body: 'Lato', note: 'Trustworthy, professional' },
]

const KEY_STORE = 'd5wt:gfKey'
const LIVE_STORE = 'd5wt:gfLive'

let library: GFont[] | null = null
let byFamily = new Map<string, GFont>()
let loading: Promise<GFont[]> | null = null
export let libraryInfo = { source: '', built: '', live: false }

function index(fonts: GFont[]) {
  library = fonts
  byFamily = new Map(fonts.map((f) => [f.family, f]))
  return fonts
}

function popularityRank(family: string) {
  const i = POPULAR.indexOf(family)
  return i === -1 ? Infinity : i
}

/** Load the catalogue: a live list fetched with an API key wins over the built-in one. */
export function loadLibrary(): Promise<GFont[]> {
  if (library) return Promise.resolve(library)
  if (!loading) {
    loading = (async () => {
      try {
        const live = localStorage.getItem(LIVE_STORE)
        if (live) {
          const parsed = JSON.parse(live) as { fetched: string; fonts: GFont[] }
          libraryInfo = { source: 'Google Fonts Developer API', built: parsed.fetched, live: true }
          return index(parsed.fonts.map((f) => ({ ...f, rank: f.rank ?? Infinity })))
        }
      } catch {
        /* fall back to the built-in list */
      }
      const mod = await import('../data/google-fonts.json')
      const data = (mod.default ?? mod) as { source: string; built: string; fonts: [string, string, string, number, number, string, string][] }
      libraryInfo = { source: data.source, built: data.built, live: false }
      return index(
        data.fonts.map(([family, c, w, it, v, subsets, mod]) => ({
          family,
          category: CAT_CODES[c],
          weights: [...w].map((d) => Number(d) * 100),
          italic: !!it,
          variable: !!v,
          subsets: subsets ? subsets.split(',') : [],
          modified: mod ? `${mod.slice(0, 4)}-${mod.slice(4, 6)}-${mod.slice(6, 8)}` : '',
          rank: popularityRank(family),
        })),
      )
    })()
  }
  return loading
}

export const getFont = (family: string) => byFamily.get(family)
export const isLibraryLoaded = () => !!library

/* ---------- Google Fonts Developer API (optional) ---------- */

export const getApiKey = () => {
  try {
    return localStorage.getItem(KEY_STORE) ?? ''
  } catch {
    return ''
  }
}
export const setApiKey = (k: string) => {
  try {
    if (k) localStorage.setItem(KEY_STORE, k)
    else localStorage.removeItem(KEY_STORE)
  } catch {
    /* ignore */
  }
}

type ApiItem = { family: string; category: string; variants: string[]; subsets: string[]; lastModified?: string; axes?: unknown[] }

/** Fetch the current list from Google (sorted by popularity) and keep it in this browser. */
export async function refreshFromGoogle(key: string): Promise<number> {
  const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${encodeURIComponent(key)}&sort=popularity&capability=VF`
  const res = await fetch(url)
  if (!res.ok) {
    let msg = `Google returned ${res.status}`
    try {
      const j = await res.json()
      if (j?.error?.message) msg = j.error.message
    } catch {
      /* keep status text */
    }
    throw new Error(msg)
  }
  const json = (await res.json()) as { items: ApiItem[] }
  const fonts: GFont[] = json.items
    .filter((f) => CATEGORIES.some((c) => c.id === f.category))
    .map((f, i) => ({
      family: f.family,
      category: f.category as FontCategory,
      weights: [...new Set(f.variants.map((v) => (v === 'regular' || v === 'italic' ? 400 : parseInt(v, 10))).filter(Boolean))].sort((a, b) => a - b),
      italic: f.variants.some((v) => v.includes('italic')),
      variable: !!f.axes?.length,
      subsets: f.subsets,
      modified: f.lastModified ?? '',
      rank: i,
    }))
  const fetched = new Date().toISOString().slice(0, 10)
  try {
    localStorage.setItem(LIVE_STORE, JSON.stringify({ fetched, fonts }))
  } catch {
    /* storage full: still use it for this visit */
  }
  libraryInfo = { source: 'Google Fonts Developer API', built: fetched, live: true }
  index(fonts)
  return fonts.length
}

export function forgetLiveList() {
  try {
    localStorage.removeItem(LIVE_STORE)
  } catch {
    /* ignore */
  }
  library = null
  loading = null
}

/* ---------- URLs ---------- */

/** Weights worth requesting: the font's real weights within 300–800 (requesting a missing weight breaks the whole request). */
export function usefulWeights(meta: Pick<FontMeta, 'weights'>) {
  const ws = meta.weights.filter((w) => w >= 300 && w <= 800)
  return ws.length ? ws : meta.weights.slice(0, 3)
}

export function familyParam(family: string, meta?: Pick<FontMeta, 'weights' | 'variable'>) {
  const name = family.replace(/ /g, '+')
  if (!meta || meta.weights.length <= 1) return `family=${name}`
  if (meta.variable) {
    const lo = Math.max(300, Math.min(...meta.weights))
    const hi = Math.min(800, Math.max(...meta.weights))
    if (lo < hi) return `family=${name}:wght@${lo}..${hi}`
  }
  return `family=${name}:wght@${usefulWeights(meta).join(';')}`
}

/** Tiny request containing only the glyphs needed to preview `text` (fast for browsing hundreds of fonts). */
export function previewUrl(family: string, text: string) {
  return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}&text=${encodeURIComponent([...new Set(text)].join(''))}&display=swap`
}

/** Private font-family name used for previews, so glyph-subset previews never shadow the real font. */
export const previewFamily = (family: string) => `d5p-${family}`

const previewCache = new Map<string, Promise<void>>()
/**
 * Load a preview of `family` containing only the glyphs in `text`, registered under previewFamily(family).
 * Google's CSS allows cross-origin reads, so the face can be renamed before it is added to the page.
 */
export function loadPreviewFont(family: string, text: string): Promise<void> {
  const url = previewUrl(family, text)
  if (!previewCache.has(url)) {
    previewCache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.text() : ''))
        .then((css) => {
          if (!css) return
          const style = document.createElement('style')
          style.dataset.preview = family
          style.textContent = css.replace(/font-family:\s*'[^']+'/g, `font-family: '${previewFamily(family)}'`)
          document.head.appendChild(style)
        })
        .catch(() => {}),
    )
  }
  return previewCache.get(url)!
}

const loadedLinks = new Set<string>()
export function injectStylesheet(href: string) {
  if (loadedLinks.has(href)) return
  loadedLinks.add(href)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}
