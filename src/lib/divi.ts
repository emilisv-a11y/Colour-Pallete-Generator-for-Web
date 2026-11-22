/* ============================================================================
   Divi 5 import/export
   Modelled on a real Divi 5 "All presets" export:
   {
     context: 'et_builder', data: [],
     presets: { module: { 'divi/heading': { default, items: { id: preset } } }, group: { 'divi/border': … } },
     global_colors: [ ['gcid-xxxxxxxxxx', { color, status: 'active', label }] ],
     global_variables: [ { id: 'gvid-xxxxxxxxxx', label, value, order, status, lastUpdated, variableType: 'numbers', type: 'numbers' } ],
     page_settings_meta: null, canvases: [], components: [], images: [], thumbnails: []
   }
   References inside presets/colours use
     $variable({"type":"color","value":{"name":"gcid-…","settings":{}}})$
     $variable({"type":"content","value":{"name":"gvid-…","settings":{}}})$
   ========================================================================== */

import { buildScales, buildTokens, ROLE_INFO, ROLE_KEYS, STEPS, typeOf, type DesignSystem, type RoleKey, type Tokens } from './system'
import { spacePairs, spaceScale, typeScale } from './typography'
import { contrastRatio } from './color'
import { exportTokens } from './tokens'
import { buttonSizes, effectHelpers, effectsOf } from './effects'

export type DiviColor = { color: string; status: string; label: string }
export type DiviVariable = { id: string; label: string; value: string; order: string; status: string; lastUpdated: string; variableType: string; type: string }
export type DiviPreset = {
  id: string
  name: string
  moduleName: string
  version: string
  type: 'module' | 'group'
  created: number
  updated: number
  attrs?: unknown
  styleAttrs?: unknown
  renderAttrs?: unknown
  groupName?: string
  groupId?: string
  [k: string]: unknown
}
export type DiviPresetGroup = { default: string; items: Record<string, DiviPreset> }
export type DiviExport = {
  context: string
  data: unknown[]
  presets: { module: Record<string, DiviPresetGroup>; group: Record<string, DiviPresetGroup> }
  global_colors: [string, DiviColor][]
  global_variables: DiviVariable[]
  page_settings_meta: unknown
  canvases: unknown[]
  components: unknown[]
  images: unknown[]
  thumbnails: unknown[]
}

export const DIVI_HEADING_FONT = '--et_global_heading_font'
export const DIVI_BODY_FONT = '--et_global_body_font'
export const BUILTIN_COLORS = { primary: 'gcid-primary-color', heading: 'gcid-heading-color', body: 'gcid-body-color' } as const

/* ---------- references ---------- */

export const colorRef = (id: string, settings: Record<string, unknown> = {}) => `$variable(${JSON.stringify({ type: 'color', value: { name: id, settings } })})$`
export const contentRef = (id: string) => `$variable(${JSON.stringify({ type: 'content', value: { name: id, settings: {} } })})$`

/** Parse a $variable(...)$ reference, or null for plain values. */
export function parseRef(v: unknown): { type: string; name: string; settings: Record<string, unknown> } | null {
  if (typeof v !== 'string') return null
  const m = v.match(/^\$variable\((.*)\)\$$/)
  if (!m) return null
  try {
    const j = JSON.parse(m[1])
    return { type: j.type, name: j.value?.name, settings: j.value?.settings ?? {} }
  } catch {
    return null
  }
}

/* ---------- ids ---------- */

/** Stable 10-character id (Divi uses 10 lowercase alphanumerics), so re-importing updates instead of duplicating. */
export function stableId(seed: string) {
  let h1 = 0x811c9dc5,
    h2 = 0x01000193
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619)
    h2 = Math.imul(h2 ^ c, 2246822519) ^ (h2 >>> 13)
  }
  const s = ((h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)).replace(/[^a-z0-9]/g, '')
  return (s + 'a0b1c2d3e4').slice(0, 10)
}

const normLabel = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/* ---------- reading an existing export ---------- */

export function parseDiviExport(text: string): DiviExport {
  const d = JSON.parse(text)
  if (d?.context !== 'et_builder' || !d.presets || !Array.isArray(d.global_colors) || !Array.isArray(d.global_variables)) {
    throw new Error('This does not look like a Divi 5 presets export (expected context "et_builder" with presets, global_colors and global_variables).')
  }
  return d as DiviExport
}

