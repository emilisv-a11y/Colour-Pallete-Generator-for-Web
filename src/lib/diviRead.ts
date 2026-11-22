/* ============================================================================
   Divi 5 round trip, part 1: read an existing site's export back into a
   design system (colours → roles, fonts, fluid type, radius, buttons).
   Every detected value carries a plain-language source so the user can check it.
   ========================================================================== */

import { converter, formatHex } from 'culori'
import { hexToOklch, oklchToHex } from './color'
import { metaFor } from './fonts'
import { parseRef, resolveColor, BUILTIN_COLORS, DIVI_BODY_FONT, DIVI_HEADING_FONT, type DiviExport, type DiviPreset } from './divi'
import { RATIOS, DEFAULT_TYPE, STEP_NAMES, type TypeSettings } from './typography'
import { ROLE_KEYS, systemFromPalette, type DesignSystem, type RoleKey } from './system'

/* ---------- CSS length evaluation (px) ---------- */

type Tok = { t: 'num'; v: number; unit: string } | { t: 'op'; v: string } | { t: 'fn'; v: string }

function tokenize(s: string): Tok[] | null {
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    const num = s.slice(i).match(/^(\d*\.\d+|\d+\.?\d*)(e[+-]?\d+)?([a-z%]*)/i)
    if (num && /[\d.]/.test(ch)) {
      out.push({ t: 'num', v: parseFloat(num[1] + (num[2] ?? '')), unit: num[3].toLowerCase() })
      i += num[0].length
      continue
    }
    const fn = s.slice(i).match(/^(calc|clamp|min|max)\s*\(/i)
    if (fn) {
      out.push({ t: 'fn', v: fn[1].toLowerCase() })
      i += fn[0].length
      continue
    }
    if ('+-*/(),'.includes(ch)) {
      out.push({ t: 'op', v: ch })
      i++
      continue
    }
    return null
  }
  return out
}

