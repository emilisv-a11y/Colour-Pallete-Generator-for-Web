import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useDesignSystem } from '../components/system/useDesignSystem'
import { CodeBlock, Segmented, useToast } from '../components/ui'
import { canvasBlob, drawIcon, drawSocial, iconTags, iconZip, initials, SOCIAL_SIZES, type IconShape, type IconSpec, type SocialSpec, type SocialTemplate } from '../lib/brandAssets'
import { contrastRatio } from '../lib/color'
import { downloadBlob } from '../lib/exports'
import { fontStack, loadFonts } from '../lib/fonts'
import { safeSvg } from '../lib/logo'
import { buildScales, buildTokens, type DesignSystem } from '../lib/system'

type Img = HTMLImageElement
type Logo = { img: Img; svg?: string; name: string }

/** SVGs without width/height draw at 0×0 or 150×150 on a canvas: give them a size from the viewBox. */
function sizedSvg(svg: string) {
  const vb = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/)
  if (!vb) return svg
  const [w, h] = [Number(vb[1]), Number(vb[2])]
  const scale = 1000 / Math.max(w, h)
  return svg.replace(/<svg\b([^>]*)>/, (_m, attrs: string) => `<svg${attrs.replace(/\s(width|height)\s*=\s*["'][^"']*["']/g, '')} width="${Math.round(w * scale)}" height="${Math.round(h * scale)}">`)
}

function loadImg(src: string): Promise<Img> {
  return new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => rej(new Error('Could not open that image'))
    i.src = src
  })
}

