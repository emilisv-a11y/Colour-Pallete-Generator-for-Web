import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CATEGORIES,
  forgetLiveList,
  getApiKey,
  loadPreviewFont,
  libraryInfo,
  loadLibrary,
  previewFamily,
  refreshFromGoogle,
  setApiKey,
  type FontCategory,
  type GFont,
} from '../lib/googleFonts'
import { Icon } from './Icon'
import { Modal, Segmented, useToast } from './ui'

const SUBSETS = [
  { id: '', label: 'Any language' },
  { id: 'latin-ext', label: 'Latin Extended (e.g. Lithuanian, Polish, Czech)' },
  { id: 'cyrillic', label: 'Cyrillic' },
  { id: 'cyrillic-ext', label: 'Cyrillic Extended' },
  { id: 'greek', label: 'Greek' },
  { id: 'vietnamese', label: 'Vietnamese' },
  { id: 'hebrew', label: 'Hebrew' },
  { id: 'arabic', label: 'Arabic' },
  { id: 'devanagari', label: 'Devanagari' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'korean', label: 'Korean' },
  { id: 'chinese-simplified', label: 'Chinese (Simplified)' },
]
type Sort = 'popular' | 'az' | 'recent' | 'weights'
const PAGE = 40

function FontRow({ font, text, size, current, onPick, pickLabel }: { font: GFont; text: string; size: number; current: boolean; onPick: () => void; pickLabel: string }) {
  const ref = useRef<HTMLLIElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  // Request only the glyphs in the preview text, once the row is near the screen.
  useEffect(() => {
    if (!visible || !text) return
    const t = setTimeout(() => loadPreviewFont(font.family, text), 250)
    return () => clearTimeout(t)
  }, [visible, text, font.family])
  return (
    <li ref={ref} className={`font-row ${current ? 'current' : ''}`}>
      <div className="font-row-head">
        <strong>{font.family}</strong>
        <span className="muted small">
          {CATEGORIES.find((c) => c.id === font.category)?.label} · {font.weights.length} weight{font.weights.length > 1 ? 's' : ''}
          {font.variable && ' · variable'}
          {font.italic && ' · italics'}
        </span>
        <button className={`btn btn-small ${current ? '' : 'btn-primary'}`} onClick={onPick} disabled={current}>
          {current ? 'In use' : pickLabel}
        </button>
      </div>
      <p className="font-preview" style={{ fontFamily: `'${previewFamily(font.family)}', ${font.category === 'serif' ? 'serif' : font.category === 'monospace' ? 'monospace' : 'sans-serif'}`, fontSize: size }}>
        {text || font.family}
      </p>
    </li>
  )
}

