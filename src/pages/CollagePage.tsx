import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/ui'
import { readableOn } from '../lib/color'
import { downloadBlob } from '../lib/exports'
import { extractPalette, samplePixels, type Pixel } from '../lib/extract'
import { colorName, useColorNames } from '../lib/names'
import { useGenerator } from '../state/GeneratorContext'

type Rect = [number, number, number, number]
const LAYOUTS: { id: string; label: string; cells: Rect[] }[] = [
  { id: 'hero', label: 'Hero + 2', cells: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5]] },
  { id: 'grid4', label: 'Grid 2×2', cells: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  { id: 'mosaic', label: 'Mosaic', cells: [[0, 0, 1, 0.58], [0, 0.58, 1 / 3, 0.42], [1 / 3, 0.58, 1 / 3, 0.42], [2 / 3, 0.58, 1 / 3, 0.42]] },
  { id: 'trio', label: 'Three columns', cells: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]] },
  { id: 'split', label: 'Split', cells: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] },
  { id: 'single', label: 'Single', cells: [[0, 0, 1, 1]] },
]
const RATIOS = [
  { id: '4:5', w: 1080, h: 1350 },
  { id: '1:1', w: 1200, h: 1200 },
  { id: '16:9', w: 1600, h: 900 },
] as const

type Opts = {
  images: HTMLImageElement[]
  layout: Rect[]
  palette: string[]
  title: string
  band: 'bottom' | 'right'
  gap: number
  bg: string
  labels: boolean
  W: number
  H: number
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s,
    sh = h / s
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

function render(ctx: CanvasRenderingContext2D, o: Opts) {
  const { W, H, gap } = o
  ctx.fillStyle = o.bg
  ctx.fillRect(0, 0, W, H)
  const titleH = o.title ? Math.round(H * 0.09) : 0
  const bandSize = o.band === 'bottom' ? Math.round(H * 0.16) : Math.round(W * 0.2)
  const area = {
    x: gap,
    y: gap + titleH,
    w: (o.band === 'right' ? W - bandSize - gap : W) - gap * 2,
    h: (o.band === 'bottom' ? H - bandSize - gap : H) - gap * 2 - titleH,
  }

  if (o.title) {
    ctx.fillStyle = readableOn(o.bg)
    ctx.font = `800 ${Math.round(titleH * 0.48)}px Manrope, Helvetica, Arial, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(o.title, gap + 4, gap + titleH / 2, W - gap * 2)
  }

  o.layout.forEach(([cx, cy, cw, ch], i) => {
    const x = area.x + cx * area.w + (cx > 0 ? gap / 2 : 0)
    const y = area.y + cy * area.h + (cy > 0 ? gap / 2 : 0)
    const w = cw * area.w - (cx > 0 ? gap / 2 : 0) - (cx + cw < 0.999 ? gap / 2 : 0)
    const h = ch * area.h - (cy > 0 ? gap / 2 : 0) - (cy + ch < 0.999 ? gap / 2 : 0)
    const img = o.images.length ? o.images[i % o.images.length] : null
    if (img) drawCover(ctx, img, x, y, w, h)
    else {
      ctx.fillStyle = o.palette[i % o.palette.length] ?? '#ddd'
      ctx.fillRect(x, y, w, h)
    }
  })

  // palette band
  const n = o.palette.length
  o.palette.forEach((hex, i) => {
    let x: number, y: number, w: number, h: number
    if (o.band === 'bottom') {
      const total = W - gap * 2
      w = (total - gap * (n - 1)) / n
      h = bandSize - gap
      x = gap + i * (w + gap)
      y = H - bandSize
    } else {
      const total = H - gap * 2 - titleH
      h = (total - gap * (n - 1)) / n
      w = bandSize - gap
      x = W - bandSize
      y = gap + titleH + i * (h + gap)
    }
    ctx.fillStyle = hex
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
    if (o.labels) {
      const fg = readableOn(hex)
      ctx.fillStyle = fg
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      const size = Math.max(12, Math.min(w, h) * 0.14)
      ctx.font = `700 ${size}px Manrope, Helvetica, Arial, sans-serif`
      ctx.fillText(hex.slice(1).toUpperCase(), x + size * 0.7, y + h - size * 0.8, w - size)
      ctx.globalAlpha = 0.75
      ctx.font = `500 ${size * 0.72}px Manrope, Helvetica, Arial, sans-serif`
      ctx.fillText(colorName(hex), x + size * 0.7, y + h - size * 2.1, w - size)
      ctx.globalAlpha = 1
    }
  })
}

export default function CollagePage() {
  const { state } = useGenerator()
  useColorNames()
  const [images, setImages] = useState<{ id: string; src: string; img: HTMLImageElement }[]>([])
  const [layout, setLayout] = useState('hero')
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]['id']>('4:5')
  const [title, setTitle] = useState('Moodboard')
  const [band, setBand] = useState<'bottom' | 'right'>('bottom')
  const [gap, setGap] = useState(16)
  const [bg, setBg] = useState('#ffffff')
  const [labels, setLabels] = useState(true)
  const [source, setSource] = useState<'generator' | 'images'>('generator')
  const [extracted, setExtracted] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const palette = source === 'images' && extracted.length ? extracted : state.present.map((s) => s.hex)
  const R = RATIOS.find((r) => r.id === ratio)!
  const opts: Opts = { images: images.map((i) => i.img), layout: LAYOUTS.find((l) => l.id === layout)!.cells, palette, title, band, gap, bg, labels, W: R.w, H: R.h }

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = R.w
    c.height = R.h
    render(c.getContext('2d')!, opts)
  })

  // Extract a palette across all uploaded images.
  useEffect(() => {
    if (!images.length) return setExtracted([])
    const pixels: Pixel[] = []
    images.forEach(({ img }) => {
      const c = document.createElement('canvas')
      const s = Math.min(1, 300 / Math.max(img.width, img.height))
      c.width = Math.max(1, Math.round(img.width * s))
      c.height = Math.max(1, Math.round(img.height * s))
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, c.width, c.height)
      pixels.push(...samplePixels(ctx.getImageData(0, 0, c.width, c.height), 4000))
    })
    setExtracted(extractPalette(pixels, 5).map((e) => e.hex))
  }, [images])

  const addFiles = (files: FileList | File[]) => {
    ;[...files]
      .filter((f) => f.type.startsWith('image/'))
      .forEach((f) => {
        const reader = new FileReader()
        reader.onload = () => {
          const img = new Image()
          img.onload = () => setImages((xs) => [...xs, { id: Math.random().toString(36).slice(2), src: reader.result as string, img }])
          img.src = reader.result as string
        }
        reader.readAsDataURL(f)
      })
  }

  const exportPng = () => {
    const c = document.createElement('canvas')
    c.width = R.w * 2
    c.height = R.h * 2
    const ctx = c.getContext('2d')!
    ctx.scale(2, 2)
    render(ctx, opts)
    c.toBlob((b) => b && downloadBlob(b, `moodboard-${ratio.replace(':', 'x')}.png`), 'image/png')
  }

  return (
    <div className="page collage-page">
      <header className="page-head">
        <h1>Collage &amp; moodboard</h1>
        <p className="muted">Combine reference images with a palette into a shareable board. Use your generator palette or pull one from the images.</p>
      </header>

      <div className="collage-layout">
        <div
          className="collage-preview"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            addFiles(e.dataTransfer.files)
          }}
        >
          <canvas ref={canvasRef} aria-label="Moodboard preview" />
          {!images.length && <p className="muted small center">Drop images onto the board or use “Add images”. Empty cells use palette colours.</p>}
        </div>

        <aside className="stack collage-side">
          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={16} /> Add images
            </button>
            {images.length > 1 && (
              <button className="btn" onClick={() => setImages((xs) => [...xs].sort(() => Math.random() - 0.5))}>
                Shuffle
              </button>
            )}
          </div>
          {images.length > 0 && (
            <div className="thumbs">
              {images.map((im) => (
                <div key={im.id} className="thumb">
                  <img src={im.src} alt="" />
                  <button className="icon-btn" onClick={() => setImages((xs) => xs.filter((x) => x.id !== im.id))} aria-label="Remove image">
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="field">
            <span className="field-label">Layout</span>
            <select value={layout} onChange={(e) => setLayout(e.target.value)}>
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label">Size</span>
            <Segmented label="Aspect ratio" value={ratio} onChange={setRatio} options={RATIOS.map((r) => ({ id: r.id, label: r.id }))} />
          </div>
          <div className="field">
            <span className="field-label">Palette</span>
            <Segmented
              label="Palette source"
              value={source}
              onChange={setSource}
              options={[
                { id: 'generator', label: 'Generator' },
                { id: 'images', label: 'From images' },
              ]}
            />
          </div>
          <div className="field">
            <span className="field-label">Palette position</span>
            <Segmented
              label="Palette position"
              value={band}
              onChange={setBand}
              options={[
                { id: 'bottom', label: 'Bottom' },
                { id: 'right', label: 'Right' },
              ]}
            />
          </div>
          <label className="field">
            <span className="field-label">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave empty for none" />
          </label>
          <label className="slider">
            <span className="row space-between">
              <span>Spacing</span>
              <span className="muted">{gap}px</span>
            </span>
            <input type="range" min={0} max={48} value={gap} onChange={(e) => setGap(Number(e.target.value))} />
          </label>
          <div className="field">
            <span className="field-label">Background</span>
            <div className="row wrap">
              {[...new Set(['#ffffff', '#f4f1ea', '#111111', ...palette])].map((h, i) => (
                <button key={`${h}-${i}`} className={`chip-btn ${bg === h ? 'selected' : ''}`} style={{ background: h }} onClick={() => setBg(h)} aria-label={`Background ${h}`} />
              ))}
            </div>
          </div>
          <label className="row">
            <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Show colour codes
          </label>
          <button className="btn btn-dark" onClick={exportPng}>
            <Icon name="download" size={16} /> Download PNG
          </button>
        </aside>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
