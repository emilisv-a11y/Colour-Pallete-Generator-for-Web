/* ============================================================================
   Client handoff package
   One ZIP with a README, a standalone brand kit, palette files, design tokens,
   fluid typography, Divi 5 files and (optionally) self-hosted fonts.
   Text files are built synchronously (testable); binaries are added in the browser.
   ========================================================================== */

import { zipSync } from 'fflate'
import { cmykValues, formatColor, readableOn, rgbValues } from './color'
import { buildDiviImport, DEFAULT_DIVI_OPTIONS, diviCss, sectionStyles, type DiviExport, type DiviOptions, type SectionKind } from './divi'
import { downloadBlob, exportCode, palettePngBlob, paletteSvg } from './exports'
import { paletteAse, palettePdf } from './files'
import { fontStack, googleFontsUrl } from './fonts'
import { fill, T, type Lang } from './handoffText'
import { colorName } from './names'
import { fontFaceCss, type FontFile } from './selfHost'
import { autoAnchor, BRAND_ROLES, buildScales, buildTokens, checkPairs, ROLE_KEYS, STATUS_ROLES, STEPS, typeOf, type DesignSystem, type RoleKey } from './system'
import { exportTokens } from './tokens'
import { exportType, typeScale } from './typography'

export type HandoffParts = { brandKit: boolean; colours: boolean; tokens: boolean; typography: boolean; divi: boolean; fonts: boolean }
export const DEFAULT_PARTS: HandoffParts = { brandKit: true, colours: true, tokens: true, typography: true, divi: true, fonts: true }

export type HandoffInput = {
  project: { name: string; client: string; website: string; notes: string }
  sys: DesignSystem
  divi?: { source?: DiviExport | null; options?: Partial<DiviOptions> | null; plan?: SectionKind[] | null }
  fontFiles?: FontFile[]
  date?: Date
}

export const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'project'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const brandHexes = (sys: DesignSystem) => ROLE_KEYS.map((r) => sys.roles[r].hex)

const fontsLink = (input: HandoffInput, parts: HandoffParts) =>
  parts.fonts && input.fontFiles?.length
    ? `<link rel="stylesheet" href="fonts/fonts.css">`
    : `<link rel="stylesheet" href="${esc(googleFontsUrl([input.sys.fonts.heading, input.sys.fonts.body], input.sys.fonts.meta))}">`

const PAGE_CSS = `
*{box-sizing:border-box}body{margin:0;font-family:var(--body);color:#16181d;background:#f6f5f2;line-height:1.5}
main{max-width:1040px;margin:0 auto;padding:40px 20px 64px;display:flex;flex-direction:column;gap:32px}
h1,h2,h3{font-family:var(--heading);line-height:1.15;margin:0 0 .4em}h2{font-size:1.35rem}
section{display:flex;flex-direction:column;gap:12px}.muted{color:#5d6170}.small{font-size:.85rem}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85em}
.grid{display:grid;gap:12px}.g3{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.g5{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.card{background:#fff;border:1px solid #e2dfd8;border-radius:12px;overflow:hidden;break-inside:avoid}
.sw{height:120px;display:flex;align-items:flex-end;padding:10px 12px;font-weight:700}.sw.sm{height:70px}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0;padding:10px 12px;font-size:.8rem}dt{color:#5d6170;font-weight:700}dd{margin:0;font-family:ui-monospace,Menlo,Consolas,monospace}
.scale{display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:center}.steps{display:grid;grid-template-columns:repeat(11,1fr);border-radius:8px;overflow:hidden}
.steps span{height:52px;display:flex;flex-direction:column;justify-content:flex-end;padding:4px;font:600 .55rem ui-monospace,Menlo,monospace}.steps b{font-size:.65rem}.steps .anchor{box-shadow:inset 0 0 0 3px currentColor}
.pair{padding:14px;border-radius:12px;border:1px solid #e2dfd8;display:flex;flex-direction:column;gap:2px;break-inside:avoid}.pair b{font:800 1.8rem var(--heading);line-height:1}
.mode{padding:22px;border-radius:var(--radius);border:1px solid #e2dfd8}.btn{display:inline-block;padding:8px 16px;font-weight:700;border-radius:var(--radius);margin:4px 6px 0 0}
.cover{border-radius:20px;padding:48px 36px 64px;position:relative;overflow:hidden}.cover h1{font-size:clamp(2.2rem,6vw,3.6rem)}
.strip{position:absolute;left:0;right:0;bottom:0;height:22px;display:flex}.strip span{flex:1}
.toolbar{display:flex;justify-content:flex-end}.toolbar button{font:inherit;font-weight:700;padding:8px 16px;border-radius:8px;border:1px solid #e2dfd8;background:#fff;cursor:pointer}
@media print{@page{margin:12mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{background:#fff}.toolbar{display:none}main{padding:0;max-width:none}.break{break-before:page}}
@media(max-width:700px){.scale{grid-template-columns:1fr}}`

