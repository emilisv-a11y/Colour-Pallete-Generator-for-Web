import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useDesignSystem } from '../components/system/useDesignSystem'
import { ColorField, useToast } from '../components/ui'
import { downloadBlob, downloadText } from '../lib/exports'
import { bitmapColors, monoBitmap, monoSvg, recolorSvg, safeSvg, svgColors, svgIssues, svgToPng, visibility } from '../lib/logo'
import { buildScales, buildTokens } from '../lib/system'

type Logo = { kind: 'svg'; name: string; svg: string } | { kind: 'bitmap'; name: string; url: string; data: ImageData; transparent: boolean; colors: string[] }

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 64"><circle cx="32" cy="32" r="26" fill="#2457e6"/><path d="M20 34l8 8 16-18" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path fill="#1b1f2a" d="M76 20h12c9 0 15 5 15 12s-6 12-15 12H76V20zm7 6v12h5c5 0 8-2 8-6s-3-6-8-6h-5zm28-6h7v24h-7zm16 0h7v18h12v6h-19z"/></svg>`

function slug(s: string) {
  return s.replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'logo'
}

function bitmapUrl(d: ImageData) {
  const c = document.createElement('canvas')
  c.width = d.width
  c.height = d.height
  c.getContext('2d')!.putImageData(d, 0, 0)
  return c.toDataURL('image/png')
}

