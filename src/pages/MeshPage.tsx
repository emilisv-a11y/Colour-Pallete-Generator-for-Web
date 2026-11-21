import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { CodeBlock, ColorField, Segmented, useToast } from '../components/ui'
import { contrastRatio, readableOn } from '../lib/color'
import { downloadBlob, paletteSlug } from '../lib/exports'
import { generatePalette } from '../lib/generate'
import { meshAverage, meshCss, renderMesh, type Mesh, type MeshMode, type MeshPoint } from '../lib/mesh'
import { uid } from '../lib/storage'
import { useGenerator } from '../state/GeneratorContext'

const STORE = 'd5wt:mesh'
const MAX_POINTS = 8
const RATIOS = [
  { id: '16:9', w: 16, h: 9 },
  { id: '4:3', w: 4, h: 3 },
  { id: '1:1', w: 1, h: 1 },
  { id: '4:5', w: 4, h: 5 },
  { id: '9:16', w: 9, h: 16 },
] as const
type RatioId = (typeof RATIOS)[number]['id']
const EXPORT_WIDTHS = [1280, 1920, 2560, 3840]

const PRESETS: { name: string; base: string; pts: [string, number, number, number][] }[] = [
  { name: 'Aurora', base: '#0b1026', pts: [['#00c9a7', 15, 20, 55], ['#845ec2', 80, 15, 50], ['#d65db1', 70, 85, 55], ['#2c73d2', 20, 80, 50]] },
  { name: 'Peach', base: '#ffe5d9', pts: [['#ffb4a2', 10, 10, 55], ['#e5989b', 90, 20, 50], ['#ffcdb2', 30, 90, 55], ['#b5838d', 85, 85, 45]] },
  { name: 'Lagoon', base: '#e0fbfc', pts: [['#00b4d8', 0, 0, 60], ['#90e0ef', 100, 30, 55], ['#0077b6', 60, 100, 50], ['#caf0f8', 20, 70, 45]] },
  { name: 'Sunset', base: '#2d1e2f', pts: [['#f9ed69', 80, 10, 45], ['#f08a5d', 40, 30, 55], ['#b83b5e', 15, 75, 55], ['#6a2c70', 85, 90, 50]] },
  { name: 'Mint', base: '#f7fff7', pts: [['#74c69d', 0, 100, 60], ['#c7f9cc', 100, 0, 55], ['#1f7a5c', 90, 95, 40], ['#d8f3dc', 10, 10, 50]] },
]

const pt = (color: string, x: number, y: number, spread: number): MeshPoint => ({ id: uid(), color, x, y, spread })

function loadMesh(): Mesh | null {
  try {
    const raw = localStorage.getItem(STORE)
    return raw ? (JSON.parse(raw) as Mesh) : null
  } catch {
    return null
  }
}

function fromPreset(p: (typeof PRESETS)[number], mode: MeshMode = 'css'): Mesh {
  return { base: p.base, points: p.pts.map(([c, x, y, s]) => pt(c, x, y, s)), mode, sharpness: 2.2, grain: 0 }
}

/** Spread the palette over the canvas; the lightest or darkest colour becomes the base. */
function meshFromPalette(hexes: string[], mode: MeshMode, sharpness: number, grain: number): Mesh {
  const shuffled = [...hexes].sort(() => Math.random() - 0.5)
  const base = shuffled.shift()!
  const points = shuffled.slice(0, MAX_POINTS).map((c, i, arr) => {
    // loose ring around the canvas plus jitter, so colours don't clump together
    const a = (i / arr.length) * Math.PI * 2 + Math.random() * 0.8
    return pt(c, 50 + Math.cos(a) * (25 + Math.random() * 25), 50 + Math.sin(a) * (25 + Math.random() * 25), 40 + Math.random() * 30)
  })
  return { base, points, mode, sharpness, grain }
}