/* ---------- brand kit ---------- */

export function brandKitHtml(input: HandoffInput, lang: Lang, parts: HandoffParts = DEFAULT_PARTS): string {
  const t = T[lang]
  const { sys } = input
  const scales = buildScales(sys)
  const light = buildTokens(sys, 'light', scales)
  const dark = buildTokens(sys, 'dark', scales)
  const heading = fontStack(sys.fonts.heading, sys.fonts.meta)
  const body = fontStack(sys.fonts.body, sys.fonts.meta)
  const ts = typeOf(sys)
  const role = (r: RoleKey) => t.roles[r]

  const spec = (r: RoleKey, big: boolean) => {
    const hex = sys.roles[r].hex
    const { r: R, g, b } = rgbValues(hex)
    const c = cmykValues(hex)
    return `<div class="card"><div class="sw${big ? '' : ' sm'}" style="background:${hex};color:${readableOn(hex)}">${esc(role(r))}</div><dl>
<dt>${t.name}</dt><dd>${esc(colorName(hex) || '—')}</dd><dt>HEX</dt><dd>${hex.toUpperCase()}</dd><dt>RGB</dt><dd>${R}, ${g}, ${b}</dd>${
      big
        ? `<dt>CMYK</dt><dd>${c.c}, ${c.m}, ${c.y}, ${c.k}</dd><dt>HSL</dt><dd>${formatColor(hex, 'hsl').replace(/^hsl\(|\)$/g, '')}</dd><dt>OKLCH</dt><dd>${formatColor(hex, 'oklch').replace(/^oklch\(|\)$/g, '')}</dd>`
        : ''
    }</dl></div>`
  }

  const pairLabel = (fg: string, bg: string) => {
    const bgName = bg.endsWith('-subtle') ? t.bgLabels.subtle : ((t.bgLabels as Record<string, string>)[bg] ?? bg)
    const fgName = fg === 'text' ? t.pairLabels.text : fg === 'text-muted' ? t.pairLabels.muted : fg.endsWith('-text') ? t.pairLabels.link : t.pairLabels.text
    return `${fgName} ${t.pairLabels.on} ${bgName}`
  }
  const pairs = checkPairs(light).filter((p) => p.pass && /^(text|text-muted|on-primary|on-secondary|on-accent|primary-text|on-primary-subtle|on-accent-subtle)$/.test(p.fg) && /^(bg|surface|primary|secondary|accent|primary-subtle|accent-subtle)$/.test(p.bg))

  const mode = (label: string, tk: typeof light) => `<div class="mode" style="background:${tk.bg.hex};color:${tk.text.hex}">
<small style="color:${tk['text-muted'].hex}">${label}</small>
<h3 style="font-size:1.5rem;color:${tk.text.hex}">${t.headlineExample}</h3>
<p style="margin:0 0 8px">${esc(t.bodyExample).replace(esc(t.link), `<span style="color:${tk['primary-text'].hex};text-decoration:underline">${esc(t.link)}</span>`)}</p>
<span class="btn" style="background:${tk.primary.hex};color:${tk['on-primary'].hex}">${t.buttons.primary}</span><span class="btn" style="background:${tk.secondary.hex};color:${tk['on-secondary'].hex}">${t.buttons.secondary}</span><span class="btn" style="background:${tk['accent-subtle'].hex};color:${tk['on-accent-subtle'].hex}">${t.buttons.badge}</span></div>`

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.brandGuidelines)} · ${esc(input.project.name)}</title>
${fontsLink(input, parts)}
<style>:root{--heading:${heading};--body:${body};--radius:${sys.radius}px}${PAGE_CSS}</style>
</head>
<body>
<main>
<div class="toolbar"><button onclick="window.print()">${t.print}</button></div>
<header class="cover" style="background:${light.primary.hex};color:${light['on-primary'].hex}">
<small>${t.brandGuidelines}${input.project.client ? ` · ${esc(input.project.client)}` : ''}</small>
<h1 style="color:${light['on-primary'].hex}">${esc(input.project.name)}</h1>
<span class="small">${(input.date ?? new Date()).toLocaleDateString(lang === 'lt' ? 'lt-LT' : 'en-GB', { year: 'numeric', month: 'long' })}</span>
<div class="strip">${BRAND_ROLES.map((r) => `<span style="background:${sys.roles[r].hex}"></span>`).join('')}</div>
</header>

