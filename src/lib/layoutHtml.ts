/* ============================================================================
   Realistic preview of layout sections as a small web page (shown in an iframe):
   the design system's CSS (tokens, fluid type, shape & motion, Divi helper
   classes) + the same section specs as the Divi files. Because it runs in its own
   frame, clamp()/vw sizes, hover states, dark mode and phone stacking behave
   like the real site.
   ========================================================================== */

import { diviCss } from './divi'
import { brandButtonVariant, colFraction, LAYOUTS, type ButtonItem, type Col, type Item, type SectionKind, type SectionSpec } from './diviLayouts'
import { googleFontsUrl } from './fonts'
import { buildScales, type DesignSystem, type Mode } from './system'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Section backgrounds and text as CSS variables, so dark mode switches them too. */
const SECTION_VARS: Record<SectionKind, string> = {
  light: 'background: var(--bg); --h: var(--text); --t: var(--text-muted); --a: var(--primary-text);',
  surface: 'background: var(--surface); --h: var(--text); --t: var(--text-muted); --a: var(--primary-text);',
  subtle: 'background: var(--primary-subtle); --h: var(--on-primary-subtle); --t: var(--on-primary-subtle); --a: var(--on-primary-subtle);',
  brand: 'background: var(--primary); --h: var(--on-primary); --t: var(--on-primary); --a: var(--on-primary);',
  secondary: 'background: var(--secondary); --h: var(--on-secondary); --t: var(--on-secondary); --a: var(--on-secondary);',
  dark: 'background: var(--neutral-900); --h: var(--neutral-50); --t: var(--neutral-200); --a: var(--neutral-50);',
}

function previewCss(sys: DesignSystem): string {
  const sc = buildScales(sys)
  return `${diviCss(sys)}
/* ---------- preview page (mimics Divi's section / row / column structure) ---------- */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body { background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
h1, h2, h3, h4, h5, h6 { margin: 0 0 0.4em; font-weight: 700; color: var(--h); }
p { margin: 0 0 0.8em; }
.pv-sec { padding: var(--space-xl-3xl) var(--space-m); color: var(--t); }
${(Object.keys(SECTION_VARS) as SectionKind[]).map((k) => `.pv-sec-${k} { ${SECTION_VARS[k]} }`).join('\n')}
.pv-sec a { color: var(--a); }
.pv-row { display: grid; gap: var(--space-l); max-width: var(--width-container); margin: 0 auto; align-items: start; }
.pv-row + .pv-row { margin-top: var(--space-l); }
.pv-row.center { text-align: center; }
.pv-row.center .pv-btns { justify-content: center; }
.pv-col { min-width: 0; display: flex; flex-direction: column; }
.pv-col > * + * { margin-top: var(--space-xs); }
.pv-col.d5-card { padding: var(--space-m); background: var(--surface-raised); border: var(--border-thin) solid var(--border); border-radius: var(--radius); }
.pv-col.d5-tile { --h: inherit; --t: inherit; --a: inherit; }
.pv-col.d5-tile h1, .pv-col.d5-tile h2, .pv-col.d5-tile h3, .pv-col.d5-tile h4, .pv-col.d5-tile h5, .pv-col.d5-tile h6 { color: inherit; }
.pv-col.d5-card:not(.d5-tile) { --h: var(--text); --t: var(--text-muted); --a: var(--primary-text); color: var(--text-muted); }
.pv-muted { color: var(--t); opacity: 0.85; }
.pv-col.d5-card .pv-muted { color: var(--text-muted); opacity: 1; }
.pv-btns { display: flex; flex-wrap: wrap; gap: var(--space-xs); }
.pv-row.center .pv-col { align-items: center; }
.d5-btn { display: inline-flex; align-items: center; justify-content: center; min-height: var(--btn-m-height); padding: var(--btn-m-pad-y) var(--btn-m-pad-x); font: 600 var(--btn-m-font)/1.2 var(--font-body); border-radius: var(--radius); border: var(--border-base) solid transparent; text-decoration: none; cursor: pointer; }
.d5-btn-primary { background: var(--primary); color: var(--on-primary) !important; border-color: var(--primary); }
.d5-btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
.d5-btn-secondary { background: var(--secondary); color: var(--on-secondary) !important; border-color: var(--secondary); }
.d5-btn-secondary:hover { background: var(--secondary-hover); border-color: var(--secondary-hover); }
.d5-btn-outline { background: transparent; color: var(--primary-text) !important; border-color: var(--primary-text); }
.d5-btn-outline:hover { background: var(--primary-subtle); color: var(--on-primary-subtle) !important; }
.d5-btn-light { background: ${sc.neutral[0]}; color: var(--primary-text) !important; border-color: ${sc.neutral[0]}; }
.d5-btn-light:hover { background: var(--surface-raised); }
.ph { width: 100%; display: block; }
.d5-img .ph { transition: transform var(--duration-slow) var(--ease-standard); }
.d5-card:hover .d5-img .ph, .d5-img:hover .ph, .pv-shop > div:hover .ph { transform: scale(1.04); }
.d5-avatar .ph { width: 96px; height: 96px; border-radius: 50%; overflow: hidden; }
.pv-row.center .d5-avatar { align-self: center; }
.d5-logo .ph { aspect-ratio: auto !important; height: 40px; border: 2px dashed currentColor; border-radius: 8px; opacity: 0.45; }
.pv-acc details { border-bottom: var(--border-thin) solid var(--border); padding: var(--space-s) 0; text-align: left; }
.pv-acc summary { cursor: pointer; font-weight: 700; color: var(--h); }
.pv-video { position: relative; aspect-ratio: 16 / 9; border-radius: var(--radius); overflow: hidden; }
.pv-video::after { content: ''; position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform: translate(-30%, -50%); border-style: solid; border-width: 22px 0 22px 36px; border-color: transparent transparent transparent rgb(255 255 255 / 0.9); }
.pv-shop { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-m); text-align: left; }
.pv-shop .ph { aspect-ratio: 1; border-radius: var(--radius); }
.pv-shop h4 { margin: 0.6em 0 0.2em; font-size: var(--step-0); }
.pv-note { font-size: 0.8rem; opacity: 0.7; margin-top: var(--space-xs); }
.d5-table th, .d5-table td { color: inherit; }
@media (max-width: 980px) {
  .pv-row { grid-template-columns: minmax(0, 1fr) !important; }
  .pv-shop { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`
}