export default function MeshPage() {
  const { state } = useGenerator()
  const toast = useToast()
  const paletteHexes = state.present.map((s) => s.hex)
  const [mesh, setMesh] = useState<Mesh>(() => loadMesh() ?? fromPreset(PRESETS[0]))
  const [selected, setSelected] = useState<string | null>(mesh.points[0]?.id ?? null)
  const [ratio, setRatio] = useState<RatioId>('16:9')
  const [exportW, setExportW] = useState(1920)
  const [showText, setShowText] = useState(false)
  const [avg, setAvg] = useState('#888888')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const R = RATIOS.find((r) => r.id === ratio)!
  const PW = R.w >= R.h ? 960 : Math.round((640 * R.w) / R.h)
  const PH = Math.round((PW * R.h) / R.w)
  const sel = mesh.points.find((p) => p.id === selected) ?? null

  const update = (patch: Partial<Mesh>) => setMesh((m) => ({ ...m, ...patch }))
  const updatePoint = (id: string, patch: Partial<MeshPoint>) => setMesh((m) => ({ ...m, points: m.points.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  // Render the preview and remember the mesh.
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = PW
    c.height = PH
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    renderMesh(ctx, PW, PH, mesh)
    setAvg(meshAverage(ctx, PW, PH))
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(mesh))
      } catch {
        /* ignore */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [mesh, PW, PH])

  const posFrom = (clientX: number, clientY: number) => {
    const r = wrapRef.current!.getBoundingClientRect()
    return {
      x: Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)) * 10) / 10,
      y: Math.round(Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)) * 10) / 10,
    }
  }

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelected(id)
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => updatePoint(id, posFrom(ev.clientX, ev.clientY))
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const addPoint = (x = 30 + Math.random() * 40, y = 30 + Math.random() * 40) => {
    if (mesh.points.length >= MAX_POINTS) return toast(`Up to ${MAX_POINTS} points`)
    const used = new Set(mesh.points.map((p) => p.color))
    const color = paletteHexes.find((h) => !used.has(h) && h !== mesh.base) ?? generatePalette([null], 'auto')[0]
    const p = pt(color, x, y, 50)
    setMesh((m) => ({ ...m, points: [...m.points, p] }))
    setSelected(p.id)
  }

  const randomize = (from: 'palette' | 'random') => {
    const hexes = from === 'palette' ? paletteHexes : generatePalette(Array(5).fill(null), 'auto')
    const m = meshFromPalette(hexes, mesh.mode, mesh.sharpness, mesh.grain)
    setMesh(m)
    setSelected(m.points[0]?.id ?? null)
  }

  const download = (type: 'png' | 'webp' | 'jpeg') => {
    const W = exportW
    const H = Math.round((W * R.h) / R.w)
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    renderMesh(c.getContext('2d')!, W, H, mesh)
    c.toBlob((b) => b && downloadBlob(b, `mesh-gradient-${W}x${H}.${type === 'jpeg' ? 'jpg' : type}`), `image/${type}`, 0.92)
  }

  const css = meshCss(mesh)
  const textColor = readableOn(avg)
  const allColors = [mesh.base, ...mesh.points.map((p) => p.color)]

  return (
    <div className="page mesh-page">
      <header className="page-head row space-between wrap">
        <div>
          <h1>Mesh gradient</h1>
          <p className="muted">Soft, multi-point gradients for hero sections and backgrounds. Drag the points, click empty space to add one.</p>
        </div>
        <Link className="btn" to="/gradient">
          Linear, radial &amp; conic <Icon name="external" size={14} />
        </Link>
      </header>

      <div className="mesh-layout">
        <div className="stack">
          <div className="mesh-stage">
            <div
              className="mesh-wrap"
              ref={wrapRef}
              style={{ aspectRatio: `${R.w} / ${R.h}` }}
              onPointerDown={(e) => {
                if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('mesh-canvas')) return
                const { x, y } = posFrom(e.clientX, e.clientY)
                addPoint(x, y)
              }}
            >
              <canvas ref={canvasRef} className="mesh-canvas" aria-label="Mesh gradient preview" />
              {showText && (
                <div className="mesh-text" style={{ color: textColor }}>
                  <h2 style={{ color: textColor }}>Your headline here</h2>
                  <p>Check how text reads on this background.</p>
                </div>
              )}
              {mesh.points.map((p, i) => (
                <button
                  key={p.id}
                  className={`mesh-dot ${p.id === selected ? 'on' : ''}`}
                  style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color }}
                  onPointerDown={startDrag(p.id)}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 5 : 1
                    const moves: Record<string, Partial<MeshPoint>> = {
                      ArrowLeft: { x: Math.max(0, p.x - step) },
                      ArrowRight: { x: Math.min(100, p.x + step) },
                      ArrowUp: { y: Math.max(0, p.y - step) },
                      ArrowDown: { y: Math.min(100, p.y + step) },
                    }
                    if (moves[e.key]) {
                      e.preventDefault()
                      updatePoint(p.id, moves[e.key])
                    }
                  }}
                  aria-label={`Point ${i + 1}, ${p.color}, at ${Math.round(p.x)}% ${Math.round(p.y)}%. Drag or use arrow keys to move.`}
                />
              ))}
            </div>
          </div>

          <div className="row wrap">
            <Segmented label="Aspect ratio" value={ratio} onChange={setRatio} options={RATIOS.map((r) => ({ id: r.id, label: r.id }))} />
            <label className="row small">
              <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> Preview text
            </label>
            {showText && (
              <span className={`small ${contrastRatio(textColor, avg) >= 4.5 ? 'muted' : 'warn'}`}>
                {textColor === '#000000' ? 'Black' : 'White'} text on average colour: {contrastRatio(textColor, avg).toFixed(1)}:1
              </span>
            )}
          </div>

          <div className="row wrap">
            <button className="btn btn-primary" onClick={() => randomize('palette')}>
              <Icon name="wand" size={16} /> From current palette
            </button>
            <button className="btn" onClick={() => randomize('random')}>
              Random
            </button>
            <button className="btn" onClick={() => addPoint()} disabled={mesh.points.length >= MAX_POINTS}>
              <Icon name="plus" size={16} /> Add point
            </button>
          </div>

          <div className="field">
            <span className="field-label">Presets</span>
            <div className="preset-grid">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="preset"
                  onClick={() => {
                    const m = { ...fromPreset(p, mesh.mode), sharpness: mesh.sharpness, grain: mesh.grain }
                    setMesh(m)
                    setSelected(m.points[0].id)
                  }}
                >
                  <span
                    className="preset-swatch"
                    style={{ backgroundColor: p.base, backgroundImage: p.pts.map(([c, x, y, s]) => `radial-gradient(at ${x}% ${y}%, ${c} 0px, ${c}00 ${s}%)`).join(', ') }}
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="stack mesh-side">
          <div className="field">
            <span className="field-label">Style</span>
            <Segmented
              label="Mesh style"
              value={mesh.mode}
              onChange={(mode: MeshMode) => update({ mode })}
              options={[
                { id: 'css', label: 'CSS layers' },
                { id: 'smooth', label: 'Smooth blend' },
              ]}
            />
            <p className="muted small" style={{ margin: 0 }}>
              {mesh.mode === 'css'
                ? 'Pure CSS: lightweight, sharp at any size, works as a section background anywhere.'
                : 'Perceptual blend with no grey seams. Export as an image; the CSS below is an approximation.'}
            </p>
          </div>
          {mesh.mode === 'smooth' && (
            <label className="slider">
              <span className="row space-between">
                <span>Colour reach</span>
                <span className="muted">{mesh.sharpness.toFixed(1)}</span>
              </span>
              <input type="range" min={1} max={4} step={0.1} value={mesh.sharpness} onChange={(e) => update({ sharpness: Number(e.target.value) })} />
            </label>
          )}
          <label className="slider">
            <span className="row space-between">
              <span>Grain</span>
              <span className="muted">{mesh.grain}</span>
            </span>
            <input type="range" min={0} max={60} value={mesh.grain} onChange={(e) => update({ grain: Number(e.target.value) })} />
          </label>

          <div className="mesh-points">
            <span className="field-label">Points ({mesh.points.length})</span>
            <div className="row wrap">
              <button className={`chip-btn base-chip ${selected === null ? 'selected' : ''}`} style={{ background: mesh.base }} onClick={() => setSelected(null)} title="Base colour" aria-label="Edit base colour">
                <span>B</span>
              </button>
              {mesh.points.map((p, i) => (
                <button key={p.id} className={`chip-btn ${p.id === selected ? 'selected' : ''}`} style={{ background: p.color }} onClick={() => setSelected(p.id)} aria-label={`Edit point ${i + 1}`} />
              ))}
            </div>
          </div>

          {sel ? (
            <div className="stack">
              <div className="row space-between">
                <h3 style={{ margin: 0 }}>Point {mesh.points.indexOf(sel) + 1}</h3>
                <button
                  className="icon-btn danger"
                  onClick={() => {
                    setMesh((m) => ({ ...m, points: m.points.filter((p) => p.id !== sel.id) }))
                    setSelected(null)
                  }}
                  disabled={mesh.points.length <= 1}
                  aria-label="Remove point"
                  title="Remove point"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
              <ColorField value={sel.color} onChange={(color) => updatePoint(sel.id, { color })} />
              <label className="slider">
                <span className="row space-between">
                  <span>Spread</span>
                  <span className="muted">{Math.round(sel.spread)}%</span>
                </span>
                <input type="range" min={10} max={100} value={sel.spread} onChange={(e) => updatePoint(sel.id, { spread: Number(e.target.value) })} />
              </label>
            </div>
          ) : (
            <div className="stack">
              <h3 style={{ margin: 0 }}>Base colour</h3>
              <ColorField value={mesh.base} onChange={(base) => update({ base })} />
            </div>
          )}

          <div className="field">
            <span className="field-label">Use a palette colour</span>
            <div className="row wrap">
              {paletteHexes.map((h, i) => (
                <button
                  key={`${h}-${i}`}
                  className="chip-btn"
                  style={{ background: h }}
                  onClick={() => (sel ? updatePoint(sel.id, { color: h }) : update({ base: h }))}
                  aria-label={`Use ${h}`}
                  title={h.toUpperCase()}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section>
        <h2>CSS</h2>
        <CodeBlock code={css} label="CSS" />
        <p className="muted small">
          Divi: open the section's settings, go to <strong>Advanced → Custom CSS → Main Element</strong> and paste the two lines. Or add them to a class in your
          stylesheet and put that class in the section's <strong>CSS Class</strong> field.
        </p>
      </section>

      <section>
        <h2>Download image</h2>
        <div className="row wrap">
          <select value={exportW} onChange={(e) => setExportW(Number(e.target.value))} aria-label="Export size">
            {EXPORT_WIDTHS.map((w) => (
              <option key={w} value={w}>
                {w} × {Math.round((w * R.h) / R.w)}
              </option>
            ))}
          </select>
          <button className="btn btn-dark" onClick={() => download('webp')}>
            <Icon name="download" size={16} /> WebP
          </button>
          <button className="btn" onClick={() => download('png')}>
            <Icon name="download" size={16} /> PNG
          </button>
          <button className="btn" onClick={() => download('jpeg')}>
            <Icon name="download" size={16} /> JPG
          </button>
          <Link className="btn" to={`/generate/${paletteSlug(allColors.slice(0, 10))}`}>
            <Icon name="wand" size={16} /> Colours to generator
          </Link>
        </div>
        <p className="muted small">WebP gives the smallest file for websites. Add a little grain to avoid visible banding in large images.</p>
      </section>
    </div>
  )
}