/** Resolve a global colour to hex, following references. `relative` is true when a reference changes the colour (e.g. lightness). */
export function resolveColor(id: string, src: DiviExport, depth = 0): { hex: string | null; relative: boolean } {
  if (depth > 8) return { hex: null, relative: false }
  const entry = src.global_colors.find(([k]) => k === id)?.[1]
  if (!entry) return { hex: null, relative: false }
  const ref = parseRef(entry.color)
  if (!ref) return { hex: /^#[0-9a-f]{3,8}$/i.test(entry.color) ? entry.color.toLowerCase() : null, relative: false }
  const inner = resolveColor(ref.name, src, depth + 1)
  return { hex: inner.hex, relative: inner.relative || Object.keys(ref.settings).length > 0 }
}

export function summarizeExport(src: DiviExport) {
  const moduleCount = Object.values(src.presets.module ?? {}).reduce((n, g) => n + Object.keys(g.items).length, 0)
  const groupCount = Object.values(src.presets.group ?? {}).reduce((n, g) => n + Object.keys(g.items).length, 0)
  return {
    colors: src.global_colors.map(([id, c]) => ({ id, label: c.label, raw: c.color, ...resolveColor(id, src) })),
    variables: src.global_variables.map((v) => ({ id: v.id, label: v.label, value: v.value, type: v.type })),
    moduleCount,
    groupCount,
    version: latestVersion(src),
  }
}

export function latestVersion(src?: DiviExport | null) {
  const vs: string[] = []
  const walk = (g?: Record<string, DiviPresetGroup>) => Object.values(g ?? {}).forEach((x) => Object.values(x.items).forEach((i) => i.version && vs.push(i.version)))
  if (src) {
    walk(src.presets.module)
    walk(src.presets.group)
  }
  const clean = vs.filter((v) => /^\d+(\.\d+)*$/.test(v))
  if (!clean.length) return '5.19.0'
  return clean.sort((a, b) => {
    const pa = a.split('.').map(Number),
      pb = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
    return 0
  })[clean.length - 1]
}

/* ---------- building an import file ---------- */

export type DiviOptions = {
  scales: 'brand' | 'all' | 'none'
  tokens: 'essential' | 'all' | 'none'
  linkTokens: boolean
  mapBuiltins: boolean
  typeVars: boolean
  spaceVars: boolean
  radiusVars: boolean
  /** borders, button sizes, input height, motion durations and content widths */
  effectVars: boolean
  presetHeadings: boolean
  presetText: boolean
  presetButtons: boolean
  presetButtonSizes: boolean
  presetSections: boolean
  /** section presets with brand gradients */
  presetGradients: boolean
  presetGroups: boolean
  prefix: string
  /** when a colour/variable with the same name already exists on the site */
  onConflict: 'update' | 'keep'
}

export const DEFAULT_DIVI_OPTIONS: DiviOptions = {
  scales: 'brand',
  tokens: 'essential',
  linkTokens: true,
  mapBuiltins: true,
  typeVars: true,
  spaceVars: true,
  radiusVars: true,
  effectVars: true,
  presetHeadings: true,
  presetText: true,
  presetButtons: true,
  presetButtonSizes: true,
  presetSections: true,
  presetGradients: true,
  presetGroups: true,
  prefix: '',
  onConflict: 'update',
}

export const ESSENTIAL_TOKENS = [
  'bg', 'surface', 'surface-raised', 'border', 'border-strong', 'text', 'text-muted', 'focus-ring',
  'primary', 'on-primary', 'primary-hover', 'primary-subtle', 'on-primary-subtle', 'primary-text',
  'secondary', 'on-secondary', 'secondary-hover', 'secondary-text',
  'accent', 'on-accent', 'accent-text',
  'success', 'warning', 'error', 'info', 'success-subtle', 'warning-subtle', 'error-subtle', 'info-subtle',
]

const title = (s: string) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')

export type Change = { kind: 'color' | 'variable' | 'preset'; label: string; id: string; action: 'add' | 'update' | 'keep'; value?: string; previous?: string }

export type DiviBuild = { file: DiviExport; changes: Change[]; ids: { colors: Record<string, string>; vars: Record<string, string> } }

export function buildDiviImport(sys: DesignSystem, opts: DiviOptions, source?: DiviExport | null, now = Date.now()): DiviBuild {
  const scales = buildScales(sys)
  const tokens: Tokens = buildTokens(sys, 'light', scales)
  const P = opts.prefix
  const changes: Change[] = []
  const version = latestVersion(source)
  const iso = new Date(now).toISOString()

  // existing labels → ids, so matching items are updated in place (and existing presets keep working)
  const existingColor = new Map((source?.global_colors ?? []).map(([id, c]) => [normLabel(c.label), id]))
  const existingVar = new Map((source?.global_variables ?? []).map((v) => [normLabel(v.label), v.id]))
  const colorIdFor = (label: string) => existingColor.get(normLabel(label)) ?? `gcid-${stableId('c:' + normLabel(label))}`
  const varIdFor = (label: string) => existingVar.get(normLabel(label)) ?? `gvid-${stableId('v:' + normLabel(label))}`

  /* colours */
  const colors: [string, DiviColor][] = []
  const colorIds: Record<string, string> = {} // 'primary.500' or token name → gcid
  const addColor = (key: string, label: string, color: string, fixedId?: string) => {
    const id = fixedId ?? colorIdFor(label)
    colorIds[key] = id
    const prev = source?.global_colors.find(([k]) => k === id)?.[1]
    if (prev && opts.onConflict === 'keep') {
      changes.push({ kind: 'color', label, id, action: 'keep', value: color, previous: prev.color })
      return
    }
    colors.push([id, { color, status: 'active', label }])
    changes.push({ kind: 'color', label, id, action: prev ? 'update' : 'add', value: color, previous: prev?.color })
  }
  const scaleRoles: RoleKey[] = opts.scales === 'none' ? [] : opts.scales === 'brand' ? ['primary', 'secondary', 'accent', 'neutral'] : [...ROLE_KEYS]
  scaleRoles.forEach((r) => scales[r].forEach((hex, i) => addColor(`${r}.${STEPS[i]}`, `${P}${ROLE_INFO[r].label} ${STEPS[i]}`, hex)))
  const tokenNames = opts.tokens === 'none' ? [] : opts.tokens === 'essential' ? ESSENTIAL_TOKENS : Object.keys(tokens)
  const tokenValue = (name: string) => {
    const t = tokens[name]
    if (opts.linkTokens && t.ref && colorIds[t.ref]) return colorRef(colorIds[t.ref])
    return t.hex
  }
  tokenNames.forEach((n) => addColor(n, `${P}${title(n)}`, tokenValue(n)))
  if (opts.mapBuiltins) {
    const labelOf = (id: string, fallback: string) => source?.global_colors.find(([k]) => k === id)?.[1].label ?? fallback
    const link = (name: string) => (colorIds[name] ? colorRef(colorIds[name]) : tokens[name].hex)
    addColor('@primary', labelOf(BUILTIN_COLORS.primary, 'Primary Color'), link('primary'), BUILTIN_COLORS.primary)
    addColor('@heading', labelOf(BUILTIN_COLORS.heading, 'Heading Text Color'), link('text'), BUILTIN_COLORS.heading)
    addColor('@body', labelOf(BUILTIN_COLORS.body, 'Body Text Color'), link('text'), BUILTIN_COLORS.body)
  }
  /** Colour reference for presets: a global colour when exported, else the plain hex. */
  const C = (token: string) => (colorIds[token] ? colorRef(colorIds[token]) : tokens[token].hex)

  /* variables */
  const variables: DiviVariable[] = []
  const varIds: Record<string, string> = {}
  let order = 1
  const addVar = (key: string, label: string, value: string) => {
    const id = varIdFor(label)
    varIds[key] = id
    const prev = source?.global_variables.find((v) => v.id === id)
    if (prev && opts.onConflict === 'keep') {
      changes.push({ kind: 'variable', label, id, action: 'keep', value, previous: prev.value })
      return
    }
    variables.push({ id, label, value, order: prev?.order ?? String(order), status: 'active', lastUpdated: iso, variableType: 'numbers', type: 'numbers' })
    order++
    changes.push({ kind: 'variable', label, id, action: prev ? 'update' : 'add', value, previous: prev?.value })
  }
  const ts = typeOf(sys)
  const steps = typeScale(ts)
  if (opts.typeVars) steps.forEach((s) => addVar(`text-${s.name}`, `${P}text-${s.name}`, s.css))
  if (opts.spaceVars) [...spaceScale(ts), ...spacePairs(ts)].forEach((s) => addVar(`space-${s.name}`, `${P}space-${s.name}`, s.css))
  if (opts.radiusVars) {
    const r = sys.radius
    addVar('radius-s', `${P}radius-s`, `${Math.round(r * 0.5)}px`)
    addVar('radius-m', `${P}radius-m`, `${r}px`)
    addVar('radius-l', `${P}radius-l`, `${Math.round(r * 1.6)}px`)
    addVar('radius-full', `${P}radius-full`, '999px')
  }
  if (opts.effectVars) {
    const e = effectsOf(sys)
    ;(['thin', 'base', 'thick'] as const).forEach((n) => addVar(`border-${n}`, `${P}border-${n}`, `${e.borders[n]}px`))
    buttonSizes(sys).forEach((b) => {
      addVar(`btn-${b.name}-pad-y`, `${P}btn-${b.name}-pad-y`, `${b.padY}px`)
      addVar(`btn-${b.name}-pad-x`, `${P}btn-${b.name}-pad-x`, `${b.padX}px`)
      addVar(`btn-${b.name}-font`, `${P}btn-${b.name}-font`, `${Math.round((b.fontPx / 16) * 1000) / 1000}rem`)
    })
    addVar('input-height', `${P}input-height`, `${e.input}px`)
    ;(['fast', 'base', 'slow'] as const).forEach((n) => addVar(`duration-${n}`, `${P}duration-${n}`, `${e.motion[n]}ms`))
    ;(['narrow', 'container', 'wide'] as const).forEach((n) => addVar(`width-${n}`, `${P}width-${n}`, `${e.widths[n]}px`))
  }
  const V = (key: string, fallback: string) => (varIds[key] ? contentRef(varIds[key]) : fallback)

  /* presets */
  const moduleGroups: Record<string, DiviPresetGroup> = {}
  const groupGroups: Record<string, DiviPresetGroup> = {}
  const ensureGroup = (bag: Record<string, DiviPresetGroup>, key: string, kind: 'module' | 'group', placeholder: () => DiviPreset) => {
    if (bag[key]) return bag[key]
    const src = kind === 'module' ? source?.presets.module?.[key] : source?.presets.group?.[key]
    if (src?.default && src.items[src.default]) {
      // keep the site's existing default preset exactly as it is
      bag[key] = { default: src.default, items: { [src.default]: src.items[src.default] } }
    } else {
      const ph = placeholder()
      bag[key] = { default: ph.id, items: { [ph.id]: ph } }
    }
    return bag[key]
  }
  const presetId = (seed: string) => stableId('p:' + normLabel(seed))
  const addModulePreset = (moduleName: string, name: string, attrs: unknown, renderAttrs?: unknown) => {
    const g = ensureGroup(moduleGroups, moduleName, 'module', () => ({
      id: presetId(`${moduleName} default`),
      name: `${title(moduleName.split('/')[1])} Preset 1`,
      moduleName,
      version,
      type: 'module',
      created: now,
      updated: now,
    }))
    const id = presetId(`${moduleName} ${P}${name}`)
    const existed = !!source?.presets.module?.[moduleName]?.items[id]
    g.items[id] = { id, name: `${P}${name}`, moduleName, version, type: 'module', created: now, updated: now, attrs, ...(renderAttrs ? { renderAttrs } : {}), styleAttrs: stripKey(attrs, 'headingLevel') }
    changes.push({ kind: 'preset', label: `${moduleName} · ${P}${name}`, id, action: existed ? 'update' : 'add' })
  }
  const addGroupPreset = (groupName: string, moduleName: string, groupId: string, name: string, attrs: unknown) => {
    const g = ensureGroup(groupGroups, groupName, 'group', () => ({
      type: 'group',
      id: presetId(`${groupName} default`),
      name: `${title(groupName.split('/')[1])} 1`,
      version,
      created: now,
      updated: now,
      groupName,
      moduleName,
      groupId,
    }))
    const id = presetId(`${groupName} ${P}${name}`)
    const existed = !!source?.presets.group?.[groupName]?.items[id]
    g.items[id] = { type: 'group', id, name: `${P}${name}`, version, created: now, updated: now, groupName, moduleName, groupId, attrs, styleAttrs: attrs }
    changes.push({ kind: 'preset', label: `${groupName} · ${P}${name}`, id, action: existed ? 'update' : 'add' })
  }

  const headingSteps = steps.filter((s) => s.el && /^h[1-6]$/.test(s.el))
  const body = steps.find((s) => s.step === 0)!
  const fontValue = (s: (typeof steps)[number], family: string, color: string, weight?: string) => ({
    family: contentRef(family),
    ...(weight ? { weight } : {}),
    size: V(`text-${s.name}`, s.css),
    lineHeight: `${s.lineHeight}em`,
    ...(s.tracking !== '0' ? { letterSpacing: s.tracking } : {}),
    color,
  })

  if (opts.presetHeadings) {
    headingSteps.forEach((s) => {
      const level = s.el!
      addModulePreset(
        'divi/heading',
        `${level.toUpperCase()} Heading`,
        { title: { decoration: { font: { font: { desktop: { value: { headingLevel: level, ...fontValue(s, DIVI_HEADING_FONT, C('text'), '700') } } } } } } },
        { title: { decoration: { font: { font: { desktop: { value: { headingLevel: level } } } } } } },
      )
    })
  }

  if (opts.presetText) {
    const textAttrs = (color: string, headingColor: string) => ({
      content: {
        decoration: {
          bodyFont: { body: { font: { desktop: { value: fontValue(body, DIVI_BODY_FONT, color) } } } },
          headingFont: Object.fromEntries(headingSteps.map((s) => [s.el!, { font: { desktop: { value: fontValue(s, DIVI_HEADING_FONT, headingColor, '700') } } }])),
        },
      },
    })
    addModulePreset('divi/text', 'Body Text', textAttrs(C('text'), C('text')))
    addModulePreset('divi/text', 'Muted Text', textAttrs(C('text-muted'), C('text')))
    addModulePreset('divi/text', 'Text on Brand', textAttrs(C('on-primary'), C('on-primary')))
    const light = colorIds['neutral.50'] ? colorRef(colorIds['neutral.50']) : scales.neutral[0]
    addModulePreset('divi/text', 'Text on Dark', textAttrs(light, light))
  }

  if (opts.presetButtons) {
    const radius = V('radius-m', `${sys.radius}px`)
    const radiusObj = { sync: 'on', topLeft: radius, topRight: radius, bottomRight: radius, bottomLeft: radius }
    const m = buttonSizes(sys)[1]
    const padY = V('btn-m-pad-y', V('space-xs', `${m.padY}px`)),
      padX = V('btn-m-pad-x', V('space-m', `${m.padX}px`))
    const padding = { top: padY, bottom: padY, left: padX, right: padX, syncVertical: 'on', syncHorizontal: 'on' }
    const button = (bg: string | null, bgHover: string | null, text: string, textHover: string, border: string, borderHover: string) => ({
      button: {
        decoration: {
          button: { desktop: { value: { enable: 'on', icon: { enable: 'off' } } } },
          ...(bg ? { background: { desktop: { value: { color: bg }, ...(bgHover ? { hover: { color: bgHover } } : {}) } } } : {}),
          font: { font: { desktop: { value: { color: text, family: contentRef(DIVI_BODY_FONT), weight: '600' }, hover: { color: textHover } } } },
          border: { desktop: { value: { radius: radiusObj, styles: { all: { width: '2px', color: border } } }, hover: { styles: { all: { color: borderHover } } } } },
          spacing: { desktop: { value: { padding } } },
        },
      },
    })
    addModulePreset('divi/button', 'Primary Button', button(C('primary'), C('primary-hover'), C('on-primary'), C('on-primary'), C('primary'), C('primary-hover')))
    addModulePreset('divi/button', 'Secondary Button', button(C('secondary'), C('secondary-hover'), C('on-secondary'), C('on-secondary'), C('secondary'), C('secondary-hover')))
    addModulePreset('divi/button', 'Outline Button', button(null, C('primary-subtle'), C('primary-text'), C('on-primary-subtle'), C('primary-text'), C('primary-text')))
    const light = colorIds['neutral.50'] ? colorRef(colorIds['neutral.50']) : scales.neutral[0]
    addModulePreset('divi/button', 'Light Button (on dark or brand)', button(light, C('surface-raised'), C('primary-text'), C('primary-text'), light, C('surface-raised')))
  }

  if (opts.presetButtonSizes) {
    buttonSizes(sys).forEach((b) => {
      const y = V(`btn-${b.name}-pad-y`, `${b.padY}px`),
        x = V(`btn-${b.name}-pad-x`, `${b.padX}px`)
      addGroupPreset('divi/button', 'divi/button', 'designButton', `Button Size ${b.name.toUpperCase()}`, {
        button: {
          decoration: {
            font: { font: { desktop: { value: { size: V(`btn-${b.name}-font`, `${b.fontPx}px`) } } } },
            spacing: { desktop: { value: { padding: { top: y, bottom: y, left: x, right: x, syncVertical: 'on', syncHorizontal: 'on' } } } },
          },
        },
      })
    })
  }

  if (opts.presetSections) {
    const pad = V('space-xl-3xl', '5rem')
    const section = (bg: string) => ({ module: { decoration: { background: { desktop: { value: { color: bg } } }, spacing: { desktop: { value: { padding: { top: pad, bottom: pad, syncVertical: 'on' } } } } } } })
    const dark = colorIds['neutral.900'] ? colorRef(colorIds['neutral.900']) : scales.neutral[9]
    addModulePreset('divi/section', 'Section Light', section(C('bg')))
    addModulePreset('divi/section', 'Section Surface', section(C('surface')))
    addModulePreset('divi/section', 'Section Brand', section(C('primary')))
    addModulePreset('divi/section', 'Section Secondary', section(C('secondary')))
    addModulePreset('divi/section', 'Section Subtle', section(C('primary-subtle')))
    addModulePreset('divi/section', 'Section Dark', section(dark))
  }

  if (opts.presetGradients) {
    const sc = buildScales(sys)
    const pad = V('space-xl-3xl', '5rem')
    const grad = (g: DiviGradient, fallback: string) => ({ module: { decoration: { background: { desktop: { value: { color: fallback, gradient: g } } }, spacing: { desktop: { value: { padding: { top: pad, bottom: pad, syncVertical: 'on' } } } } } } })
    addModulePreset('divi/section', 'Section Gradient Brand', grad(diviGradient([{ color: tokens.primary.hex, pos: 0 }, { color: tokens.secondary.hex, pos: 100 }], 'linear', '135deg'), tokens.primary.hex))
    addModulePreset('divi/section', 'Section Gradient Soft', grad(diviGradient([{ color: tokens['primary-subtle'].hex, pos: 0 }, { color: tokens.bg.hex, pos: 100 }], 'linear', '180deg'), tokens.bg.hex))
    addModulePreset('divi/section', 'Section Gradient Dark', grad(diviGradient([{ color: sc.neutral[9], pos: 0 }, { color: sc.primary[9], pos: 100 }], 'linear', '160deg'), sc.neutral[9]))
    addModulePreset('divi/section', 'Section Gradient Glow', grad(diviGradient([{ color: sc.primary[3], pos: 0 }, { color: tokens.bg.hex, pos: 70 }], 'circular', 'top left'), tokens.bg.hex))
  }

  if (opts.presetGroups) {
    const r = (k: string, f: string) => {
      const v = V(k, f)
      return { module: { decoration: { border: { desktop: { value: { radius: { topLeft: v, topRight: v, bottomLeft: v, bottomRight: v, sync: 'on' } } } } } } }
    }
    addGroupPreset('divi/border', 'divi/group', 'module.decoration.border', 'Radius M', r('radius-m', `${sys.radius}px`))
    addGroupPreset('divi/border', 'divi/group', 'module.decoration.border', 'Radius L', r('radius-l', `${Math.round(sys.radius * 1.6)}px`))
    const p = (k: string, f: string) => {
      const v = V(k, f)
      return { module: { decoration: { spacing: { desktop: { value: { padding: { top: v, bottom: v, left: v, right: v, syncVertical: 'on', syncHorizontal: 'on' } } } } } } }
    }
    addGroupPreset('divi/spacing', 'divi/group', 'module.decoration.spacing', 'Card Padding M', p('space-m', '1.5rem'))
    addGroupPreset('divi/spacing', 'divi/group', 'module.decoration.spacing', 'Card Padding L', p('space-l', '2rem'))
  }

  const file: DiviExport = {
    context: 'et_builder',
    data: [],
    presets: { module: moduleGroups, group: groupGroups },
    global_colors: colors,
    global_variables: variables,
    page_settings_meta: null,
    canvases: [],
    components: [],
    images: [],
    thumbnails: [],
  }
  return { file, changes, ids: { colors: colorIds, vars: varIds } }
}

/** Deep copy without a given key (Divi stores headingLevel in attrs/renderAttrs but not styleAttrs). */
function stripKey(v: unknown, key: string): unknown {
  if (Array.isArray(v)) return v.map((x) => stripKey(x, key))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => k !== key).map(([k, x]) => [k, stripKey(x, key)]))
  return v
}