<section><h2>${t.brandColours}</h2><div class="grid g3">${BRAND_ROLES.map((r) => spec(r, true)).join('')}</div>
<h2>${t.supportingColours}</h2><div class="grid g5">${(['neutral', ...STATUS_ROLES] as RoleKey[]).map((r) => spec(r, false)).join('')}</div></section>

<section class="break"><h2>${t.scales}</h2><p class="muted small">${t.scalesNote}</p>
${ROLE_KEYS.map((r) => {
  const a = sys.roles[r].anchor ?? autoAnchor(sys.roles[r].hex)
  return `<div class="scale"><strong class="small">${esc(role(r))}</strong><div class="steps">${scales[r]
    .map((h, i) => `<span class="${i === a ? 'anchor' : ''}" style="background:${h};color:${readableOn(h)}"><b>${STEPS[i]}</b>${h.slice(1).toUpperCase()}</span>`)
    .join('')}</div></div>`
}).join('\n')}</section>

<section><h2>${t.pairings}</h2><p class="muted small">${t.pairingsNote}</p><div class="grid g3">${pairs
    .map(
      (p) =>
        `<div class="pair" style="background:${light[p.bg].hex};color:${light[p.fg].hex}"><b>Aa</b><span><strong>${esc(pairLabel(p.fg, p.bg))}</strong></span><code>${light[p.fg].hex.toUpperCase()} / ${light[p.bg].hex.toUpperCase()} · ${p.ratio.toFixed(1)}:1</code></div>`,
    )
    .join('')}</div></section>

<section><h2>${t.modes}</h2><div class="grid g3">${mode(t.lightMode, light)}${mode(t.darkMode, dark)}</div></section>

<section class="break"><h2>${t.typography}</h2><div class="grid g3">
<div><small class="muted">${t.headingFont} · ${esc(sys.fonts.heading)}</small><p style="font:800 2.4rem/1.1 var(--heading);margin:4px 0">Aa Bb Cc 123 ąčęėįšųūž</p></div>
<div><small class="muted">${t.bodyFont} · ${esc(sys.fonts.body)}</small><p style="font:400 1.05rem/1.6 var(--body);margin:6px 0">${esc(t.bodyExample)}</p></div></div>
<h3>${t.typeScale}</h3><p class="muted small">${fill(t.typeScaleNote, { min: ts.minVw, max: ts.maxVw })}</p>
${typeScale(ts)
  .filter((s) => s.el)
  .map(
    (s) =>
      `<div><span class="muted small">${s.el} · ${Math.round(s.min)}–${Math.round(s.max)}px</span><p style="font-family:var(--${s.el?.startsWith('h') ? 'heading' : 'body'});font-size:${Math.min(s.max, 44)}px;font-weight:${s.el?.startsWith('h') ? 750 : 400};line-height:${s.lineHeight};margin:0">${s.el?.startsWith('h') ? t.headlineExample : esc(t.bodyExample)}</p></div>`,
  )
  .join('\n')}