async function waitFonts(sys: DesignSystem) {
  loadFonts([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)
  try {
    await Promise.all([document.fonts.load(`700 40px "${sys.fonts.heading}"`), document.fonts.load(`400 40px "${sys.fonts.body}"`), document.fonts.load(`600 40px "${sys.fonts.body}"`)])
  } catch {
    /* fall back to system fonts */
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand'

/* ---------- Icons ---------- */

function IconsTab({ sys, logo }: { sys: DesignSystem; logo: Logo | null }) {
  const toast = useToast()
  const t = buildTokens(sys, 'light')
  const sc = buildScales(sys)
  const choices = [
    { label: 'Brand', bg: t.primary.hex, fg: t['on-primary'].hex },
    { label: 'Secondary', bg: t.secondary.hex, fg: t['on-secondary'].hex },
    { label: 'Dark', bg: sc.neutral[9], fg: sc.neutral[0] },
    { label: 'Light', bg: sc.neutral[0], fg: t['primary-text'].hex },
    { label: 'No background', bg: '', fg: t['primary-text'].hex },
  ]
  const [spec, setSpec] = useState<IconSpec>(() => ({ source: logo ? 'logo' : 'monogram', text: initials(sys.name), font: fontStack(sys.fonts.heading, sys.fonts.meta), weight: 700, bg: choices[0].bg, fg: choices[0].fg, shape: 'rounded', padding: 0.16 }))
  const s = { ...spec, source: logo ? spec.source : 'monogram' } as IconSpec
  const [ready, setReady] = useState(0)
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({})
  const sizes = [{ id: 'tab', px: 16 }, { id: 'f32', px: 32 }, { id: 'apple', px: 180 }, { id: 'android', px: 192 }, { id: 'maskable', px: 192 }]

  useEffect(() => {
    waitFonts(sys).then(() => setReady((r) => r + 1))
  }, [sys.fonts.heading, sys.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const z of sizes) {
      const c = refs.current[z.id]
      if (!c) continue
      const scale = 2
      c.width = c.height = z.px * scale
      const ctx = c.getContext('2d')!
      drawIcon(ctx, z.px * scale, z.id === 'apple' ? { ...s, bg: s.bg || '#ffffff', shape: 'square' } : s, logo?.img, z.id === 'maskable')
    }
  }) // redraw on every render: cheap, and keeps fonts/logo in sync

  const fgContrast = s.bg ? contrastRatio(s.fg, s.bg) : null
  const readme = `${sys.name}: favicon and app icons (made with D5 WebTool)

1. Upload every file in this folder to the root of the website (next to wp-config.php), e.g. with Hostinger File Manager.
2. Divi → Theme Options → Integration → "Add code to the <head>": paste the lines from html-tags.txt.
   (Or simpler, WordPress only: Appearance → Customize → Site Identity → Site Icon, and upload icon-512.png.)
3. Open the site in a private window to check the browser tab icon; browsers cache favicons for a while.
`
  return (
    <div className="stack">
      <div className="ba-layout">
        <div className="stack ba-controls">
          {logo && (
            <div className="field">
              <span className="field-label">Icon from</span>
              <Segmented
                label="Icon from"
                value={s.source}
                onChange={(source) => setSpec((x) => ({ ...x, source }))}
                options={[
                  { id: 'logo', label: 'Logo' },
                  { id: 'monogram', label: 'Initials' },
                ]}
              />
            </div>
          )}
          {s.source === 'monogram' && (
            <div className="row wrap">
              <label className="field">
                <span className="field-label">Letters</span>
                <input value={s.text} maxLength={3} onChange={(e) => setSpec((x) => ({ ...x, text: e.target.value }))} style={{ width: 90 }} />
              </label>
              <label className="field">
                <span className="field-label">Font</span>
                <select value={s.font} onChange={(e) => setSpec((x) => ({ ...x, font: e.target.value }))}>
                  <option value={fontStack(sys.fonts.heading, sys.fonts.meta)}>{sys.fonts.heading} (headings)</option>
                  <option value={fontStack(sys.fonts.body, sys.fonts.meta)}>{sys.fonts.body} (body)</option>
                </select>
              </label>
            </div>
          )}
          <div className="field">
            <span className="field-label">Colours</span>
            <div className="row wrap">
              {choices.map((c) => (
                <button key={c.label} type="button" className={`ba-choice ${s.bg === c.bg && s.fg === c.fg ? 'on' : ''}`} onClick={() => setSpec((x) => ({ ...x, bg: c.bg, fg: c.fg }))}>
                  <span className="ba-chip" style={{ background: c.bg || 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 10px 10px', color: c.fg }}>
                    A
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Shape</span>
            <Segmented
              label="Shape"
              value={s.shape}
              onChange={(shape: IconShape) => setSpec((x) => ({ ...x, shape }))}
              options={[
                { id: 'square', label: 'Square' },
                { id: 'rounded', label: 'Rounded' },
                { id: 'circle', label: 'Circle' },
              ]}
            />
          </div>
          <label className="field">
            <span className="field-label">Padding {Math.round(s.padding * 100)}%</span>
            <input type="range" min={0} max={0.35} step={0.01} value={s.padding} onChange={(e) => setSpec((x) => ({ ...x, padding: Number(e.target.value) }))} />
          </label>
          {fgContrast !== null && s.source === 'monogram' && fgContrast < 3 && <div className="form-error">The letters have low contrast ({fgContrast.toFixed(1)}:1) on this background.</div>}
        </div>
        <div className="ba-previews" data-ready={ready}>
          <div className="ba-tab">
            <canvas ref={(el) => void (refs.current.tab = el)} style={{ width: 16, height: 16 }} />
            <span>{sys.name}</span>
            <span className="muted">×</span>
          </div>
          <div className="row wrap" style={{ alignItems: 'flex-end', gap: 22 }}>
            {[
              ['f32', 32, 'Favicon 32'],
              ['apple', 90, 'iPhone home screen'],
              ['android', 96, 'Android / installed'],
              ['maskable', 96, 'Android adaptive'],
            ].map(([id, px, label]) => (
              <figure key={id as string} className="ba-icon-fig">
                <canvas ref={(el) => void (refs.current[id as string] = el)} style={{ width: px as number, height: px as number, borderRadius: id === 'apple' ? 20 : id === 'maskable' ? '50%' : 0 }} />
                <figcaption className="muted small">{label as string}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      <div className="row wrap">
        <button
          className="btn btn-primary"
          type="button"
          onClick={async () => {
            await waitFonts(sys)
            const zip = await iconZip(s, { name: sys.name, themeColor: t.primary.hex, bgColor: t.bg.hex, img: s.source === 'logo' ? logo?.img : undefined, logoSvg: logo?.svg, readme })
            downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), `${slug(sys.name)}-icons.zip`)
            toast('Icon set downloaded')
          }}
        >
          <Icon name="download" size={16} /> Download icon set (ZIP)
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        favicon.ico (16, 32, 48), PNGs for iPhone (180) and Android (192, 512, adaptive){logo?.svg && s.source === 'logo' ? ', favicon.svg' : ''}, a web manifest and the HTML lines below. Quickest in WordPress: Appearance → Customize → Site Identity → Site Icon (upload icon-512.png).
      </p>
      <CodeBlock code={iconTags(t.primary.hex, s.source === 'logo' && !!logo?.svg)} label="HTML" />
    </div>
  )
}

/* ---------- Social image ---------- */

function SocialTab({ sys, logo }: { sys: DesignSystem; logo: Logo | null }) {
  const toast = useToast()
  const t = buildTokens(sys, 'light')
  const sc = buildScales(sys)
  const [template, setTemplate] = useState<SocialTemplate>('split')
  const [title, setTitle] = useState(sys.name)
  const [subtitle, setSubtitle] = useState('A short line about what you do')
  const [site, setSite] = useState('www.example.com')
  const [useLogo, setUseLogo] = useState(true)
  const [ready, setReady] = useState(0)
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({})
  const spec: SocialSpec = useMemo(
    () => ({
      template,
      title,
      subtitle,
      site,
      colors: { primary: t.primary.hex, onPrimary: t['on-primary'].hex, secondary: t.secondary.hex, accent: t.accent.hex, bg: t.bg.hex, text: t.text.hex, muted: t['text-muted'].hex, dark: sc.neutral[9], onDark: sc.neutral[0], subtle: t['primary-subtle'].hex },
      fonts: { heading: fontStack(sys.fonts.heading, sys.fonts.meta), body: fontStack(sys.fonts.body, sys.fonts.meta) },
      radius: sys.radius,
    }),
    [template, title, subtitle, site, sys, t, sc],
  )
  useEffect(() => {
    waitFonts(sys).then(() => setReady((r) => r + 1))
  }, [sys.fonts.heading, sys.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    for (const z of SOCIAL_SIZES) {
      const c = refs.current[z.id]
      if (!c) continue
      c.width = z.w
      c.height = z.h
      drawSocial(c.getContext('2d')!, z.w, z.h, spec, useLogo ? logo?.img : undefined)
    }
  }, [spec, logo, useLogo, ready])

  const download = async (id: string, type: 'png' | 'jpg') => {
    await waitFonts(sys)
    const z = SOCIAL_SIZES.find((x) => x.id === id)!
    const c = document.createElement('canvas')
    c.width = z.w
    c.height = z.h
    drawSocial(c.getContext('2d')!, z.w, z.h, spec, useLogo ? logo?.img : undefined)
    downloadBlob(await canvasBlob(c, type === 'png' ? 'image/png' : 'image/jpeg', 0.9), `${slug(sys.name)}-${id}.${type}`)
    toast('Image downloaded')
  }

  return (
    <div className="stack">
      <div className="ba-layout">
        <div className="stack ba-controls">
          <div className="field">
            <span className="field-label">Style</span>
            <Segmented
              label="Style"
              value={template}
              onChange={setTemplate}
              options={[
                { id: 'split', label: 'Brand' },
                { id: 'centered', label: 'Gradient' },
                { id: 'card', label: 'Card' },
                { id: 'bold', label: 'Bold dark' },
              ]}
            />
          </div>
          <label className="field">
            <span className="field-label">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Subtitle</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Website</span>
            <input value={site} onChange={(e) => setSite(e.target.value)} />
          </label>
          {logo && (
            <label className="divi-check">
              <input type="checkbox" checked={useLogo} onChange={(e) => setUseLogo(e.target.checked)} /> Show the logo
            </label>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            Text sizes adjust to fit. Lithuanian letters work if the fonts include Latin Extended (the font library shows this).
          </p>
        </div>
        <div className="stack ba-social" data-ready={ready}>
          {SOCIAL_SIZES.map((z) => (
            <figure key={z.id} className="ba-social-fig">
              <canvas ref={(el) => void (refs.current[z.id] = el)} style={{ aspectRatio: `${z.w} / ${z.h}` }} />
              <figcaption className="row wrap space-between">
                <span className="small">
                  <strong>{z.label}</strong> <span className="muted">· {z.note}</span>
                </span>
                <span className="row">
                  <button className="btn btn-small" type="button" onClick={() => download(z.id, 'png')}>
                    <Icon name="download" size={14} /> PNG
                  </button>
                  <button className="btn btn-small" type="button" onClick={() => download(z.id, 'jpg')}>
                    <Icon name="download" size={14} /> JPG
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Use the 1200 × 630 image as the default social image in your SEO plugin (Yoast: SEO → Social; Rank Math: Titles &amp; Meta → Global → OpenGraph Thumbnail), so shared links show your brand instead of a random picture.
      </p>
    </div>
  )
}

/* ---------- Page ---------- */

type Tab = 'icons' | 'social'

export default function BrandAssetsPage() {
  const { sys } = useDesignSystem()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<Tab>('icons')
  const [logo, setLogo] = useState<Logo | null>(null)

  const load = async (f: File) => {
    try {
      if (/svg/.test(f.type) || f.name.toLowerCase().endsWith('.svg')) {
        const svg = safeSvg(await f.text())
        if (!/<svg[\s>]/i.test(svg)) return toast('That file is not an SVG')
        const img = await loadImg(URL.createObjectURL(new Blob([sizedSvg(svg)], { type: 'image/svg+xml' })))
        setLogo({ img, svg, name: f.name })
      } else setLogo({ img: await loadImg(URL.createObjectURL(f)), name: f.name })
    } catch (e) {
      toast((e as Error).message)
    }
  }

  return (
    <div className="page brand-assets-page">
      <header className="page-head">
        <h1>Brand assets</h1>
        <p className="muted">Favicon, app icons and social share images in your brand colours and fonts, ready to upload.</p>
      </header>
      {!sys ? (
        <div className="system-empty">
          <p>Create a design system first: the assets use its colours and fonts.</p>
          <Link className="btn btn-primary" to="/system">
            Go to Design system
          </Link>
        </div>
      ) : (
        <>
          <div className="row wrap">
            <Segmented
              label="Asset"
              value={tab}
              onChange={setTab}
              options={[
                { id: 'icons', label: 'Favicon & app icons' },
                { id: 'social', label: 'Social share image' },
              ]}
            />
            <button className="btn" type="button" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={16} /> {logo ? `Logo: ${logo.name}` : 'Add logo (SVG or PNG)'}
            </button>
            {logo && (
              <button className="btn btn-small" type="button" onClick={() => setLogo(null)}>
                Remove logo
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) load(f)
              }}
            />
          </div>
          {tab === 'icons' ? <IconsTab key={logo?.name ?? 'none'} sys={sys} logo={logo} /> : <SocialTab sys={sys} logo={logo} />}
        </>
      )}
    </div>
  )
}
