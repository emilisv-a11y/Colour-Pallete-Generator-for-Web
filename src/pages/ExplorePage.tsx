import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useCopy, useToast } from '../components/ui'
import { CURATED, type CuratedPalette } from '../data/palettes'
import { hexToOklch, readableOn } from '../lib/color'
import { paletteSlug } from '../lib/exports'
import { getPalettes, savePalette, useStorageVersion } from '../lib/storage'

export const FAMILIES = [
  { id: 'red', label: 'Red', hex: '#e5383b' },
  { id: 'orange', label: 'Orange', hex: '#f77f00' },
  { id: 'yellow', label: 'Yellow', hex: '#ffd60a' },
  { id: 'green', label: 'Green', hex: '#38b000' },
  { id: 'teal', label: 'Teal', hex: '#0fa3a3' },
  { id: 'blue', label: 'Blue', hex: '#1e6bd6' },
  { id: 'purple', label: 'Purple', hex: '#7b2cbf' },
  { id: 'pink', label: 'Pink', hex: '#f15bb5' },
  { id: 'brown', label: 'Brown', hex: '#7f4f24' },
  { id: 'neutral', label: 'Neutral', hex: '#9a9a9a' },
] as const

/** Colour family of a single colour, from OKLCH hue/chroma/lightness. */
export function familyOf(hex: string): string {
  const { l, c, h } = hexToOklch(hex)
  if (c < 0.035) return 'neutral'
  if ((h >= 20 && h < 85) && l < 0.55 && c < 0.13) return 'brown'
  if (h >= 345 || h < 15) return 'pink'
  if (h < 45) return 'red'
  if (h < 80) return 'orange'
  if (h < 115) return 'yellow'
  if (h < 165) return 'green'
  if (h < 215) return 'teal'
  if (h < 275) return 'blue'
  if (h < 320) return 'purple'
  return 'pink'
}

type Enriched = CuratedPalette & { families: Set<string>; derived: string[]; search: string }

function enrich(p: CuratedPalette): Enriched {
  const o = p.colors.map(hexToOklch)
  const avgL = o.reduce((a, x) => a + x.l, 0) / o.length
  const avgC = o.reduce((a, x) => a + x.c, 0) / o.length
  const warm = o.filter((x) => x.c > 0.04 && (x.h < 110 || x.h > 330)).length
  const cool = o.filter((x) => x.c > 0.04 && x.h >= 150 && x.h <= 300).length
  const derived: string[] = []
  if (warm > cool) derived.push('warm')
  else if (cool > warm) derived.push('cool')
  if (avgL > 0.82 && avgC < 0.11) derived.push('pastel')
  if (avgL < 0.42) derived.push('dark')
  if (avgC > 0.14) derived.push('vibrant')
  if (avgC < 0.05) derived.push('muted')
  const families = new Set(p.colors.map(familyOf))
  return { ...p, families, derived, search: `${p.name} ${p.tags.join(' ')} ${derived.join(' ')} ${[...families].join(' ')} ${p.colors.join(' ')}`.toLowerCase() }
}