export function FontLibrary({ role, current, onPick, onClose }: { role: 'heading' | 'body'; current: string; onPick: (f: GFont) => void; onClose: () => void }) {
  const toast = useToast()
  const [fonts, setFonts] = useState<GFont[] | null>(null)
  const [q, setQ] = useState('')
  const [cats, setCats] = useState<FontCategory[]>([])
  const [subset, setSubset] = useState('')
  const [variableOnly, setVariableOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('popular')
  const [text, setText] = useState(role === 'heading' ? 'Bold ideas, beautifully set' : 'Body text should be easy to read for long passages, at any size.')
  const [size, setSize] = useState(role === 'heading' ? 32 : 18)
  const [shown, setShown] = useState(PAGE)
  const [showApi, setShowApi] = useState(false)
  const [key, setKey] = useState(getApiKey())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadLibrary().then(setFonts)
  }, [])

  const list = useMemo(() => {
    if (!fonts) return []
    const words = q.toLowerCase().trim()
    let r = fonts.filter(
      (f) =>
        (!words || f.family.toLowerCase().includes(words)) &&
        (!cats.length || cats.includes(f.category)) &&
        (!subset || f.subsets.includes(subset)) &&
        (!variableOnly || f.variable),
    )
    if (sort === 'popular') r = [...r].sort((a, b) => a.rank - b.rank || a.family.localeCompare(b.family))
    if (sort === 'az') r = [...r].sort((a, b) => a.family.localeCompare(b.family))
    if (sort === 'recent') r = [...r].sort((a, b) => b.modified.localeCompare(a.modified))
    if (sort === 'weights') r = [...r].sort((a, b) => b.weights.length - a.weights.length || a.rank - b.rank)
    return r
  }, [fonts, q, cats, subset, variableOnly, sort])

  const refresh = async () => {
    if (!key.trim()) return toast('Paste an API key first')
    setBusy(true)
    try {
      const n = await refreshFromGoogle(key.trim())
      setApiKey(key.trim())
      setFonts(await loadLibrary())
      toast(`Loaded ${n} families from Google`)
    } catch (e) {
      alert(`Could not load fonts from Google: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Google Fonts: choose a ${role} font`} onClose={onClose} wide>
      <div className="font-lib-controls">
        <label className="color-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => (setQ(e.target.value), setShown(PAGE))} placeholder={`Search ${fonts?.length ?? ''} families…`} aria-label="Search fonts" />
        </label>
        <div className="family-chips" role="group" aria-label="Categories">
          {CATEGORIES.map((c) => {
            const on = cats.includes(c.id)
            return (
              <button key={c.id} className={`family-chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => (setCats((xs) => (on ? xs.filter((x) => x !== c.id) : [...xs, c.id])), setShown(PAGE))}>
                {c.label}
              </button>
            )
          })}
          <label className="family-chip">
            <input type="checkbox" checked={variableOnly} onChange={(e) => (setVariableOnly(e.target.checked), setShown(PAGE))} /> Variable only
          </label>
        </div>
        <div className="row wrap">
          <select value={subset} onChange={(e) => (setSubset(e.target.value), setShown(PAGE))} aria-label="Language support">
            {SUBSETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <Segmented
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'popular', label: 'Popular' },
              { id: 'az', label: 'A–Z' },
              { id: 'recent', label: 'Updated' },
              { id: 'weights', label: 'Most weights' },
            ]}
          />
        </div>
        <div className="row wrap">
          <input className="grow" value={text} onChange={(e) => setText(e.target.value)} aria-label="Preview text" placeholder="Type your own preview text" />
          <label className="slider" style={{ minWidth: 160 }}>
            <span className="row space-between small">
              <span>Size</span>
              <span className="muted">{size}px</span>
            </span>
            <input type="range" min={12} max={64} value={size} onChange={(e) => setSize(Number(e.target.value))} />
          </label>
        </div>
      </div>

      {!fonts && <p className="muted">Loading the Google Fonts library…</p>}
      {fonts && (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {list.length} of {fonts.length} families
          </p>
          <ul className="font-list">
            {list.slice(0, shown).map((f) => (
              <FontRow key={f.family} font={f} text={text} size={size} current={f.family === current} pickLabel={role === 'heading' ? 'Use for headings' : 'Use for body'} onPick={() => onPick(f)} />
            ))}
          </ul>
          {shown < list.length && (
            <button className="btn" style={{ alignSelf: 'center' }} onClick={() => setShown((s) => s + PAGE)}>
              Show more ({list.length - shown} left)
            </button>
          )}
        </>
      )}

      <div className="font-lib-source">
        <div className="row wrap space-between">
          <span className="muted small">
            {libraryInfo.live ? (
              <>
                Live list from the Google Fonts API, fetched {libraryInfo.built}. Sorted by Google's real popularity.
              </>
            ) : (
              <>
                Built-in list of every Google Fonts family ({libraryInfo.source || 'loading'}{libraryInfo.built && `, ${libraryInfo.built}`}). Fonts load directly from
                fonts.googleapis.com.
              </>
            )}
          </span>
          <button className="btn btn-small" onClick={() => setShowApi((s) => !s)}>
            {showApi ? 'Hide' : 'Update from Google'}
          </button>
        </div>
        {showApi && (
          <div className="stack api-box">
            <p className="small" style={{ margin: 0 }}>
              Optional: fetch the newest list straight from Google, with Google's popularity ranking. You need a free Google Fonts API key. In Google Cloud Console,
              enable the <strong>Web Fonts Developer API</strong>, then create an API key under <strong>Credentials</strong>, ideally restricted to that API and your
              website address. The key is stored only in this browser and never included in backups.
            </p>
            <div className="row wrap">
              <input className="grow" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Google Fonts API key" aria-label="Google Fonts API key" autoComplete="off" />
              <button className="btn btn-primary" onClick={refresh} disabled={busy}>
                {busy ? 'Loading…' : 'Fetch from Google'}
              </button>
            </div>
            {(libraryInfo.live || getApiKey()) && (
              <div className="row wrap">
                {libraryInfo.live && (
                  <button
                    className="btn btn-small"
                    onClick={async () => {
                      forgetLiveList()
                      setFonts(await loadLibrary())
                    }}
                  >
                    Use built-in list instead
                  </button>
                )}
                {getApiKey() && (
                  <button
                    className="btn btn-small"
                    onClick={() => {
                      setApiKey('')
                      setKey('')
                      toast('API key removed from this browser')
                    }}
                  >
                    Remove saved key
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