/** Evaluate a CSS length (px, rem, em, vw, calc, clamp, min, max) to px at a viewport width. null if unsupported. */
export function evalLength(expr: string, vw: number, rootPx = 16): number | null {
  const toks = tokenize(expr.trim())
  if (!toks || !toks.length) return null
  let p = 0
  const peek = () => toks[p]
  const isOp = (v: string) => peek()?.t === 'op' && peek().v === v
  const fail = () => {
    throw new Error('bad')
  }
  const expect = (v: string) => (isOp(v) ? p++ : fail())
  const unitPx = (v: number, unit: string) => {
    switch (unit) {
      case '':
      case 'px':
        return v
      case 'rem':
      case 'em':
        return v * rootPx
      case 'vw':
        return (v * vw) / 100
      default:
        return fail()
    }
  }
  const args = (): number[] => {
    const a = [sum()]
    while (isOp(',')) {
      p++
      a.push(sum())
    }
    expect(')')
    return a
  }
  const factor = (): number => {
    const t = peek()
    if (!t) return fail()
    if (t.t === 'op' && t.v === '-') {
      p++
      return -factor()
    }
    if (t.t === 'op' && t.v === '+') {
      p++
      return factor()
    }
    if (t.t === 'num') {
      p++
      return unitPx(t.v, t.unit)
    }
    if (t.t === 'op' && t.v === '(') {
      p++
      const v = sum()
      expect(')')
      return v
    }
    if (t.t === 'fn') {
      p++
      const a = args()
      if (t.v === 'calc') return a.length === 1 ? a[0] : fail()
      if (t.v === 'min') return Math.min(...a)
      if (t.v === 'max') return Math.max(...a)
      if (t.v === 'clamp') return a.length === 3 ? Math.max(a[0], Math.min(a[1], a[2])) : fail()
    }
    return fail()
  }
  const term = (): number => {
    let v = factor()
    while (isOp('*') || isOp('/')) {
      const op = toks[p++].v
      const r = factor()
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  const sum = (): number => {
    let v = term()
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  try {
    const v = sum()
    return p === toks.length && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

/** Replace $variable(content gvid…)$ references with the variable's value (a few levels deep). */
export function resolveValue(value: string, src: DiviExport, depth = 0): string {
  if (depth > 6) return value
  return value.replace(/\$variable\((.*?)\)\$/g, (m) => {
    const ref = parseRef(m)
    if (!ref || ref.type !== 'content') return m
    const v = src.global_variables.find((x) => x.id === ref.name)
    return v ? resolveValue(v.value, src, depth + 1) : m
  })
}

export type FluidRead = { minPx: number; maxPx: number; minVw: number; maxVw: number; fluid: boolean }

/** How a length behaves across screen widths: its smallest/largest size and where it starts/stops changing. */
export function readFluid(value: string, src?: DiviExport): FluidRead | null {
  const v = src ? resolveValue(value, src) : value
  const at = (w: number) => evalLength(v, w)
  const lo = 200,
    hi = 2560,
    step = 10
  const a = at(lo),
    b = at(hi)
  if (a === null || b === null) return null
  const r2 = (n: number) => Math.round(n * 100) / 100
  if (Math.abs(a - b) < 0.01) return { minPx: r2(a), maxPx: r2(a), minVw: 0, maxVw: 0, fluid: false }
  let minVw = lo,
    maxVw = hi
  for (let w = lo; w <= hi; w += step) {
    if (Math.abs((at(w) ?? a) - a) > 0.005) break
    minVw = w
  }
  for (let w = hi; w >= lo; w -= step) {
    if (Math.abs((at(w) ?? b) - b) > 0.005) break
    maxVw = w
  }
  return { minPx: r2(a), maxPx: r2(b), minVw, maxVw, fluid: true }
}

/** Top-level clamp(min, preferred, max) whose minimum is larger than its maximum: browsers then always use the minimum. */
export function clampIssue(value: string, src?: DiviExport): string | null {
  const v = (src ? resolveValue(value, src) : value).trim()
  if (!/^clamp\(/i.test(v) || !v.endsWith(')')) return null
  const inner = v.slice(v.indexOf('(') + 1, -1)
  const parts: string[] = []
  let depth = 0,
    cur = ''
  for (const ch of inner) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  if (parts.length !== 3) return null
  const lo = evalLength(parts[0], 1000),
    hi = evalLength(parts[2], 1000)
  if (lo === null || hi === null || lo <= hi + 0.01) return null
  return `its clamp() minimum (${parts[0].trim()}) is larger than its maximum (${parts[2].trim()}), so browsers always use ${Math.round(lo * 100) / 100}px`
}

export const fluidText = (f: FluidRead | null) => (!f ? '' : f.fluid ? `${f.minPx}–${f.maxPx}px on ${f.minVw}–${f.maxVw}px screens` : `${f.minPx}px`)

/* ---------- colours ---------- */

const toHsl = converter('hsl')

/** Divi relative colours shift hue (degrees) and saturation/lightness (percentage points). Approximation of Divi's own maths. */
export function applyRelative(hex: string, settings: Record<string, unknown>): string {
  const c = toHsl(hex)
  if (!c) return hex
  const num = (k: string) => (typeof settings[k] === 'number' ? (settings[k] as number) : parseFloat(String(settings[k] ?? 0)) || 0)
  const h = ((c.h ?? 0) + num('hue') + 360) % 360
  const s = Math.min(1, Math.max(0, (c.s ?? 0) + num('saturation') / 100))
  const l = Math.min(1, Math.max(0, c.l + num('lightness') / 100))
  return formatHex({ mode: 'hsl', h, s, l }).toLowerCase()
}

/** Resolve a global colour to hex, applying relative-colour settings approximately. */
export function resolveHex(id: string, src: DiviExport, depth = 0): { hex: string | null; approx: boolean } {
  if (depth > 8) return { hex: null, approx: false }
  const entry = src.global_colors.find(([k]) => k === id)?.[1]
  if (!entry) return { hex: null, approx: false }
  const ref = parseRef(entry.color)
  if (!ref) return { hex: resolveColor(id, src).hex?.slice(0, 7) ?? null, approx: false }
  const inner = resolveHex(ref.name, src, depth + 1)
  if (!inner.hex) return inner
  const rel = Object.keys(ref.settings).length > 0
  return { hex: rel ? applyRelative(inner.hex, ref.settings) : inner.hex, approx: inner.approx || rel }
}

export type SiteColor = {
  id: string
  label: string
  hex: string | null
  approx: boolean
  linked: boolean
  uses: number
  asBackground: number
  asText: number
  asButton: number
}

type Usage = { uses: number; asBackground: number; asText: number; asButton: number }

function allPresets(src: DiviExport): DiviPreset[] {
  const out: DiviPreset[] = []
  for (const bag of [src.presets?.module ?? {}, src.presets?.group ?? {}]) for (const g of Object.values(bag)) out.push(...Object.values(g.items ?? {}))
  return out
}

/** Walk every string in a preset's attrs with its key path. */
function walkStrings(v: unknown, path: string[], fn: (s: string, path: string[]) => void) {
  if (typeof v === 'string') fn(v, path)
  else if (Array.isArray(v)) v.forEach((x) => walkStrings(x, path, fn))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStrings(x, [...path, k], fn)
}

function colourUsage(src: DiviExport): Map<string, Usage> {
  const map = new Map<string, Usage>()
  const get = (id: string) => {
    if (!map.has(id)) map.set(id, { uses: 0, asBackground: 0, asText: 0, asButton: 0 })
    return map.get(id)!
  }
  for (const p of allPresets(src)) {
    const isButton = /button/.test(p.moduleName ?? '') || /button/.test(String(p.groupName ?? ''))
    walkStrings(p.attrs, [], (s, path) => {
      const ref = parseRef(s)
      if (!ref || ref.type !== 'color') return
      const u = get(ref.name)
      u.uses++
      const bg = path.includes('background')
      if (bg) u.asBackground++
      if (path.includes('font')) u.asText++
      if (bg && isButton && path.includes('desktop') && path.includes('value')) u.asButton++
    })
  }
  for (const [, c] of src.global_colors) {
    const ref = parseRef(c.color)
    if (ref?.type === 'color') get(ref.name).uses++
  }
  return map
}

export function siteColors(src: DiviExport): SiteColor[] {
  const usage = colourUsage(src)
  return src.global_colors.map(([id, c]) => {
    const { hex, approx } = resolveHex(id, src)
    const u = usage.get(id) ?? { uses: 0, asBackground: 0, asText: 0, asButton: 0 }
    return { id, label: c.label, hex, approx, linked: !!parseRef(c.color), ...u }
  })
}

const isGrey = (hex: string) => hexToOklch(hex).c < 0.04
const isChromatic = (hex: string) => {
  const o = hexToOklch(hex)
  return o.c >= 0.04 && o.l > 0.15 && o.l < 0.97
}
const far = (a: string, b: string) => {
  const x = hexToOklch(a),
    y = hexToOklch(b)
  const dh = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h))
  return Math.abs(x.l - y.l) > 0.08 || Math.abs(x.c - y.c) > 0.05 || dh > 20
}

const ROLE_LABELS: Record<RoleKey, RegExp> = {
  primary: /primary|brand|main/i,
  secondary: /secondary/i,
  accent: /accent|highlight/i,
  neutral: /neutral|gr[ae]y|slate|stone|zinc|ink|charcoal/i,
  success: /success|positive|valid/i,
  warning: /warning|caution|attention/i,
  error: /error|danger|alert|invalid/i,
  info: /\binfo|notice|information/i,
}

export type RoleHow = 'label' | 'button' | 'usage' | 'text' | 'generated'
export type RoleFinding = { role: RoleKey; hex: string; how: RoleHow; source: string; colorId?: string }

/* ---------- reading ---------- */

export type FontFinding = { family: string; how: 'preset' | 'default'; source: string; known: boolean }
export type TypeFinding = { settings: TypeSettings; how: 'variables' | 'partial' | 'default'; source: string; points: { label: string; step: number; read: FluidRead }[] }
export type ButtonFinding = { name: string; background: string | null; backgroundLabel: string; text: string | null; radius: string | null }
export type ReadNote = { area: 'colours' | 'fonts' | 'type' | 'radius' | 'buttons'; level: 'info' | 'warn'; text: string }

export type SiteReading = {
  system: DesignSystem
  colors: SiteColor[]
  roles: RoleFinding[]
  fonts: { heading: FontFinding; body: FontFinding }
  type: TypeFinding
  radius: { px: number; how: 'variable' | 'preset' | 'default'; source: string }
  button: ButtonFinding | null
  textColor: { hex: string; source: string } | null
  spacing: { label: string; read: FluidRead | null }[]
  notes: ReadNote[]
}

const colourLabel = (src: DiviExport, id: string) => src.global_colors.find(([k]) => k === id)?.[1].label ?? id

function findButton(src: DiviExport): ButtonFinding | null {
  const cands: { p: DiviPreset; isDefault: boolean }[] = []
  for (const bag of [src.presets?.module ?? {}, src.presets?.group ?? {}])
    for (const [name, g] of Object.entries(bag)) if (/button/.test(name)) for (const p of Object.values(g.items ?? {})) cands.push({ p, isDefault: g.default === p.id })
  const scored = cands
    .map(({ p, isDefault }) => {
      const dec = (p.attrs as { button?: { decoration?: Record<string, unknown> } } | null)?.button?.decoration
      const bgRef = parseRef((dec?.background as { desktop?: { value?: { color?: string } } })?.desktop?.value?.color)
      const font = dec?.font as { font?: { desktop?: { value?: { color?: string } } } } | undefined
      const txRef = parseRef(font?.font?.desktop?.value?.color)
      const radius = (dec?.border as { desktop?: { value?: { radius?: { topLeft?: string } } } })?.desktop?.value?.radius?.topLeft ?? null
      const score = (bgRef ? 2 : 0) + (/main|primary/i.test(p.name) ? 2 : 0) + (isDefault ? 0 : 1)
      return { p, bgRef, txRef, radius, score }
    })
    .filter((x) => x.bgRef)
    .sort((a, b) => b.score - a.score)
  const best = scored[0]
  if (!best) return null
  return {
    name: best.p.name,
    background: best.bgRef ? resolveHex(best.bgRef.name, src).hex : null,
    backgroundLabel: best.bgRef ? colourLabel(src, best.bgRef.name) : '',
    text: best.txRef ? resolveHex(best.txRef.name, src).hex : null,
    radius: best.radius,
  }
}

function findFonts(src: DiviExport) {
  const heading = new Map<string, number>()
  const body = new Map<string, number>()
  let usesGlobal = false
  const add = (m: Map<string, number>, f: string, w = 1) => m.set(f, (m.get(f) ?? 0) + w)
  for (const p of allPresets(src)) {
    walkStrings(p.attrs, [], (s, path) => {
      if (path[path.length - 1] !== 'family') return
      const ref = parseRef(s)
      if (ref) {
        if (ref.name === DIVI_HEADING_FONT || ref.name === DIVI_BODY_FONT) usesGlobal = true
        return
      }
      const isHeading = path.includes('headingFont') || p.moduleName === 'divi/heading'
      const h1 = path.includes('h1') ? 1 : 0
      if (isHeading) add(heading, s, 1 + h1)
      else add(body, s)
    })
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  return { heading: top(heading), body: top(body), usesGlobal }
}

/** Map a variable label to a type-scale step, or null when it isn't a text size. */
export function stepForLabel(label: string, stepsUp = DEFAULT_TYPE.stepsUp): number | null {
  const l = label.toLowerCase().trim()
  const h = l.match(/^(?:text[-_ ]?|font[-_ ]?size[-_ ]?|fs[-_ ]?)?h([1-6])$/)
  if (h) return stepsUp + 1 - Number(h[1])
  const m = l.match(/^(?:text|font[-_ ]?size|fs)[-_ ]?(.+)$/)
  if (!m) return /^(body|base)[-_ ]?(text|size)?$/.test(l) ? 0 : null
  const name = m[1].replace(/[_ ]/g, '-')
  if (['base', 'body', 'm', 'md', 'p', 'default'].includes(name)) return 0
  const alias: Record<string, string> = { s: 'sm', l: 'lg', xxl: '2xl', xxxl: '3xl', xxs: '2xs' }
  const key = alias[name] ?? name
  const hit = Object.entries(STEP_NAMES).find(([, n]) => n === key)
  return hit ? Number(hit[0]) : null
}

const snapRatio = (r: number) => {
  const c = Math.min(1.7, Math.max(1.05, r))
  const near = RATIOS.find((x) => Math.abs(x.value - c) < 0.015)
  return near ? near.value : Math.round(c * 1000) / 1000
}
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : NaN
}

function findType(src: DiviExport): TypeFinding {
  const points = src.global_variables
    .map((v) => ({ label: v.label, step: stepForLabel(v.label), read: readFluid(v.value, src) }))
    .filter((x): x is { label: string; step: number; read: FluidRead } => x.step !== null && !!x.read)
  // screen range from every fluid variable on the site (type, spacing, radius…)
  const fluids = src.global_variables.map((v) => readFluid(v.value, src)).filter((f): f is FluidRead => !!f?.fluid)
  const settings: TypeSettings = { ...DEFAULT_TYPE }
  if (fluids.length) {
    settings.minVw = Math.round(median(fluids.map((f) => f.minVw)))
    settings.maxVw = Math.round(median(fluids.map((f) => f.maxVw)))
    if (settings.maxVw - settings.minVw < 200) Object.assign(settings, { minVw: DEFAULT_TYPE.minVw, maxVw: DEFAULT_TYPE.maxVw })
  }
  const steps = new Set(points.map((p) => p.step))
  if (!points.length) return { settings, how: 'default', source: 'No text-size variables found, so the standard type scale is used.', points }
  const fit = (pick: (r: FluidRead) => number) => {
    // log(size) = log(base) + step · log(ratio)
    const xs = points.map((p) => p.step),
      ys = points.map((p) => Math.log(pick(p.read)))
    const n = xs.length,
      mx = xs.reduce((a, b) => a + b, 0) / n,
      my = ys.reduce((a, b) => a + b, 0) / n
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0)
    const slope = sxx ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx : 0
    return { base: Math.exp(my - slope * mx), ratio: Math.exp(slope) }
  }
  if (steps.size >= 2) {
    const lo = fit((r) => r.minPx),
      hi = fit((r) => r.maxPx)
    Object.assign(settings, {
      minBase: Math.round(lo.base * 2) / 2,
      maxBase: Math.round(hi.base * 2) / 2,
      minRatio: snapRatio(lo.ratio),
      maxRatio: snapRatio(hi.ratio),
    })
    return { settings, how: 'variables', source: `Fitted from ${points.length} text-size variables (${points.map((p) => p.label).join(', ')}).`, points }
  }
  const base = points.find((p) => p.step === 0)
  if (base) {
    Object.assign(settings, { minBase: Math.round(base.read.minPx * 2) / 2, maxBase: Math.round(base.read.maxPx * 2) / 2 })
    return { settings, how: 'partial', source: `Body size from “${base.label}”; the scale ratio is the standard one because only one text size was found.`, points }
  }
  return { settings, how: 'default', source: `Only “${points[0].label}” was found, which isn't enough to work out the body size, so the standard type scale is used.`, points }
}

function findRadius(src: DiviExport, button: ButtonFinding | null): SiteReading['radius'] {
  const vars = src.global_variables.filter((v) => /radius/i.test(v.label))
  const pick = vars.find((v) => /^(border[-_ ]?)?radius([-_ ]?(m|md|base|default))?$/i.test(v.label.trim())) ?? vars[Math.floor(vars.length / 2)]
  if (pick) {
    const f = readFluid(pick.value, src)
    if (f) return { px: Math.round(f.maxPx), how: 'variable', source: `From the variable “${pick.label}” (${fluidText(f)}).` }
  }
  if (button?.radius) {
    const f = readFluid(button.radius, src)
    if (f) return { px: Math.round(f.maxPx), how: 'preset', source: `From the button preset “${button.name}”.` }
  }
  return { px: 10, how: 'default', source: 'No radius found, so the standard 10px is used.' }
}

function textColour(colors: SiteColor[]): SiteReading['textColor'] {
  for (const id of [BUILTIN_COLORS.body, BUILTIN_COLORS.heading]) {
    const c = colors.find((x) => x.id === id)
    if (c?.hex) return { hex: c.hex, source: `Divi's “${c.label}”${c.approx ? ' (relative colour, approximate)' : ''}` }
  }
  const t = colors.filter((c) => c.hex && c.asText > 0).sort((a, b) => b.asText - a.asText)[0]
  return t?.hex ? { hex: t.hex, source: `“${t.label}”, the colour presets use most for text` } : null
}

/** Rebuild a design system from a Divi 5 export. */
export function readDiviSite(src: DiviExport, name = 'Imported site'): SiteReading {
  const notes: ReadNote[] = []
  const colors = siteColors(src)
  const button = findButton(src)
  const withHex = colors.filter((c): c is SiteColor & { hex: string } => !!c.hex)
  const chromatic = withHex.filter((c) => isChromatic(c.hex))
  const byUse = [...chromatic].sort((a, b) => b.uses - a.uses)
  const found: Partial<Record<RoleKey, RoleFinding>> = {}
  const taken: string[] = []
  const free = (hex: string) => taken.every((t) => far(t, hex))
  const set = (role: RoleKey, f: RoleFinding) => {
    found[role] = f
    taken.push(f.hex)
  }
  const describe = (c: SiteColor) => `“${c.label}”${c.uses ? `, used ${c.uses}× in presets` : ''}${c.approx ? ' (relative colour, approximate)' : ''}`

  // primary: Divi's own primary colour, a "brand/primary" label, the main button, then the most used colour
  const builtin = chromatic.find((c) => c.id === BUILTIN_COLORS.primary)
  const labelled = (role: RoleKey) => chromatic.find((c) => c.id !== BUILTIN_COLORS.primary && ROLE_LABELS[role].test(c.label) && free(c.hex))
  const primaryPick = builtin ?? labelled('primary')
  if (primaryPick) set('primary', { role: 'primary', hex: primaryPick.hex, how: 'label', source: describe(primaryPick), colorId: primaryPick.id })
  else if (button?.background && isChromatic(button.background)) set('primary', { role: 'primary', hex: button.background, how: 'button', source: `Background of the button preset “${button.name}”` })
  else if (byUse[0]) set('primary', { role: 'primary', hex: byUse[0].hex, how: 'usage', source: describe(byUse[0]), colorId: byUse[0].id })

  for (const role of ['secondary', 'accent', 'success', 'warning', 'error', 'info'] as RoleKey[]) {
    const c = labelled(role)
    if (c) set(role, { role, hex: c.hex, how: 'label', source: describe(c), colorId: c.id })
  }
  // unlabelled secondary/accent: the next most used distinct colours
  for (const role of ['secondary', 'accent'] as RoleKey[]) {
    if (found[role]) continue
    const c = byUse.find((x) => free(x.hex) && !Object.values(found).some((f) => f?.colorId === x.id))
    if (c) set(role, { role, hex: c.hex, how: 'usage', source: describe(c), colorId: c.id })
  }
  const dupes = chromatic.filter((c) => !free(c.hex) && !Object.values(found).some((f) => f?.colorId === c.id))
  dupes.forEach((c) => notes.push({ area: 'colours', level: 'info', text: `“${c.label}” is the same (or nearly the same) colour as another role, so it wasn't used as a separate role.` }))

  // neutral: a grey label, else the text colour's hue
  const text = textColour(colors)
  const greyLabel = withHex.find((c) => isGrey(c.hex) && ROLE_LABELS.neutral.test(c.label))
  const greyMid = withHex.filter((c) => isGrey(c.hex) && hexToOklch(c.hex).l > 0.2 && hexToOklch(c.hex).l < 0.9).sort((a, b) => b.uses - a.uses)[0]
  const neutralPick = greyLabel ?? greyMid
  let neutralAnchor: number | null = null
  if (neutralPick) set('neutral', { role: 'neutral', hex: neutralPick.hex, how: 'label', source: describe(neutralPick), colorId: neutralPick.id })
  else if (text && isGrey(text.hex)) {
    const o = hexToOklch(text.hex)
    set('neutral', { role: 'neutral', hex: oklchToHex(0.55, Math.min(o.c, 0.02), o.h), how: 'text', source: `A grey scale based on the text colour (${text.source})` })
    neutralAnchor = 5
  }

  // fill anything still missing like the generator would
  const base = systemFromPalette(
    [found.primary?.hex, found.secondary?.hex, found.accent?.hex].filter((h): h is string => !!h).concat(chromatic.length ? [] : ['#3b6ef5']),
    name,
  )
  const roles: RoleFinding[] = ROLE_KEYS.map((role) => found[role] ?? { role, hex: base.roles[role].hex, how: 'generated', source: 'Not found on the site, so one was generated to match' })
  if (!chromatic.length) notes.push({ area: 'colours', level: 'warn', text: 'The site has no colourful global colours, so the brand colours were generated. Pick them in the review below.' })

  // fonts
  const f = findFonts(src)
  const font = (family: string | undefined, kind: 'heading' | 'body', fallback: string): FontFinding => {
    if (!family) return { family: fallback, how: 'default', source: f.usesGlobal ? `Your presets use Divi's global ${kind} font, which isn't saved in the export. Choose it below.` : 'No font found in the presets.', known: true }
    const known = !!metaFor(family)
    return { family, how: 'preset', source: `Used in your ${kind === 'heading' ? 'heading' : 'text'} presets`, known }
  }
  const heading = font(f.heading, 'heading', f.body ?? 'Manrope')
  const bodyF = font(f.body, 'body', f.heading ?? 'Manrope')
  if (f.usesGlobal) notes.push({ area: 'fonts', level: 'info', text: "Some presets use Divi's global heading/body fonts. Their families are set in Divi (Theme Options), not in the export, so check the fonts in the review." })
  for (const x of [heading, bodyF]) if (!x.known) notes.push({ area: 'fonts', level: 'warn', text: `“${x.family}” isn't a Google Font, so previews use a fallback. It still goes into the design system.` })

  for (const v of src.global_variables) {
    const issue = clampIssue(v.value, src)
    if (issue) notes.push({ area: 'type', level: 'warn', text: `The variable “${v.label}” doesn't scale: ${issue}. Fix it in Divi, or let the import replace it.` })
  }
  const type = findType(src)
  const radius = findRadius(src, button)
  const spacing = src.global_variables.filter((v) => /^(space|spacing|gap|padding)/i.test(v.label)).map((v) => ({ label: v.label, read: readFluid(v.value, src) }))
  if (spacing.length) notes.push({ area: 'type', level: 'info', text: `Spacing variables (${spacing.map((s) => s.label).join(', ')}) are listed for reference. The design system builds its spacing from the body size, so they show up under Site differences.` })
  const headingPresetSizes = allPresets(src).filter((p) => p.moduleName === 'divi/heading' || p.moduleName === 'divi/text')
  if (type.how !== 'variables' && headingPresetSizes.length) notes.push({ area: 'type', level: 'info', text: 'Font sizes set directly in presets (not as variables) are not used for the type scale, because they are often one-off display sizes.' })

  const fontsMeta: Record<string, NonNullable<ReturnType<typeof metaFor>>> = {}
  for (const fam of [heading.family, bodyF.family]) {
    const m = metaFor(fam)
    if (m) fontsMeta[fam] = m
  }
  const system: DesignSystem = {
    name,
    roles: Object.fromEntries(roles.map((r) => [r.role, { hex: r.hex, anchor: r.role === 'neutral' ? (r.how === 'generated' ? base.roles.neutral.anchor : neutralAnchor) : null }])) as DesignSystem['roles'],
    overrides: { light: {}, dark: {} },
    fonts: { heading: heading.family, body: bodyF.family, meta: fontsMeta },
    radius: radius.px,
    notes: `Read from a Divi 5 export on ${new Date().toLocaleDateString('en-GB')}.`,
    type: type.settings,
  }
  // keep the site's exact text colour when it is a dark, readable colour
  if (text && hexToOklch(text.hex).l < 0.45) system.overrides.light.text = text.hex

  return { system, colors, roles, fonts: { heading, body: bodyF }, type, radius, button, textColor: text, spacing, notes }
}

/** Rebuild the design system after the user changes roles or fonts in the review. */
export function applyReview(r: SiteReading, edits: { roles?: Partial<Record<RoleKey, string>>; heading?: string; body?: string; name?: string; keepTextColour?: boolean }): DesignSystem {
  const sys = structuredClone(r.system)
  if (edits.name) sys.name = edits.name
  for (const [role, hex] of Object.entries(edits.roles ?? {}) as [RoleKey, string][]) {
    if (hex && hex !== r.system.roles[role].hex) sys.roles[role] = { hex, anchor: null }
  }
  if (edits.heading) sys.fonts.heading = edits.heading
  if (edits.body) sys.fonts.body = edits.body
  const meta: Record<string, NonNullable<ReturnType<typeof metaFor>>> = {}
  for (const fam of [sys.fonts.heading, sys.fonts.body]) {
    const m = metaFor(fam)
    if (m) meta[fam] = m
  }
  sys.fonts.meta = meta
  if (edits.keepTextColour === false) delete sys.overrides.light.text
  return sys
}