<h3>${t.gradient}</h3><div style="height:80px;border-radius:var(--radius);background:linear-gradient(90deg in oklab, ${sys.roles.primary.hex}, ${sys.roles.secondary.hex}, ${sys.roles.accent.hex})"></div></section>
${sys.notes ? `<section><h2>${t.usageNotes}</h2><p style="white-space:pre-wrap">${esc(sys.notes)}</p></section>` : ''}
<p class="muted small">${t.footer}</p>
</main>
</body>
</html>
`
}

/* ---------- README ---------- */

export function readmeHtml(input: HandoffInput, lang: Lang, parts: HandoffParts): string {
  const t = T[lang]
  const { sys, project } = input
  const d = input.date ?? new Date()
  const hexes = BRAND_ROLES.map((r) => [t.roles[r], sys.roles[r].hex] as const)
  const folders: [string, string, boolean][] = [
    ['README.html', t.folders.readme, true],
    ['brand-kit.html', t.folders.brandKit, parts.brandKit],
    ['colours/', t.folders.colours, parts.colours],
    ['tokens/', t.folders.tokens, parts.tokens],
    ['typography/', t.folders.typography, parts.typography],
    ['divi/', t.folders.divi, parts.divi],
    ['fonts/', t.folders.fonts, parts.fonts && !!input.fontFiles?.length],
  ]
  const steps = t.steps
    .map((s, i) => ({ s: fill(s, { heading: sys.fonts.heading, body: sys.fonts.body }), i }))
    .filter(({ i }) => (i !== 1 || (parts.fonts && input.fontFiles?.length)) && (i !== 3 || parts.divi) && (i !== 4 || parts.divi) && (i !== 5 || parts.divi))
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.packageTitle)} · ${esc(project.name)}</title>
${fontsLink(input, parts)}
<style>:root{--heading:${fontStack(sys.fonts.heading, sys.fonts.meta)};--body:${fontStack(sys.fonts.body, sys.fonts.meta)};--radius:${sys.radius}px}${PAGE_CSS}
.meta{display:grid;grid-template-columns:auto 1fr;gap:4px 16px}.chips{display:flex;flex-wrap:wrap;gap:10px}.chip{display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;background:#fff;border:1px solid #e2dfd8;border-radius:99px}.chip i{width:28px;height:28px;border-radius:50%;display:block}
ol li,ul li{margin:6px 0}a.cta{display:inline-block;padding:10px 18px;border-radius:var(--radius);font-weight:700;text-decoration:none}</style>
</head>
<body>
<main>
<header class="cover" style="background:${sys.roles.primary.hex};color:${readableOn(sys.roles.primary.hex)}">
<small>${t.packageTitle}</small>
<h1 style="color:inherit">${esc(project.name)}</h1>
${project.client ? `<span>${t.preparedFor}: <strong>${esc(project.client)}</strong></span>` : ''}
<div class="strip">${BRAND_ROLES.map((r) => `<span style="background:${sys.roles[r].hex}"></span>`).join('')}</div>
</header>
<section>
<div class="meta small"><span class="muted">${t.project}</span><span>${esc(project.name)}</span><span class="muted">${t.date}</span><span>${d.toLocaleDateString(lang === 'lt' ? 'lt-LT' : 'en-GB')}</span>${
    project.website ? `<span class="muted">${t.website}</span><span>${esc(project.website)}</span>` : ''
  }</div>
<p>${t.intro}</p>
${parts.brandKit ? `<p><a class="cta" href="brand-kit.html" style="background:${sys.roles.primary.hex};color:${readableOn(sys.roles.primary.hex)}">${t.openBrandKit} →</a></p>` : ''}
</section>
<section><h2>${t.colours}</h2><div class="chips">${hexes.map(([label, hex]) => `<span class="chip"><i style="background:${hex}"></i><span><strong>${esc(label)}</strong> <code>${hex.toUpperCase()}</code></span></span>`).join('')}</div>
<p class="muted small">${t.accessibility}</p></section>
<section><h2>${t.fonts}</h2><p><strong style="font-family:var(--heading)">${esc(sys.fonts.heading)}</strong> · ${t.headingFont}<br><strong style="font-family:var(--body)">${esc(sys.fonts.body)}</strong> · ${t.bodyFont}</p>
${parts.fonts && input.fontFiles?.length ? '' : `<p class="muted small">${t.stepsNoFonts}</p>`}</section>
<section><h2>${t.contents}</h2><ul>${folders
    .filter(([, , on]) => on)
    .map(([name, desc]) => `<li><code>${name}</code>: ${desc}</li>`)
    .join('')}</ul></section>
${parts.divi || (parts.fonts && input.fontFiles?.length) ? `<section><h2>${t.install}</h2><ol>${steps.map(({ s }) => `<li>${esc(s)}</li>`).join('')}</ol></section>` : ''}
${project.notes ? `<section><h2>${t.notes}</h2><p style="white-space:pre-wrap">${esc(project.notes)}</p></section>` : ''}
<p class="muted small">${t.footer}</p>
</main>
</body>
</html>
`
}