/** Every $variable reference in the file points at a colour or variable defined in the file, Divi built-ins, or the site export. */
export function findBrokenRefs(file: DiviExport, source?: DiviExport | null): string[] {
  const known = new Set<string>([
    ...file.global_colors.map(([id]) => id),
    ...file.global_variables.map((v) => v.id),
    ...(source?.global_colors ?? []).map(([id]) => id),
    ...(source?.global_variables ?? []).map((v) => v.id),
    DIVI_HEADING_FONT,
    DIVI_BODY_FONT,
    ...Object.values(BUILTIN_COLORS),
  ])
  const broken: string[] = []
  const walk = (v: unknown) => {
    const r = parseRef(v)
    if (r && !known.has(r.name)) broken.push(r.name)
    if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(file.presets)
  file.global_colors.forEach(([, c]) => walk(c.color))
  return [...new Set(broken)]
}

/* ---------- Section colour planner ---------- */


export type SectionKind = 'light' | 'surface' | 'subtle' | 'brand' | 'secondary' | 'dark'
export type SectionStyle = {
  kind: SectionKind
  label: string
  bg: string
  heading: string
  text: string
  link: string
  button: { bg: string; text: string; label: string }
  presets: { section: string; text: string; button: string }
}

export const SECTION_KINDS: SectionKind[] = ['light', 'surface', 'subtle', 'brand', 'secondary', 'dark']

export function sectionStyles(sys: DesignSystem): Record<SectionKind, SectionStyle> {
  const scales = buildScales(sys)
  const t = buildTokens(sys, 'light', scales)
  const d = buildTokens(sys, 'dark', scales)
  const light = scales.neutral[0]
  const dark = scales.neutral[9]
  const primaryBtn = { bg: t.primary.hex, text: t['on-primary'].hex, label: 'Primary Button' }
  const lightBtn = { bg: light, text: t['primary-text'].hex, label: 'Light Button (on dark or brand)' }
  // on a light brand colour a light button would vanish; use the secondary button instead
  const brandBtn = contrastRatio(lightBtn.bg, t.primary.hex) >= 1.5 ? lightBtn : { bg: t.secondary.hex, text: t['on-secondary'].hex, label: 'Secondary Button' }
  return {
    light: { kind: 'light', label: 'Light', bg: t.bg.hex, heading: t.text.hex, text: t['text-muted'].hex, link: t['primary-text'].hex, button: primaryBtn, presets: { section: 'Section Light', text: 'Body Text', button: primaryBtn.label } },
    surface: { kind: 'surface', label: 'Surface', bg: t.surface.hex, heading: t.text.hex, text: t['text-muted'].hex, link: t['primary-text'].hex, button: primaryBtn, presets: { section: 'Section Surface', text: 'Body Text', button: primaryBtn.label } },
    subtle: { kind: 'subtle', label: 'Subtle brand', bg: t['primary-subtle'].hex, heading: t['on-primary-subtle'].hex, text: t['on-primary-subtle'].hex, link: t['on-primary-subtle'].hex, button: primaryBtn, presets: { section: 'Section Subtle', text: 'Body Text', button: primaryBtn.label } },
    brand: { kind: 'brand', label: 'Brand', bg: t.primary.hex, heading: t['on-primary'].hex, text: t['on-primary'].hex, link: t['on-primary'].hex, button: brandBtn, presets: { section: 'Section Brand', text: 'Text on Brand', button: brandBtn.label } },
    secondary: { kind: 'secondary', label: 'Secondary', bg: t.secondary.hex, heading: t['on-secondary'].hex, text: t['on-secondary'].hex, link: t['on-secondary'].hex, button: primaryBtn, presets: { section: 'Section Secondary', text: 'Body Text', button: primaryBtn.label } },
    dark: { kind: 'dark', label: 'Dark', bg: dark, heading: light, text: scales.neutral[2], link: d['primary-text'].hex, button: { bg: d.primary.hex, text: d['on-primary'].hex, label: 'Primary Button' }, presets: { section: 'Section Dark', text: 'Text on Dark', button: 'Primary Button' } },
  }
}

export type SectionCheck = { label: string; ratio: number; min: number; pass: boolean }
export function checkSection(s: SectionStyle): SectionCheck[] {
  const c = (label: string, fg: string, bg: string, min: number) => {
    const ratio = contrastRatio(fg, bg)
    return { label, ratio, min, pass: ratio >= min }
  }
  return [c('Heading', s.heading, s.bg, 3), c('Body text', s.text, s.bg, 4.5), c('Links', s.link, s.bg, 4.5), c('Button text', s.button.text, s.button.bg, 4.5), c('Button vs section', s.button.bg, s.bg, 1.3)]
}

/* ---------- CSS for Divi Theme Options ---------- */

export function diviCss(sys: DesignSystem): string {
  const st = sectionStyles(sys)
  const block = (k: SectionKind) => {
    const s = st[k]
    return `.d5-section-${k} {
  background-color: ${s.bg};
  color: ${s.text};
}
.d5-section-${k} h1, .d5-section-${k} h2, .d5-section-${k} h3,
.d5-section-${k} h4, .d5-section-${k} h5, .d5-section-${k} h6 {
  color: ${s.heading};
}
.d5-section-${k} a:not(.et_pb_button) {
  color: ${s.link};
}`
  }
  return `${exportTokens(sys, 'css')}
/* ---------- Divi helper classes ----------
   Add a class in a section, row or module: Advanced → CSS ID & Classes → CSS Class. */
${SECTION_KINDS.map(block).join('\n\n')}

.d5-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-m);
}
.d5-text-muted { color: var(--text-muted); }
.d5-text-primary { color: var(--primary-text); }
.d5-bg-surface { background-color: var(--surface); }
.d5-bg-primary { background-color: var(--primary); color: var(--on-primary); }
.d5-focus-ring :focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
.d5-card { box-shadow: var(--shadow-sm); }

/* layout library: coloured tiles, images, comparison table, style-guide swatches */
.d5-tile { padding: var(--space-l); border: 0; }
.d5-tile-surface { background-color: var(--surface); color: var(--text); }
.d5-tile-subtle { background-color: var(--primary-subtle); color: var(--on-primary-subtle); }
.d5-tile-brand { background-color: var(--primary); color: var(--on-primary); }
.d5-tile-dark { background-color: var(--neutral-900); color: var(--neutral-50); }
.d5-img img { width: 100%; border-radius: var(--radius); }
.d5-avatar img { width: 96px; height: 96px; object-fit: cover; border-radius: 50%; }
.d5-logo img { max-height: 48px; width: auto; opacity: 0.75; filter: grayscale(1); transition: opacity var(--duration-base) var(--ease-standard); }
.d5-logo img:hover { opacity: 1; filter: none; }
.d5-table { width: 100%; border-collapse: collapse; }
.d5-table th, .d5-table td { padding: 12px 14px; border-bottom: var(--border-thin) solid var(--border); text-align: center; }
.d5-table th:first-child, .d5-table td:first-child { text-align: left; }
.d5-table th:nth-child(2), .d5-table td:nth-child(2) { background-color: var(--primary-subtle); color: var(--on-primary-subtle); font-weight: 700; }
.d5-swatch { height: 72px; border-radius: var(--radius); border: var(--border-thin) solid var(--border); margin-bottom: 8px; }

${effectHelpers(sys)}
`
}

/* ---------- gradient backgrounds ---------- */

/** Divi 5 gradient background value (as in a real export: background.desktop.value.gradient). */
export type DiviGradient = { enabled: 'on'; type: 'linear' | 'circular'; direction?: string; directionRadial?: string; stops: { position: number; color: string }[]; length: string }

/**
 * Gradient in Divi's format. Divi blends in sRGB, so for smoother (OKLab-like) results pass extra stops,
 * e.g. sampled with sampleGradient() in the gradient tool.
 */
export function diviGradient(stops: { color: string; pos: number }[], type: 'linear' | 'circular', direction: string): DiviGradient {
  return {
    enabled: 'on',
    type,
    ...(type === 'linear' ? { direction } : { directionRadial: direction }),
    stops: [...stops].sort((a, b) => a.pos - b.pos).map((st) => ({ position: Math.round(st.pos * 10) / 10, color: st.color })),
    length: '100%',
  }
}

/** A tiny import file with one section preset that uses the gradient. */
export function gradientPresetFile(name: string, g: DiviGradient, source?: DiviExport | null, now = Date.now()): DiviExport {
  const version = latestVersion(source)
  const id = stableId('p:' + normLabel(`divi/section ${name}`))
  const defId = stableId('p:' + normLabel('divi/section default'))
  const src = source?.presets.module?.['divi/section']
  const def = src?.default && src.items[src.default] ? { id: src.default, item: src.items[src.default] } : { id: defId, item: { id: defId, name: 'Section Preset 1', moduleName: 'divi/section', version, type: 'module' as const, created: now, updated: now } }
  const attrs = { module: { decoration: { background: { desktop: { value: { color: g.stops[0]?.color ?? '#ffffff', gradient: g } } } } } }
  return {
    context: 'et_builder',
    data: [],
    presets: {
      module: { 'divi/section': { default: def.id, items: { [def.id]: def.item, [id]: { id, name, moduleName: 'divi/section', version, type: 'module', created: now, updated: now, attrs, styleAttrs: attrs } } } },
      group: {},
    },
    global_colors: [],
    global_variables: [],
    page_settings_meta: null,
    canvases: [],
    components: [],
    images: [],
    thumbnails: [],
  }
}