const ALL = CURATED.map(enrich)
const STYLE_TAGS = (() => {
  const counts = new Map<string, number>()
  ALL.forEach((p) => [...p.tags, ...p.derived].forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
  return [...counts.entries()]
    .filter(([, n]) => n >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
})()

const PAGE = 48

function PaletteCard({ p, saved }: { p: Enriched; saved: boolean }) {
  const copy = useCopy()
  const toast = useToast()
  return (
    <article className="palette-card explore-card">
      <div className="palette-card-swatches">
        {p.colors.map((h, i) => (
          <button key={i} style={{ background: h, color: readableOn(h) }} onClick={() => copy(h.toUpperCase())} title={`Copy ${h.toUpperCase()}`}>
            <span>{h.slice(1).toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="palette-card-body">
        <div className="grow">
          <strong>{p.name}</strong>
          <div className="muted small">
            {p.colors.length} colours · {p.tags.join(', ')}
          </div>
        </div>
        <button
          className={`icon-btn ${saved ? 'on' : ''}`}
          title={saved ? 'Saved in Library' : 'Save to Library'}
          aria-label={saved ? 'Saved in Library' : 'Save to Library'}
          disabled={saved}
          onClick={() => {
            savePalette({ name: p.name, project: 'Explore', colors: p.colors })
            toast(`Saved “${p.name}”`)
          }}
        >
          <Icon name={saved ? 'check' : 'save'} size={16} />
        </button>
        <Link className="icon-btn" to={`/generate/${paletteSlug(p.colors)}`} title="Open in generator" aria-label={`Open ${p.name} in generator`}>
          <Icon name="external" size={16} />
        </Link>
      </div>
    </article>
  )
}

export default function ExplorePage() {
  useStorageVersion()
  const [q, setQ] = useState('')
  const [families, setFamilies] = useState<string[]>([])
  const [style, setStyle] = useState<string>('')
  const [count, setCount] = useState<string>('')
  const [sort, setSort] = useState<'curated' | 'light' | 'dark' | 'random'>('curated')
  const [shown, setShown] = useState(PAGE)
  const [seed, setSeed] = useState(0)
  const savedSlugs = new Set(getPalettes().map((p) => paletteSlug(p.colors)))

  const list = useMemo(() => {
    let r = ALL.filter(
      (p) =>
        (!q || q.toLowerCase().split(/\s+/).every((w) => p.search.includes(w.replace(/^#/, '')))) &&
        families.every((f) => p.families.has(f)) &&
        (!style || p.tags.includes(style) || p.derived.includes(style)) &&
        (!count || (count === '7' ? p.colors.length >= 7 : p.colors.length === Number(count))),
    )
    const avgL = (p: Enriched) => p.colors.reduce((a, h) => a + hexToOklch(h).l, 0) / p.colors.length
    if (sort === 'light') r = [...r].sort((a, b) => avgL(b) - avgL(a))
    if (sort === 'dark') r = [...r].sort((a, b) => avgL(a) - avgL(b))
    if (sort === 'random') {
      r = [...r]
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[r[i], r[j]] = [r[j], r[i]]
      }
    }
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, families, style, count, sort, seed])

  const reset = () => {
    setQ('')
    setFamilies([])
    setStyle('')
    setCount('')
    setShown(PAGE)
  }

  return (
    <div className="page explore-page">
      <header className="page-head">
        <h1>Explore palettes</h1>
        <p className="muted">{ALL.length} hand-picked palettes. Filter by colour, style or size, click a swatch to copy it, or open a palette in the generator to make it your own.</p>
      </header>

      <div className="explore-filters">
        <label className="color-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => (setQ(e.target.value), setShown(PAGE))} placeholder="Search: ocean, earthy, wedding, #2a9d8f…" aria-label="Search palettes" />
        </label>
        <div className="family-chips" role="group" aria-label="Colour families">
          {FAMILIES.map((f) => {
            const on = families.includes(f.id)
            return (
              <button
                key={f.id}
                className={`family-chip ${on ? 'on' : ''}`}
                aria-pressed={on}
                onClick={() => {
                  setFamilies((fs) => (on ? fs.filter((x) => x !== f.id) : [...fs, f.id]))
                  setShown(PAGE)
                }}
              >
                <span className="chip" style={{ background: f.hex }} /> {f.label}
              </button>
            )
          })}
        </div>
        <div className="row wrap">
          <select value={style} onChange={(e) => (setStyle(e.target.value), setShown(PAGE))} aria-label="Style">
            <option value="">All styles</option>
            {STYLE_TAGS.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <select value={count} onChange={(e) => (setCount(e.target.value), setShown(PAGE))} aria-label="Number of colours">
            <option value="">Any number of colours</option>
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} colours
              </option>
            ))}
            <option value="7">7+ colours</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
            <option value="curated">Curated order</option>
            <option value="light">Lightest first</option>
            <option value="dark">Darkest first</option>
            <option value="random">Shuffle</option>
          </select>
          {sort === 'random' && (
            <button className="btn" onClick={() => setSeed((s) => s + 1)}>
              Shuffle again
            </button>
          )}
          <span className="muted small grow">{list.length} palettes</span>
          {(q || families.length || style || count) && (
            <button className="btn btn-small" onClick={reset}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {list.length === 0 && (
        <div className="empty">
          <p>No palettes match. Try fewer filters, or make your own in the generator.</p>
        </div>
      )}
      <div className="card-grid">
        {list.slice(0, shown).map((p) => (
          <PaletteCard key={p.id} p={p} saved={savedSlugs.has(paletteSlug(p.colors))} />
        ))}
      </div>
      {shown < list.length && (
        <button className="btn" style={{ alignSelf: 'center' }} onClick={() => setShown((s) => s + PAGE)}>
          Show more ({list.length - shown} left)
        </button>
      )}
    </div>
  )
}