function sectionPlanHtml(input: HandoffInput, lang: Lang, plan: SectionKind[]) {
  const t = T[lang]
  const st = sectionStyles(input.sys)
  return `<!doctype html>
<html lang="${t.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${t.sectionPlan}</title>
<style>${PAGE_CSS}.sec{padding:28px;border:1px solid #e2dfd8;border-bottom:0}.sec:first-of-type{border-radius:12px 12px 0 0}.sec:last-of-type{border-bottom:1px solid #e2dfd8;border-radius:0 0 12px 12px}.sec h3{font-size:1.3rem}</style></head>
<body><main><section><h1>${t.sectionPlan}</h1><p class="muted">${t.sectionPlanNote}</p><div>${plan
    .map((k) => {
      const s = st[k]
      return `<div class="sec" style="background:${s.bg};color:${s.text}"><h3 style="color:${s.heading}">${esc(s.label)} ${t.section}</h3><p class="small">${t.presets}: <strong>${esc(s.presets.section)}</strong> · <strong>${esc(s.presets.text)}</strong> · <strong>${esc(s.presets.button)}</strong><br>${t.cssClass}: <code>d5-section-${k}</code></p><span class="btn" style="background:${s.button.bg};color:${s.button.text}">${esc(s.button.label.replace(/ \(.*\)/, ''))}</span></div>`
    })
    .join('')}</div></section></main></body></html>
`
}

/* ---------- assembling ---------- */

/** All text files of the package, keyed by path inside the ZIP (without the root folder). */
export function handoffTextFiles(input: HandoffInput, lang: Lang, parts: HandoffParts): Record<string, string> {
  const files: Record<string, string> = {}
  const { sys } = input
  files['README.html'] = readmeHtml(input, lang, parts)
  if (parts.brandKit) files['brand-kit.html'] = brandKitHtml(input, lang, parts)
  if (parts.colours) {
    const hexes = brandHexes(sys)
    files['colours/palette.svg'] = paletteSvg(hexes)
    files['colours/palette.gpl'] = exportCode(hexes, 'gpl', 'names')
    files['colours/colours.json'] = exportCode(hexes, 'json', 'names')
  }
  if (parts.tokens) {
    files['tokens/design-tokens.css'] = exportTokens(sys, 'css')
    files['tokens/design-tokens.scss'] = exportTokens(sys, 'scss')
    files['tokens/tailwind-v4.css'] = exportTokens(sys, 'tailwind4')
    files['tokens/tailwind.config.js'] = exportTokens(sys, 'tailwind3')
    files['tokens/design-tokens.dtcg.json'] = exportTokens(sys, 'dtcg')
    files['tokens/tokens-studio.json'] = exportTokens(sys, 'tokens-studio')
    files['tokens/bootstrap-variables.scss'] = exportTokens(sys, 'bootstrap')
    files['tokens/tokens.json'] = exportTokens(sys, 'json')
  }
  if (parts.typography) {
    const stacks = { heading: fontStack(sys.fonts.heading, sys.fonts.meta), body: fontStack(sys.fonts.body, sys.fonts.meta) }
    files['typography/fluid-type.css'] = exportType(typeOf(sys), 'css', sys.fonts, stacks)
    files['typography/tailwind-v4-type.css'] = exportType(typeOf(sys), 'tailwind4')
  }
  if (parts.divi) {
    const opts = { ...DEFAULT_DIVI_OPTIONS, ...(input.divi?.options ?? {}) }
    files['divi/divi5-import.json'] = JSON.stringify(buildDiviImport(sys, opts, input.divi?.source ?? null).file, null, 1)
    files['divi/divi-custom.css'] = diviCss(sys)
    files['divi/section-plan.html'] = sectionPlanHtml(input, lang, input.divi?.plan?.length ? input.divi.plan : ['dark', 'light', 'surface', 'brand', 'light', 'dark'])
  }
  if (parts.fonts && input.fontFiles?.length) files['fonts/fonts.css'] = `/* Self-hosted fonts */\n\n${fontFaceCss(input.fontFiles, '')}\n`
  return files
}