export default function LogoPage() {
  const { sys } = useDesignSystem()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [logo, setLogo] = useState<Logo | null>(null)
  const [map, setMap] = useState<Record<string, string>>({})
  const [custom, setCustom] = useState('#f4f1ea')
  const [editing, setEditing] = useState<string | null>(null)

  const light = sys ? buildTokens(sys, 'light') : null
  const dark = sys ? buildTokens(sys, 'dark') : null
  const scales = sys ? buildScales(sys) : null
  const backgrounds = useMemo(() => {
    const list: { label: string; bg: string }[] = [
      { label: 'Light', bg: light?.bg.hex ?? '#ffffff' },
      { label: 'Surface', bg: light?.surface.hex ?? '#f4f4f5' },
      { label: 'Dark', bg: dark?.bg.hex ?? '#111318' },
    ]
    if (light && scales) {
      list.push({ label: 'Brand', bg: light.primary.hex }, { label: 'Secondary', bg: light.secondary.hex }, { label: 'Deep brand', bg: scales.primary[9] })
    }
    list.push({ label: 'Your colour', bg: custom })
    return list
  }, [light, dark, scales, custom])

  const svg = logo?.kind === 'svg' ? safeSvg(logo.svg) : ''
  const colors = logo?.kind === 'svg' ? svgColors(svg) : []
  const colorHexes = logo?.kind === 'svg' ? colors.map((c) => c.hex) : logo?.colors ?? []
  const edited = logo?.kind === 'svg' && Object.keys(map).length ? recolorSvg(svg, map) : svg
  const issues = logo?.kind === 'svg' ? svgIssues(logo.svg) : []

  const variants = useMemo(() => {
    if (!logo) return []
    const textC = light?.text.hex ?? '#111111'
    const list: { id: string; label: string; color?: string; bg: string; note: string }[] = [
      { id: 'original', label: 'Original', bg: light?.bg.hex ?? '#ffffff', note: 'As uploaded' + (Object.keys(map).length ? ', with your colour changes' : '') },
      { id: 'dark', label: 'One colour, dark', color: textC, bg: light?.bg.hex ?? '#ffffff', note: 'For light backgrounds, faxes, stamps' },
      { id: 'white', label: 'White', color: '#ffffff', bg: scales?.primary[9] ?? '#1b1f2a', note: 'For dark and photo backgrounds' },
      { id: 'black', label: 'Black', color: '#000000', bg: '#ffffff', note: 'For print in one colour' },
    ]
    if (light) {
      list.push({ id: 'brand', label: 'Brand colour', color: light['primary-text'].hex, bg: light.bg.hex, note: 'One colour in your brand' })
      list.push({ id: 'on-brand', label: 'On brand background', color: light['on-primary'].hex, bg: light.primary.hex, note: 'For brand-coloured sections and social posts' })
    }
    return list
  }, [logo, light, scales, map])

  const variantSvg = (v: { id: string; color?: string; bg?: string }) => (v.color ? monoSvg(edited, v.color, v.bg) : edited)
  const variantBitmap = (v: { color?: string }) => (logo?.kind === 'bitmap' ? (v.color ? bitmapUrl(monoBitmap(logo.data, v.color)) : logo.url) : '')

  const load = async (f: File) => {
    setMap({})
    if (/svg/.test(f.type) || f.name.toLowerCase().endsWith('.svg')) {
      const text = await f.text()
      if (!/<svg[\s>]/i.test(text)) return toast('That file is not an SVG')
      setLogo({ kind: 'svg', name: f.name, svg: text })
      return
    }
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(img.naturalWidth * scale))
      c.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, c.width, c.height)
      const data = ctx.getImageData(0, 0, c.width, c.height)
      const info = bitmapColors(data)
      setLogo({ kind: 'bitmap', name: f.name, url: c.toDataURL('image/png'), data, ...info })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => toast('Could not open that image')
    img.src = url
  }

  const download = async (v: { id: string; label: string; color?: string; bg?: string }, type: 'svg' | 'png') => {
    if (!logo) return
    const name = `${slug(logo.name)}-${v.id}`
    if (logo.kind === 'svg') {
      const s = variantSvg(v)
      if (type === 'svg') downloadText(s, `${name}.svg`, 'image/svg+xml')
      else downloadBlob(await svgToPng(s, 1200), `${name}.png`)
    } else {
      const res = await fetch(variantBitmap(v))
      downloadBlob(await res.blob(), `${name}.png`)
    }
  }

  const Mark = ({ v, size = 'md' }: { v: { id: string; color?: string; bg?: string }; size?: 'md' | 'lg' }) =>
    logo?.kind === 'svg' ? (
      <span className={`logo-mark ${size}`} dangerouslySetInnerHTML={{ __html: variantSvg(v) }} />
    ) : logo ? (
      <img className={`logo-mark ${size}`} src={variantBitmap(v)} alt="" />
    ) : null

  return (
    <div className="page logo-page">
      <header className="page-head">
        <h1>Logo checker</h1>
        <p className="muted">Upload a logo to see it on your brand's backgrounds, check how clearly it stands out, and download recoloured versions. SVG works best; PNG with a transparent background works too.</p>
      </header>

      <div className="row wrap">
        <button className="btn btn-primary" type="button" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={16} /> {logo ? 'Upload another logo' : 'Upload logo (SVG or PNG)'}
        </button>
        <button className="btn" type="button" onClick={() => (setMap({}), setLogo({ kind: 'svg', name: 'sample-logo.svg', svg: SAMPLE }))}>
          Try a sample logo
        </button>
        {!sys && (
          <span className="muted small">
            Tip: <Link to="/system">create a design system</Link> to check against your brand colours.
          </span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml,image/png,image/webp,image/jpeg"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) load(f)
        }}
      />

      {logo && (
        <>
          <section className="logo-section">
            <h2>On your backgrounds</h2>
            <div className="logo-bgs">
              {backgrounds.map((b) => {
                const vis = visibility(colorHexes, b.bg)
                return (
                  <figure key={b.label} className="logo-bg" style={{ background: b.bg }}>
                    <Mark v={{ id: 'original' }} />
                    <figcaption>
                      <span>{b.label}</span>
                      <span className={`logo-vis ${vis.level}`} title={`Best: ${vis.best.toUpperCase()} ${vis.ratio.toFixed(1)}:1 · weakest: ${vis.worst.toUpperCase()} ${vis.worstRatio.toFixed(1)}:1`}>
                        {vis.level === 'clear' ? `✓ Clear · ${vis.ratio.toFixed(1)}:1` : vis.level === 'part' ? (
                          <>
                            ! Part fades <i className="logo-vis-chip" style={{ background: vis.worst }} /> {vis.worstRatio.toFixed(1)}:1
                          </>
                        ) : vis.level === 'weak' ? `! Weak · ${vis.ratio.toFixed(1)}:1` : `✕ Hard to see · ${vis.ratio.toFixed(1)}:1`}
                      </span>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
            <div className="row wrap">
              <label className="field logo-custom">
                <span className="field-label">Your colour</span>
                <input type="color" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Custom background colour" />
              </label>
              <p className="muted small" style={{ margin: 0, flex: 1, minWidth: 220 }}>
                Aim for 3:1 or more between the logo and the background (the WCAG guide for graphics). “Part fades” means one of the logo's colours (shown) nearly disappears, like dark text on a dark background: use the white or one-colour version there. Logos are legally exempt, but a logo that disappears isn't doing its job.
              </p>
            </div>
          </section>

          {logo.kind === 'svg' && (
            <section className="logo-section">
              <h2>Colours in this logo</h2>
              <ul className="logo-colors">
                {colors.map((c) => {
                  const now = map[c.hex] ?? c.hex
                  return (
                    <li key={c.hex}>
                      <button type="button" className="logo-swatch" style={{ background: now }} onClick={() => setEditing(editing === c.hex ? null : c.hex)} aria-label={`Change ${c.hex}`} />
                      <span>
                        <code>{c.hex.toUpperCase()}</code>
                        {now !== c.hex && <span className="muted small"> → {now.toUpperCase()}</span>}
                        {c.implicit && <span className="muted small"> (default black for shapes without a colour)</span>}
                      </span>
                      {sys && light && (
                        <span className="row logo-quick">
                          {[light.primary.hex, light.secondary.hex, light.accent.hex, light.text.hex, '#ffffff'].map((h) => (
                            <button key={h} type="button" className="logo-dot" style={{ background: h }} title={`Use ${h.toUpperCase()}`} onClick={() => setMap((m) => ({ ...m, [c.hex]: h }))} />
                          ))}
                        </span>
                      )}
                      {editing === c.hex && (
                        <div className="logo-picker">
                          <ColorField value={now} onChange={(h) => setMap((m) => ({ ...m, [c.hex]: h }))} />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {Object.keys(map).length > 0 && (
                <button className="btn btn-small" type="button" onClick={() => setMap({})}>
                  Undo colour changes
                </button>
              )}
              {issues.length > 0 && (
                <ul className="rt-notes">
                  {issues.map((t) => (
                    <li key={t} className="warn">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="logo-section">
            <h2>Versions to download</h2>
            {logo.kind === 'bitmap' && !logo.transparent && <p className="form-error">This image has no transparent background, so one-colour versions become solid blocks. Export the logo as SVG, or PNG with transparency.</p>}
            <div className="logo-variants">
              {variants.map((v) => (
                <article key={v.id} className="logo-variant">
                  <div className="logo-variant-stage" style={{ background: v.bg }}>
                    <Mark v={v} size="lg" />
                  </div>
                  <div className="logo-variant-body">
                    <strong>{v.label}</strong>
                    <span className="muted small">{v.note}</span>
                    <div className="row wrap">
                      {logo.kind === 'svg' && (
                        <button className="btn btn-small" type="button" onClick={() => download(v, 'svg')}>
                          <Icon name="download" size={14} /> SVG
                        </button>
                      )}
                      <button className="btn btn-small" type="button" onClick={() => download(v, 'png')}>
                        <Icon name="download" size={14} /> PNG
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="muted small">In one-colour versions, white details (like a tick inside a circle) take that version's background colour so they stay visible. In Divi, put the dark version in the header and the white one in the footer or on dark sections. With the dark-mode toggle (Divi 5 → Dark mode), give the normal logo the class <code>d5-hide-dark</code> and the white one <code>d5-show-dark</code>.</p>
          </section>
        </>
      )}
    </div>
  )
}
