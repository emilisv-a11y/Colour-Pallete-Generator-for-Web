import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useDesignSystem } from '../components/system/useDesignSystem'
import { CodeBlock, ColorField, Popover, Segmented, useToast } from '../components/ui'
import { fontStack, loadFonts } from '../lib/fonts'
import { analyze, findOpacity, helperColor, metricOf, NO_OVERLAY, overlayCss, type Box, type Overlay, type OverlayKind, type ScrimDir } from '../lib/imageText'
import { buildScales, buildTokens } from '../lib/system'

const RATIOS = [
  { id: '16:9', w: 16, h: 9, label: 'Desktop 16:9' },
  { id: '4:3', w: 4, h: 3, label: 'Tablet 4:3' },
  { id: '9:16', w: 9, h: 16, label: 'Phone 9:16' },
] as const
type RatioId = (typeof RATIOS)[number]['id']

/** A bright, busy sample photo-like scene: exactly the kind of image white text fails on. */
function sampleScene(): string {
  const c = document.createElement('canvas')
  c.width = 1600
  c.height = 1000
  const g = c.getContext('2d')!
  const sky = g.createLinearGradient(0, 0, 0, 620)
  sky.addColorStop(0, '#5aa9e6')
  sky.addColorStop(0.7, '#cfe8f7')
  sky.addColorStop(1, '#fdf6e3')
  g.fillStyle = sky
  g.fillRect(0, 0, 1600, 620)
  g.fillStyle = '#fffdf2'
  g.beginPath()
  g.arc(1180, 230, 90, 0, Math.PI * 2)
  g.fill()
  // clouds
  g.fillStyle = 'rgba(255,255,255,0.9)'
  ;[[300, 180, 1], [620, 120, 0.8], [980, 300, 1.2], [1400, 160, 0.9]].forEach(([x, y, s]) => {
    ;[[0, 0, 60], [55, -20, 70], [120, 0, 55], [60, 20, 60]].forEach(([dx, dy, r]) => {
      g.beginPath()
      g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2)
      g.fill()
    })
  })
  // sea
  const sea = g.createLinearGradient(0, 620, 0, 760)
  sea.addColorStop(0, '#2a7fb8')
  sea.addColorStop(1, '#1b5f8c')
  g.fillStyle = sea
  g.fillRect(0, 620, 1600, 140)
  // sand
  const sand = g.createLinearGradient(0, 760, 0, 1000)
  sand.addColorStop(0, '#f2deb0')
  sand.addColorStop(1, '#d9b77e')
  g.fillStyle = sand
  g.fillRect(0, 760, 1600, 240)
  // dark palm silhouette
  g.strokeStyle = '#1f2a1f'
  g.lineWidth = 26
  g.beginPath()
  g.moveTo(240, 1000)
  g.quadraticCurveTo(300, 700, 220, 430)
  g.stroke()
  g.fillStyle = '#1f2a1f'
  ;[-0.9, -0.4, 0.1, 0.6, 1.1, 1.8, 2.4].forEach((a) => {
    g.save()
    g.translate(220, 430)
    g.rotate(a)
    g.beginPath()
    g.ellipse(120, 0, 130, 26, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  })
  return c.toDataURL('image/jpeg', 0.9)
}