/** Rough size of the finished ZIP in bytes (text + known font sizes + small binaries). */
export function estimateSize(input: HandoffInput, lang: Lang, parts: HandoffParts) {
  // text is deflated in the ZIP (roughly 4×); fonts, PNG and PDF are stored as they are
  const text = Object.values(handoffTextFiles(input, lang, parts)).reduce((n, s) => n + new Blob([s]).size, 0) * 0.27
  const fonts = parts.fonts ? (input.fontFiles ?? []).reduce((n, f) => n + (f.size ?? 40000), 0) : 0
  const binaries = parts.colours ? 120000 : 0 // png + pdf + ase
  return text + fonts + binaries
}

export async function buildHandoffZip(input: HandoffInput, lang: Lang, parts: HandoffParts, onProgress?: (msg: string) => void): Promise<{ blob: Blob; name: string; files: string[] }> {
  const root = `${slugify(input.project.name)}-handoff/`
  const enc = new TextEncoder()
  const entries: Record<string, Uint8Array> = {}
  for (const [path, text] of Object.entries(handoffTextFiles(input, lang, parts))) entries[root + path] = enc.encode(text)

  if (parts.colours) {
    onProgress?.('Palette files…')
    const hexes = brandHexes(input.sys)
    entries[root + 'colours/palette.pdf'] = new Uint8Array(await palettePdf(hexes, input.project.name).arrayBuffer())
    entries[root + 'colours/palette.ase'] = new Uint8Array(await paletteAse(hexes, input.project.name).arrayBuffer())
    if (typeof document !== 'undefined') entries[root + 'colours/palette.png'] = new Uint8Array(await (await palettePngBlob(hexes)).arrayBuffer())
  }

  if (parts.fonts && input.fontFiles?.length) {
    let done = 0
    await Promise.all(
      input.fontFiles.map(async (f) => {
        const r = await fetch(f.url)
        if (!r.ok) throw new Error(`Could not download ${f.file} (${r.status})`)
        entries[root + 'fonts/' + f.file] = new Uint8Array(await r.arrayBuffer())
        onProgress?.(`Fonts ${++done} / ${input.fontFiles!.length}`)
      }),
    )
  }

  onProgress?.('Packing…')
  // already-compressed files (fonts, png, pdf) are stored; text is deflated
  const zip = zipSync(Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v, { level: /\.(woff2|png|pdf)$/.test(k) ? 0 : 6 }]])) as never)
  return { blob: new Blob([zip as BlobPart], { type: 'application/zip' }), name: `${slugify(input.project.name)}-handoff.zip`, files: Object.keys(entries).map((k) => k.slice(root.length)) }
}

export async function downloadHandoff(...args: Parameters<typeof buildHandoffZip>) {
  const { blob, name } = await buildHandoffZip(...args)
  downloadBlob(blob, name)
}