/** Gradient placeholder colours (same palette as the embedded pictures). */
function phBackground(sys: DesignSystem, i: number) {
  const sc = buildScales(sys)
  const pairs: [string, string][] = [
    [sc.primary[1], sc.secondary[2]],
    [sc.secondary[1], sc.accent[2]],
    [sc.accent[1], sc.primary[2]],
    [sc.neutral[1], sc.primary[1]],
  ]
  const [a, b] = pairs[i % pairs.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}

function sectionHtml(spec: SectionSpec, sys: DesignSystem): string {
  let img = 0
  const brandBtn = brandButtonVariant(sys)
  const item = (it: Item, onBrand: boolean): string => {
    switch (it.type) {
      case 'heading':
        return `<h${it.level}>${esc(it.text)}</h${it.level}>`
      case 'text':
        return `<div class="et_pb_text ${it.tone === 'muted' ? 'pv-muted' : ''} ${it.cls ?? ''}">${it.html}</div>`
      case 'button': {
        const v: ButtonItem['variant'] = onBrand && it.variant === 'light' ? brandBtn : it.variant
        return `<a class="et_pb_button d5-btn d5-btn-${v}" href="#">${esc(it.text)}</a>`
      }
      case 'image': {
        const cls = it.kind === 'avatar' ? 'd5-avatar' : it.kind === 'logo' ? 'd5-logo' : 'd5-img'
        const bg = it.kind === 'logo' ? 'transparent' : phBackground(sys, img++)
        return `<div class="${cls}"><div class="ph" role="img" aria-label="${esc(it.label ?? '')}" style="aspect-ratio:${it.ratio};background:${bg}"></div></div>`
      }
      case 'video':
        return `<div class="pv-video d5-video" style="background:${phBackground(sys, img++)}" title="Video"></div>`
      case 'shop':
        return `<div class="pv-shop">${['Linen shirt', 'Canvas tote', 'Ceramic mug', 'Wool scarf']
          .map((n, i) => `<div class="d5-img-wrap"><div class="d5-img"><div class="ph" role="img" aria-label="Product photo" style="background:${phBackground(sys, i)}"></div></div><h4>${n}</h4><div class="pv-muted"><strong>€${[49, 29, 18, 39][i]}</strong></div></div>`)
          .join('')}</div><div class="pv-note">Divi's Shop module shows your real WooCommerce products here.</div>`
      case 'accordion':
        return `<div class="pv-acc">${it.items.map((x, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(x.title)}</summary>${x.html}</details>`).join('')}</div>`
    }
  }
  const colHtml = (col: Col) => {
    const cls = col.tone ? `d5-card d5-tile d5-tile-${col.tone}` : col.card ? 'd5-card d5-lift' : ''
    const onBrand = col.tone === 'brand' || (!col.tone && !col.card && spec.kind === 'brand')
    // keep consecutive buttons on one line
    const parts: string[] = []
    let btns: string[] = []
    const flush = () => {
      if (btns.length) parts.push(`<div class="pv-btns">${btns.join('')}</div>`)
      btns = []
    }
    for (const it of col.items) {
      if (it.type === 'button') btns.push(item(it, onBrand))
      else {
        flush()
        parts.push(item(it, onBrand))
      }
    }
    flush()
    return `<div class="pv-col ${cls}">${parts.join('')}</div>`
  }
  return `<section class="pv-sec pv-sec-${spec.kind}" aria-label="${esc(spec.label)}">${spec.rows
    .map((r) => `<div class="pv-row ${r.align === 'center' ? 'center' : ''}" style="grid-template-columns:${r.cols.map((c) => `minmax(0, ${colFraction(c.width)}fr)`).join(' ')}">${r.cols.map(colHtml).join('')}</div>`)
    .join('')}</section>`
}

/** A complete HTML document for the preview iframe. */
export function layoutDocument(sys: DesignSystem, ids: string[], mode: Mode): string {
  const specs = ids.map((id) => LAYOUTS.find((l) => l.id === id)).filter((s): s is SectionSpec => !!s)
  return `<!doctype html><html lang="en" data-theme="${mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${googleFontsUrl([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)}">
<style>${previewCss(sys)}</style></head><body>${specs.map((s) => sectionHtml(s, sys)).join('\n')}</body></html>`
}
