import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { MiniPalette } from '../components/generator/Panels'
import { CodeBlock, ColorField, Segmented } from '../components/ui'
import { readableOn } from '../lib/color'
import { downloadText, paletteSlug } from '../lib/exports'
import { diviGradient, gradientPresetFile } from '../lib/divi'
import { gradientCode, gradientCss, gradientPalette, sampleGradient, type Gradient, type GradientSpace, type GradientType, type Stop } from '../lib/gradient'
import { uid } from '../lib/storage'
import { useGenerator } from '../state/GeneratorContext'

const PRESETS: { name: string; stops: string[]; angle?: number }[] = [
  { name: 'Dusk', stops: ['#1d2b53', '#7e5a9b', '#f08a5d', '#f9d56e'] },
  { name: 'Lagoon', stops: ['#0b3954', '#087e8b', '#bfd7ea'] },
  { name: 'Citrus', stops: ['#ff5a36', '#ffb03b', '#ffe66d'] },
  { name: 'Mint cream', stops: ['#d8f3dc', '#95d5b2', '#2d6a4f'] },
  { name: 'Berry', stops: ['#3a0ca3', '#7209b7', '#f72585'] },
  { name: 'Peach', stops: ['#ffcdb2', '#e5989b', '#6d6875'] },
  { name: 'Steel', stops: ['#0f172a', '#334155', '#94a3b8'] },
  { name: 'Aurora', stops: ['#00c9a7', '#4d8076', '#845ec2', '#d65db1'] },
]

const makeStops = (colors: string[]): Stop[] => colors.map((c, i) => ({ id: uid(), color: c, pos: colors.length === 1 ? 0 : (i / (colors.length - 1)) * 100 }))

