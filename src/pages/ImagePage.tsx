import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ExportModal, MiniPalette, SaveModal } from '../components/generator/Panels'
import { Segmented, useCopy } from '../components/ui'
import { readableOn } from '../lib/color'
import { paletteSlug } from '../lib/exports'
import { extractPalette, pickAt, samplePixels, type Extracted, type ExtractStyle, type Pixel } from '../lib/extract'
import { useColorNames } from '../lib/names'

const MAX_SIDE = 900

/** A procedurally drawn landscape so the tool can be tried without an upload. */
function sampleImage(): string {
  const c = document.createElement('canvas')
  c.width = 900
  c.height = 560
  const g = c.getContext('2d')!
  const sky = g.createLinearGradient(0, 0, 0, 380)
  sky.addColorStop(0, '#1d2b53')
  sky.addColorStop(0.45, '#7e5a9b')
  sky.addColorStop(0.75, '#f08a5d')
  sky.addColorStop(1, '#f9d56e')
  g.fillStyle = sky
  g.fillRect(0, 0, 900, 560)
  g.fillStyle = '#fff1c1'
  g.beginPath()
  g.arc(600, 330, 70, 0, Math.PI * 2)
  g.fill()
  const ridge = (color: string, base: number, amp: number, seed: number) => {
    g.fillStyle = color
    g.beginPath()
    g.moveTo(0, 560)
    for (let x = 0; x <= 900; x += 10) g.lineTo(x, base - Math.sin(x / 90 + seed) * amp - Math.sin(x / 37 + seed * 2) * amp * 0.35)
    g.lineTo(900, 560)
    g.fill()
  }
  ridge('#b8607a', 360, 40, 1)
  ridge('#6b3e6e', 410, 35, 2.4)
  ridge('#3a2a52', 460, 30, 4)
  ridge('#1b1730', 510, 22, 5.5)
  return c.toDataURL('image/png')
}

export default function ImagePage() {
  const [src, setSrc] = useState<string | null>(null)
  const [count, setCount] = useState(5)
  const [style, setStyle] = useState<ExtractStyle>('balanced')
  const [seed, setSeed] = useState(1)
  const [colors, setColors] = useState<Extracted>([])
  const [dims, setDims] = useState({ w: 1, h: 1 })
  const [dragOver, setDragOver] = useState(false)
  const [dialog, setDialog] = useState<null | 'export' | 'save'>(null)
  const dataRef = useRef<ImageData | null>(null)
  const pixelsRef = useRef<Pixel[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const copy = useCopy()
  const { name } = useColorNames()

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setSrc(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  // Decode the image into pixel data whenever the source changes.
  useEffect(() => {
    if (!src) return
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, w, h)
      dataRef.current = ctx.getImageData(0, 0, w, h)
      pixelsRef.current = samplePixels(dataRef.current)
      setDims({ w, h })
      setSeed(1)
      setColors(extractPalette(pixelsRef.current, count, style, 1))
    }
    img.src = src
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // Re-extract when settings change.
  useEffect(() => {
    if (pixelsRef.current.length) setColors(extractPalette(pixelsRef.current, count, style, seed))
  }, [count, style, seed])

  // Paste an image from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) loadFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  const startDrag = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const rect = wrapRef.current!.getBoundingClientRect()
      const x = Math.min(dims.w - 1, Math.max(0, ((ev.clientX - rect.left) / rect.width) * dims.w))
      const y = Math.min(dims.h - 1, Math.max(0, ((ev.clientY - rect.top) / rect.height) * dims.h))
      const hex = pickAt(dataRef.current!, x, y)
      setColors((cs) => cs.map((c, i) => (i === index ? { hex, x, y } : c)))
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const hexes = colors.map((c) => c.hex)

  return (
    <div className="page image-page">
      <header className="page-head">
        <h1>Image picker</h1>
        <p className="muted">Pull a palette out of a photo, screenshot or logo, then drag the pickers to fine-tune each colour. Images never leave your browser.</p>
      </header>

      {!src ? (
        <div
          className={`drop-zone ${dragOver ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) loadFile(f)
          }}
        >
          <Icon name="upload" size={32} />
          <p>
            <strong>Drop an image here</strong>, paste one (Ctrl/⌘ + V), or
          </p>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              Choose a file
            </button>
            <button className="btn" onClick={() => setSrc(sampleImage())}>
              Try a sample image
            </button>
          </div>
        </div>
      ) : (
        <div className="image-layout">
          <div className="image-stage">
            <div className="image-wrap" ref={wrapRef}>
              <img src={src} alt="Uploaded" draggable={false} />
              {colors.map((c, i) => (
                <button
                  key={i}
                  className="picker-dot"
                  style={{ left: `${(c.x / dims.w) * 100}%`, top: `${(c.y / dims.h) * 100}%`, background: c.hex }}
                  onPointerDown={startDrag(i)}
                  aria-label={`Picker ${i + 1}: ${c.hex}. Drag to pick another colour.`}
                  title="Drag to pick a colour"
                />
              ))}
            </div>
            <div className="row wrap">
              <button className="btn" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> Another image
              </button>
              <button className="btn" onClick={() => setSrc(null)}>
                <Icon name="x" size={16} /> Clear
              </button>
            </div>
          </div>

          <aside className="image-side">
            <label className="slider">
              <span className="row space-between">
                <span>Colours</span>
                <span className="muted">{count}</span>
              </span>
              <input type="range" min={2} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </label>
            <div className="field">
              <span className="field-label">Favour</span>
              <Segmented
                label="Extraction style"
                value={style}
                onChange={setStyle}
                options={[
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'vibrant', label: 'Vibrant' },
                  { id: 'muted', label: 'Muted' },
                ]}
              />
            </div>
            <button className="btn" onClick={() => setSeed((s) => s + 1)}>
              <Icon name="wand" size={16} /> Try another mix
            </button>

            <ul className="extracted">
              {colors.map((c, i) => (
                <li key={i}>
                  <button onClick={() => copy(c.hex.toUpperCase())} style={{ background: c.hex, color: readableOn(c.hex) }} title="Copy HEX">
                    <strong>{c.hex.slice(1).toUpperCase()}</strong>
                    <span>{name(c.hex)}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="stack">
              <Link className="btn btn-primary" to={`/generate/${paletteSlug(hexes)}`}>
                <Icon name="wand" size={16} /> Open in generator
              </Link>
              <div className="row">
                <button className="btn grow" onClick={() => setDialog('save')}>
                  <Icon name="save" size={16} /> Save
                </button>
                <button className="btn btn-dark grow" onClick={() => setDialog('export')}>
                  <Icon name="share" size={16} /> Export
                </button>
              </div>
              <MiniPalette hexes={hexes} />
            </div>
          </aside>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) loadFile(f)
          e.target.value = ''
        }}
      />
      {dialog === 'export' && <ExportModal hexes={hexes} onClose={() => setDialog(null)} />}
      {dialog === 'save' && <SaveModal hexes={hexes} onClose={() => setDialog(null)} />}
    </div>
  )
}
