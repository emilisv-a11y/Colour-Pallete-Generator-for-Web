import { differenceEuclidean, parse, type Color } from 'culori'
import { useEffect, useState } from 'react'

type Entry = { hex: string; name: string; color: Color }

let entries: Entry[] | null = null
let loading: Promise<Entry[]> | null = null
const cache = new Map<string, string>()
const dist = differenceEuclidean('oklab')

/** Lazy-load ~4,500 curated colour names (color-name-list "best of", MIT licence). */
export function loadNames(): Promise<Entry[]> {
  if (entries) return Promise.resolve(entries)
  if (!loading) {
    loading = import('color-name-list/bestof').then(({ colornames }) => {
      entries = colornames.map(({ hex, name }) => ({ hex: hex.toLowerCase(), name, color: parse(hex)! }))
      return entries
    })
  }
  return loading
}

/** Nearest named colours, closest first. */
export function nearestNames(hex: string, count = 1): { hex: string; name: string }[] {
  if (!entries) return []
  const target = parse(hex)
  if (!target) return []
  const scored = entries.map((e) => ({ e, d: dist(target, e.color) }))
  scored.sort((a, b) => a.d - b.d)
  return scored.slice(0, count).map(({ e }) => ({ hex: e.hex, name: e.name }))
}

export function colorName(hex: string): string {
  if (!entries) return ''
  const hit = cache.get(hex)
  if (hit) return hit
  const name = nearestNames(hex, 1)[0]?.name ?? ''
  cache.set(hex, name)
  return name
}

/** Hook returning a name lookup; re-renders once the names file has loaded. */
export function useColorNames() {
  const [ready, setReady] = useState(!!entries)
  useEffect(() => {
    if (!ready) loadNames().then(() => setReady(true))
  }, [ready])
  return { ready, name: colorName }
}

export function slugify(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