export default function GradientPage() {
  const { state } = useGenerator()
  const [g, setG] = useState<Gradient>(() => ({ type: 'linear', angle: 90, space: 'oklab', shape: 'circle', cx: 50, cy: 50, stops: makeStops(PRESETS[0].stops) }))
  const [selected, setSelected] = useState(g.stops[0].id)
  const [steps, setSteps] = useState(5)
  const barRef = useRef<HTMLDivElement>(null)
  const sel = g.stops.find((s) => s.id === selected) ?? g.stops[0]
  const set = (patch: Partial<Gradient>) => setG((x) => ({ ...x, ...patch }))
  const setStop = (id: string, patch: Partial<Stop>) => setG((x) => ({ ...x, stops: x.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  const code = gradientCode(g)
  const [presetName, setPresetName] = useState('Section Gradient')
  const radialFrom = g.cy < 34 ? (g.cx < 34 ? 'top left' : g.cx > 66 ? 'top right' : 'top center') : g.cy > 66 ? (g.cx < 34 ? 'bottom left' : g.cx > 66 ? 'bottom right' : 'bottom center') : g.cx < 34 ? 'center left' : g.cx > 66 ? 'center right' : 'center'
  const diviPreset = () => {
    const sortedStops = [...g.stops].sort((a, b) => a.pos - b.pos)
    // Divi blends in sRGB: sample the perceptual blend every 10% so it looks the same
    const stops = g.space === 'srgb' ? sortedStops.map((st) => ({ color: st.color, pos: st.pos })) : Array.from({ length: 11 }, (_, i) => ({ color: sampleGradient(g.stops, i * 10, g.space), pos: i * 10 }))
    return gradientPresetFile(presetName.trim() || 'Section Gradient', diviGradient(stops, g.type === 'radial' ? 'circular' : 'linear', g.type === 'radial' ? radialFrom : `${g.angle}deg`))
  }
  const palette = gradientPalette(g, steps)
  const barBg = `linear-gradient(90deg${g.space !== 'srgb' ? ` in ${g.space}` : ''}, ${[...g.stops]
    .sort((a, b) => a.pos - b.pos)
    .map((s) => `${s.color} ${s.pos}%`)
    .join(', ')})`

  const posFromEvent = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect()
    return Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
  }

  const dragStop = (id: string) => (e: React.PointerEvent) => {
    e.stopPropagation()
    setSelected(id)
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => setStop(id, { pos: posFromEvent(ev.clientX) })
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const addStopAt = (pos: number) => {
    const s = { id: uid(), color: sampleGradient(g.stops, pos, g.space), pos }
    setG((x) => ({ ...x, stops: [...x.stops, s] }))
    setSelected(s.id)
  }

  return (
    <div className="page gradient-page">
      <header className="page-head row space-between wrap">
        <div>
          <h1>Gradient maker</h1>
          <p className="muted">Build linear, radial and conic gradients. Perceptual blending (OKLab/OKLCH) avoids the muddy grey middle you get with plain sRGB.</p>
        </div>
        <Link className="btn" to="/mesh">
          Mesh gradients <Icon name="external" size={14} />
        </Link>
      </header>

      <div className="gradient-preview" style={{ background: gradientCss(g) }} />

      <div className="gradient-layout">
        <div className="stack">
          <div className="field">
            <span className="field-label">Colour stops: drag to move, click the bar to add</span>
            <div
              className="stop-bar"
              ref={barRef}
              style={{ background: barBg }}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) addStopAt(posFromEvent(e.clientX))
              }}
            >
              {g.stops.map((s) => (
                <button
                  key={s.id}
                  className={`stop-handle ${s.id === sel.id ? 'on' : ''}`}
                  style={{ left: `${s.pos}%`, background: s.color }}
                  onPointerDown={dragStop(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') setStop(s.id, { pos: Math.max(0, s.pos - 1) })
                    if (e.key === 'ArrowRight') setStop(s.id, { pos: Math.min(100, s.pos + 1) })
                  }}
                  aria-label={`Stop ${s.color} at ${s.pos}%`}
                />
              ))}
            </div>
          </div>

          <div className="row wrap">
            <Segmented
              label="Gradient type"
              value={g.type}
              onChange={(type: GradientType) => set({ type })}
              options={[
                { id: 'linear', label: 'Linear' },
                { id: 'radial', label: 'Radial' },
                { id: 'conic', label: 'Conic' },
              ]}
            />
            <Segmented
              label="Blending"
              value={g.space}
              onChange={(space: GradientSpace) => set({ space })}
              options={[
                { id: 'oklab', label: 'OKLab' },
                { id: 'oklch', label: 'OKLCH' },
                { id: 'srgb', label: 'sRGB' },
              ]}
            />
          </div>

          {g.type !== 'radial' && (
            <label className="slider">
              <span className="row space-between">
                <span>Angle</span>
                <span className="muted">{g.angle}°</span>
              </span>
              <input type="range" min={0} max={360} value={g.angle} onChange={(e) => set({ angle: Number(e.target.value) })} />
            </label>
          )}
          {g.type !== 'linear' && (
            <div className="row wrap">
              {g.type === 'radial' && (
                <Segmented
                  label="Shape"
                  value={g.shape}
                  onChange={(shape: 'circle' | 'ellipse') => set({ shape })}
                  options={[
                    { id: 'circle', label: 'Circle' },
                    { id: 'ellipse', label: 'Ellipse' },
                  ]}
                />
              )}
              <label className="slider grow">
                <span className="row space-between">
                  <span>Centre X</span>
                  <span className="muted">{g.cx}%</span>
                </span>
                <input type="range" min={0} max={100} value={g.cx} onChange={(e) => set({ cx: Number(e.target.value) })} />
              </label>
              <label className="slider grow">
                <span className="row space-between">
                  <span>Centre Y</span>
                  <span className="muted">{g.cy}%</span>
                </span>
                <input type="range" min={0} max={100} value={g.cy} onChange={(e) => set({ cy: Number(e.target.value) })} />
              </label>
            </div>
          )}

          <div className="field">
            <span className="field-label">Start from</span>
            <div className="preset-grid">
              <button className="preset" onClick={() => {
                const st = makeStops(state.present.map((s) => s.hex))
                setG((x) => ({ ...x, stops: st }))
                setSelected(st[0].id)
              }}>
                <MiniPalette hexes={state.present.map((s) => s.hex)} />
                <span>Current palette</span>
              </button>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="preset"
                  onClick={() => {
                    const st = makeStops(p.stops)
                    setG((x) => ({ ...x, stops: st }))
                    setSelected(st[0].id)
                  }}
                >
                  <span className="preset-swatch" style={{ background: `linear-gradient(90deg in oklab, ${p.stops.join(', ')})` }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="stack gradient-side">
          <div className="row space-between">
            <h3 style={{ margin: 0 }}>Selected stop</h3>
            <div className="row">
              <label className="stop-pos">
                <input type="number" min={0} max={100} value={sel.pos} onChange={(e) => setStop(sel.id, { pos: Math.min(100, Math.max(0, Number(e.target.value))) })} aria-label="Stop position" />%
              </label>
              <button
                className="icon-btn danger"
                disabled={g.stops.length <= 2}
                onClick={() => {
                  setG((x) => ({ ...x, stops: x.stops.filter((s) => s.id !== sel.id) }))
                  setSelected(g.stops.find((s) => s.id !== sel.id)!.id)
                }}
                title="Remove stop"
                aria-label="Remove stop"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
          <ColorField value={sel.color} onChange={(color) => setStop(sel.id, { color })} />
        </aside>
      </div>

      <section>
        <h2>CSS</h2>
        <CodeBlock code={code.css} label="CSS" />
        <p className="muted small">
          {g.space !== 'srgb'
            ? 'The first line is a fallback for older browsers (the perceptual blend approximated with extra sRGB stops); modern browsers use the second.'
            : 'Plain sRGB blending works in every browser.'}
        </p>
        <CodeBlock code={`bg-[${code.modern.replace(/\s+/g, '_')}]`} label="Tailwind class" />
      </section>

      <section>
        <h2>Divi 5 section preset</h2>
        {g.type === 'conic' ? (
          <p className="muted small">Divi's gradient backgrounds are linear or radial. Switch the type to use this gradient as a Divi preset.</p>
        ) : (
          <>
            <div className="row wrap">
              <label className="field">
                <span className="field-label">Preset name</span>
                <input value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              </label>
              <button className="btn btn-primary" type="button" onClick={() => downloadText(JSON.stringify(diviPreset(), null, 1), `${presetName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'gradient'}-divi5-preset.json`, 'application/json')}>
                <Icon name="download" size={16} /> Download Divi preset
              </button>
            </div>
            <p className="muted small">
              Import it in Divi like a presets export, then pick “{presetName}” in a section's preset menu.{' '}
              {g.space !== 'srgb' ? 'Divi blends in plain sRGB, so in-between stops are added to keep this smoother blend.' : ''} Radial gradients start at the {radialFrom}.
            </p>
          </>
        )}
      </section>

      <section>
        <div className="row space-between wrap">
          <h2>Palette from this gradient</h2>
          <label className="slider" style={{ minWidth: 200 }}>
            <span className="row space-between">
              <span>Steps</span>
              <span className="muted">{steps}</span>
            </span>
            <input type="range" min={3} max={10} value={steps} onChange={(e) => setSteps(Number(e.target.value))} />
          </label>
        </div>
        <div className="swatch-row tall">
          {palette.map((h, i) => (
            <Link key={i} to={`/color/${h.slice(1)}`} className="swatch-cell show" style={{ background: h, color: readableOn(h) }}>
              <span>{h.slice(1).toUpperCase()}</span>
            </Link>
          ))}
        </div>
        <div className="row">
          <Link className="btn btn-primary" to={`/generate/${paletteSlug(palette)}`}>
            <Icon name="wand" size={16} /> Open in generator
          </Link>
        </div>
      </section>
    </div>
  )
}