export default function ImageTextPage() {
  const toast = useToast()
  const { sys } = useDesignSystem()
  const [src, setSrc] = useState<string | null>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [ratio, setRatio] = useState<RatioId>('16:9')
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [box, setBox] = useState<Box>({ x: 0.06, y: 0.22, w: 0.5, h: 0.42 })
  const [headline, setHeadline] = useState('Summer by the sea')
  const [body, setBody] = useState('Book a stay at our beach house and wake up to the sound of the waves.')
  const [size, setSize] = useState(48)
  const [content, setContent] = useState<'mixed' | 'large'>('mixed')
  const [text, setText] = useState('#ffffff')
  const [ov, setOv] = useState<Overlay>(NO_OVERLAY)
  const [strict, setStrict] = useState(false)
  const [heat, setHeat] = useState(true)
  const [pickText, setPickText] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heatRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [base, setBase] = useState<ImageData | null>(null)
  const [shownW, setShownW] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setShownW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [src, ratio])

  const R = RATIOS.find((r) => r.id === ratio)!
  const W = R.w >= R.h ? 960 : Math.round((600 * R.w) / R.h)
  const H = Math.round((W * R.h) / R.w)
  const target = content === 'mixed' ? 4.5 : 3

  useEffect(() => {
    if (sys) loadFonts([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)
  }, [sys?.fonts.heading, sys?.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!src) return setImgEl(null)
    const im = new Image()
    im.onload = () => setImgEl(im)
    im.src = src
  }, [src])

  // Draw the image like `background-size: cover` with the chosen position, and keep the raw pixels for analysis.
  useEffect(() => {
    if (!imgEl) return setBase(null)
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    const s = Math.max(W / imgEl.width, H / imgEl.height)
    const dw = imgEl.width * s,
      dh = imgEl.height * s
    ctx.drawImage(imgEl, (W - dw) * (pos.x / 100), (H - dh) * (pos.y / 100), dw, dh)
    setBase(ctx.getImageData(0, 0, W, H))
  }, [imgEl, W, H, pos.x, pos.y])

  const analysis = useMemo(() => (base ? analyze(base, box, text, ov) : null), [base, box, text, ov])
  const metric = analysis ? metricOf(analysis, strict) : 0
  const pass = metric >= target

  // Suggestions: overlay needed for white text and for black text (solid or current kind).
  const suggestions = useMemo(() => {
    if (!base) return null
    const kind: OverlayKind = ov.kind === 'none' ? 'solid' : ov.kind
    const forText = (t: string) => {
      const color = helperColor(t)
      if (kind !== 'scrim') {
        const op = findOpacity(base, box, t, { ...ov, kind, color }, target, strict)
        return { text: t, color, kind, opacity: op, direction: ov.direction, extent: ov.extent, hold: ov.hold }
      }
      // Scrims: try every edge with a reach that covers the text area, keep the lightest that works.
      const reach: Record<ScrimDir, number> = { bottom: 1 - box.y, top: box.y + box.h, left: box.x + box.w, right: 1 - box.x }
      // Hold full strength across the text, then fade out over the next 25% of the frame.
      let best: { opacity: number | null; direction: ScrimDir; extent: number; hold: number } = { opacity: null, direction: ov.direction, extent: ov.extent, hold: ov.hold }
      ;(['bottom', 'top', 'left', 'right'] as ScrimDir[]).forEach((direction) => {
        const hold = Math.min(99, Math.round(reach[direction] * 100))
        const extent = Math.min(100, hold + 25)
        const op = findOpacity(base, box, t, { ...ov, kind, color, direction, extent, hold }, target, strict)
        // prefer the edge that leaves the most of the image untouched when opacities are close
        const score = (o: number, h: number) => o + h / 400
        if (op !== null && (best.opacity === null || score(op, hold) < score(best.opacity, best.hold))) best = { opacity: op, direction, extent, hold }
      })
      return { text: t, color, kind, ...best }
    }
    return [forText('#ffffff'), forText('#000000')]
  }, [base, box, ov.kind, target, strict]) // eslint-disable-line react-hooks/exhaustive-deps

  // Render image + overlay (+ heatmap)
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !base) return
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    ctx.putImageData(base, 0, 0)
    const rgba = (a: number) => {
      const n = parseInt(ov.color.slice(1), 16)
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
    }
    if (ov.kind === 'solid') {
      ctx.fillStyle = rgba(ov.opacity)
      ctx.fillRect(0, 0, W, H)
    } else if (ov.kind === 'scrim') {
      const e = ov.extent / 100
      const [x0, y0, x1, y1] =
        ov.direction === 'bottom' ? [0, H, 0, H - H * e] : ov.direction === 'top' ? [0, 0, 0, H * e] : ov.direction === 'left' ? [0, 0, W * e, 0] : [W, 0, W - W * e, 0]
      const g = ctx.createLinearGradient(x0, y0, x1, y1)
      g.addColorStop(0, rgba(ov.opacity))
      if (ov.hold > 0) g.addColorStop(Math.min(0.99, ov.hold / Math.max(1, ov.extent)), rgba(ov.opacity))
      g.addColorStop(1, rgba(0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    } else if (ov.kind === 'box') {
      ctx.fillStyle = rgba(ov.opacity)
      ctx.beginPath()
      ctx.roundRect(box.x * W, box.y * H, box.w * W, box.h * H, 12)
      ctx.fill()
    }
    const hc = heatRef.current
    if (hc) {
      hc.width = W
      hc.height = H
      const h = hc.getContext('2d')!
      h.clearRect(0, 0, W, H)
      if (heat && analysis) {
        h.fillStyle = 'rgba(255, 0, 64, 0.55)'
        const step = Math.max(2, Math.floor(Math.sqrt((box.w * W * box.h * H) / 25000)))
        analysis.failing(target).forEach(([fx, fy]) => h.fillRect(fx * W, fy * H, step, step))
      }
    }
  }, [base, ov, box, W, H, heat, analysis, target])

  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return
    const r = new FileReader()
    r.onload = () => setSrc(r.result as string)
    r.readAsDataURL(f)
  }, [])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'))
      if (f) loadFile(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFile])

  /** Drag the text box (mode 'move') or its corner (mode 'resize'). */
  const startDrag = (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = wrapRef.current!.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, box }
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - start.x) / rect.width
      const dy = (ev.clientY - start.y) / rect.height
      if (mode === 'move') {
        setBox({ ...start.box, x: Math.min(1 - start.box.w, Math.max(0, start.box.x + dx)), y: Math.min(1 - start.box.h, Math.max(0, start.box.y + dy)) })
      } else {
        setBox({ ...start.box, w: Math.min(1 - start.box.x, Math.max(0.1, start.box.w + dx)), h: Math.min(1 - start.box.y, Math.max(0.08, start.box.h + dy)) })
      }
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const tokenColors = useMemo(() => {
    if (!sys) return []
    const scales = buildScales(sys)
    const t = buildTokens(sys, 'light', scales)
    return [
      { label: 'Brand primary', hex: t.primary.hex },
      { label: 'Text', hex: t.text.hex },
      { label: 'Neutral 50', hex: scales.neutral[0] },
      { label: 'Neutral 900', hex: scales.neutral[9] },
    ]
  }, [sys])

  const scale = shownW ? W / shownW : 1
  const headingFont = sys ? fontStack(sys.fonts.heading, sys.fonts.meta) : undefined
  const bodyFont = sys ? fontStack(sys.fonts.body, sys.fonts.meta) : undefined

  return (
    <div className="page image-text-page">
      <header className="page-head">
        <h1>Text on image checker</h1>
        <p className="muted">
          Check whether text stays readable on a photo, then find the lightest overlay that fixes it. Every pixel behind the text is measured, not just an average.
        </p>
      </header>

      {!src ? (
        <div
          className={`drop-zone ${dragOver ? 'over' : ''}`}
          onDragOver={(e) => (e.preventDefault(), setDragOver(true))}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) loadFile(f)
          }}
        >
          <Icon name="image" size={32} />
          <p>
            <strong>Drop a hero image here</strong>, paste one, or
          </p>
          <div className="row wrap" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              Choose an image
            </button>
            <button className="btn" onClick={() => setSrc(sampleScene())}>
              Try a sample image
            </button>
          </div>
        </div>
      ) : (
        <div className="it-layout">
          <div className="stack">
            <div className="row wrap">
              <Segmented label="Screen shape" value={ratio} onChange={setRatio} options={RATIOS.map((r) => ({ id: r.id, label: r.label }))} />
              <label className="row small">
                <input type="checkbox" checked={heat} onChange={(e) => setHeat(e.target.checked)} /> Show failing pixels
              </label>
            </div>
            <div className="it-stage">
              <div className="it-wrap" ref={wrapRef} style={{ aspectRatio: `${R.w} / ${R.h}`, maxWidth: R.w < R.h ? 380 : undefined }}>
                <canvas ref={canvasRef} />
                <canvas ref={heatRef} className="it-heat" />
                <div
                  className={`it-box ${pass ? 'pass' : 'fail'}`}
                  style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`, color: text }}
                  onPointerDown={startDrag('move')}
                  title="Drag to move the text area"
                >
                  <h2 style={{ fontSize: size / scale, color: text, fontFamily: headingFont }}>{headline}</h2>
                  {content === 'mixed' && <p style={{ fontSize: 16 / scale, fontFamily: bodyFont }}>{body}</p>}
                  <span className="it-resize" onPointerDown={startDrag('resize')} title="Drag to resize" />
                </div>
              </div>
            </div>
            <div className="row wrap">
              <label className="slider grow">
                <span className="row space-between small">
                  <span>Image position, horizontal</span>
                  <span className="muted">{pos.x}%</span>
                </span>
                <input type="range" min={0} max={100} value={pos.x} onChange={(e) => setPos({ ...pos, x: Number(e.target.value) })} />
              </label>
              <label className="slider grow">
                <span className="row space-between small">
                  <span>Image position, vertical</span>
                  <span className="muted">{pos.y}%</span>
                </span>
                <input type="range" min={0} max={100} value={pos.y} onChange={(e) => setPos({ ...pos, y: Number(e.target.value) })} />
              </label>
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

          <aside className="it-side stack">
            {analysis && (
              <div className={`it-result ${pass ? 'pass' : 'fail'}`}>
                <div className="it-verdict">
                  <Icon name={pass ? 'check' : 'x'} size={20} />
                  <strong>{pass ? 'Readable' : 'Not readable enough'}</strong>
                </div>
                <div className="it-stats">
                  <div>
                    <span className="field-label">{strict ? 'Worst pixel' : 'Worst 2%'}</span>
                    <strong>{metric.toFixed(2)}:1</strong>
                  </div>
                  <div>
                    <span className="field-label">Typical</span>
                    <strong>{analysis.median.toFixed(1)}:1</strong>
                  </div>
                  <div>
                    <span className="field-label">Area passing</span>
                    <strong>{Math.round(analysis.share(target) * 100)}%</strong>
                  </div>
                </div>
                <span className="muted small">
                  Needs {target}:1 ({content === 'mixed' ? 'body text, WCAG AA' : 'large text only, WCAG AA'}).
                </span>
              </div>
            )}

            {suggestions && (
              <div className="it-suggest">
                <span className="field-label">Lightest fix ({(ov.kind === 'none' ? 'solid' : ov.kind).replace('scrim', 'gradient scrim').replace('box', 'panel behind text')})</span>
                {suggestions.map((s) => (
                  <button
                    key={s.text}
                    className="fix"
                    disabled={s.opacity === null}
                    onClick={() => {
                      setText(s.text)
                      setOv({ ...ov, kind: s.kind, color: s.color, opacity: s.opacity ?? 1, direction: s.direction, extent: s.extent, hold: s.hold })
                      toast(s.opacity === 0 ? 'No overlay needed' : `Applied ${Math.round((s.opacity ?? 1) * 100)}% overlay`)
                    }}
                  >
                    <span className="chip" style={{ background: s.text }} /> {s.text === '#ffffff' ? 'White' : 'Black'} text:{' '}
                    {s.opacity === null ? "can't pass with this overlay" : s.opacity === 0 ? 'passes without overlay' : `${Math.round(s.opacity * 100)}% ${s.color === '#000000' ? 'dark' : 'light'} ${s.kind === 'scrim' ? `scrim from the ${s.direction}` : 'overlay'}`}
                  </button>
                ))}
              </div>
            )}

            <div className="field">
              <span className="field-label">Overlay</span>
              <select value={ov.kind} onChange={(e) => setOv({ ...ov, kind: e.target.value as OverlayKind })}>
                <option value="none">None</option>
                <option value="solid">Solid tint over the whole image</option>
                <option value="scrim">Gradient scrim from one edge</option>
                <option value="box">Panel behind the text only</option>
              </select>
            </div>
            {ov.kind !== 'none' && (
              <>
                <div className="row wrap">
                  {['#000000', '#ffffff', ...tokenColors.map((t) => t.hex)].map((h, i) => (
                    <button key={`${h}-${i}`} className={`chip-btn ${ov.color === h ? 'selected' : ''}`} style={{ background: h }} onClick={() => setOv({ ...ov, color: h })} aria-label={`Overlay colour ${h}`} />
                  ))}
                </div>
                <label className="slider">
                  <span className="row space-between small">
                    <span>Opacity</span>
                    <span className="muted">{Math.round(ov.opacity * 100)}%</span>
                  </span>
                  <input type="range" min={0} max={100} value={Math.round(ov.opacity * 100)} onChange={(e) => setOv({ ...ov, opacity: Number(e.target.value) / 100 })} />
                </label>
                {ov.kind === 'scrim' && (
                  <>
                    <Segmented
                      label="Scrim edge"
                      value={ov.direction}
                      onChange={(direction: ScrimDir) => setOv({ ...ov, direction })}
                      options={[
                        { id: 'bottom', label: 'Bottom' },
                        { id: 'top', label: 'Top' },
                        { id: 'left', label: 'Left' },
                        { id: 'right', label: 'Right' },
                      ]}
                    />
                    <label className="slider">
                      <span className="row space-between small">
                        <span>Full strength up to</span>
                        <span className="muted">{ov.hold}%</span>
                      </span>
                      <input type="range" min={0} max={95} value={ov.hold} onChange={(e) => setOv({ ...ov, hold: Number(e.target.value), extent: Math.max(ov.extent, Number(e.target.value) + 5) })} />
                    </label>
                    <label className="slider">
                      <span className="row space-between small">
                        <span>Fades out by</span>
                        <span className="muted">{ov.extent}%</span>
                      </span>
                      <input type="range" min={10} max={100} value={ov.extent} onChange={(e) => setOv({ ...ov, extent: Number(e.target.value), hold: Math.min(ov.hold, Number(e.target.value) - 5) })} />
                    </label>
                  </>
                )}
              </>
            )}

            <div className="field">
              <span className="field-label">Text</span>
              <div className="row wrap">
                {['#ffffff', '#000000', ...tokenColors.map((t) => t.hex)].map((h, i) => (
                  <button key={`${h}-${i}`} className={`chip-btn ${text === h ? 'selected' : ''}`} style={{ background: h }} onClick={() => setText(h)} aria-label={`Text colour ${h}`} />
                ))}
                <div className="pop-anchor">
                  <button className="btn btn-small" onClick={() => setPickText(true)}>
                    Custom
                  </button>
                  {pickText && (
                    <Popover onClose={() => setPickText(false)} className="it-pop">
                      <ColorField value={text} onChange={setText} />
                    </Popover>
                  )}
                </div>
              </div>
              <Segmented
                label="Text content"
                value={content}
                onChange={setContent}
                options={[
                  { id: 'mixed', label: 'Headline + paragraph (4.5:1)' },
                  { id: 'large', label: 'Large headline only (3:1)' },
                ]}
              />
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} aria-label="Headline" />
              {content === 'mixed' && <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Paragraph" />}
              <label className="slider">
                <span className="row space-between small">
                  <span>Headline size</span>
                  <span className="muted">{size}px</span>
                </span>
                <input type="range" min={24} max={96} value={size} onChange={(e) => setSize(Number(e.target.value))} />
              </label>
              <label className="row small">
                <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /> Strict: every pixel must pass (otherwise the worst 2% is ignored, e.g. tiny highlights)
              </label>
            </div>
          </aside>
        </div>
      )}

      {src && (
        <section>
          <h2>Use it on your site</h2>
          <CodeBlock code={overlayCss(ov, pos.x, pos.y, text)} label="CSS" />
          <p className="muted small">
            Divi: in the section's <strong>Background</strong> settings add the image, then {ov.kind === 'solid' || ov.kind === 'scrim' ? (
              <>
                add a gradient in the <strong>Gradient</strong> tab with the colours and stops above and choose to place the gradient above the background image.
              </>
            ) : ov.kind === 'box' ? (
              <>give the text module (or the row) the panel colour above as its background, with some padding.</>
            ) : (
              <>no overlay is needed for this text.</>
            )}{' '}
            Check again with the Phone shape: the image is cropped differently on small screens, so text often lands on a different part of the photo.
          </p>
        </section>
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
    </div>
  )
}
