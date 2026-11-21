import { contrastRatio, fixContrast, hexToOklch, oklchToHex } from './color'
import { apcaContrast } from './apca'

/* ============================================================================
   Design system model
   A handful of role colours → 11-step scales (50–950) → semantic tokens for
   light and dark mode, chosen so the intended text/background pairs pass WCAG.
   ========================================================================== */

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type Step = (typeof STEPS)[number]

export const BRAND_ROLES = ['primary', 'secondary', 'accent'] as const
export const STATUS_ROLES = ['success', 'warning', 'error', 'info'] as const
export const ROLE_KEYS = [...BRAND_ROLES, 'neutral', ...STATUS_ROLES] as const
export type RoleKey = (typeof ROLE_KEYS)[number]
/** Roles that get their own set of semantic tokens (everything except neutral). */
export const TOKEN_ROLES = [...BRAND_ROLES, ...STATUS_ROLES] as const
export type TokenRole = (typeof TOKEN_ROLES)[number]

export const ROLE_INFO: Record<RoleKey, { label: string; hint: string }> = {
  primary: { label: 'Primary', hint: 'Main brand colour: buttons, links, key actions' },
  secondary: { label: 'Secondary', hint: 'Supporting brand colour: secondary buttons, highlights' },
  accent: { label: 'Accent', hint: 'Small doses of contrast: badges, icons, details' },
  neutral: { label: 'Neutral', hint: 'Backgrounds, surfaces, borders and text' },
  success: { label: 'Success', hint: 'Confirmations, positive states' },
  warning: { label: 'Warning', hint: 'Cautions, pending states' },
  error: { label: 'Error', hint: 'Errors, destructive actions' },
  info: { label: 'Info', hint: 'Neutral notices, tips' },
}

export type Mode = 'light' | 'dark'
export type SystemRole = { hex: string; /** index into STEPS where the exact colour sits; null = automatic */ anchor: number | null }
export type DesignSystem = {
  name: string
  roles: Record<RoleKey, SystemRole>
  overrides: Record<Mode, Record<string, string>>
  fonts: { heading: string; body: string }
  radius: number
  notes: string
}

/* ---------- Scales ---------- */

// Target lightness and relative chroma per step (perceptually even, similar to well-known UI scales).
const L_TARGET = [0.975, 0.94, 0.885, 0.805, 0.71, 0.62, 0.54, 0.46, 0.385, 0.315, 0.245]
const C_CURVE = [0.18, 0.32, 0.52, 0.74, 0.92, 1, 0.96, 0.86, 0.74, 0.62, 0.5]

/** Step index whose target lightness is closest to the colour. */
export function autoAnchor(hex: string) {
  const { l } = hexToOklch(hex)
  let best = 0
  L_TARGET.forEach((t, i) => {
    if (Math.abs(t - l) < Math.abs(L_TARGET[best] - l)) best = i
  })
  return best
}

/**
 * 11-step scale where the step at `anchor` is exactly the input colour. Lighter and darker steps
 * are spread between the colour and the scale ends, so the scale bends around the brand colour.
 */
export function buildScale(hex: string, anchor: number | null = null): string[] {
  const a = anchor ?? autoAnchor(hex)
  const { l, c, h } = hexToOklch(hex)
  const peak = c / C_CURVE[a]
  return STEPS.map((_, i) => {
    if (i === a) return hex
    let li: number
    if (i < a) {
      // map target range [L_TARGET[0], L_TARGET[a]] onto [L_TARGET[0], l]
      const t = (L_TARGET[i] - L_TARGET[a]) / (L_TARGET[0] - L_TARGET[a] || 1)
      li = l + t * (L_TARGET[0] - l)
    } else {
      const t = (L_TARGET[i] - L_TARGET[a]) / (L_TARGET[10] - L_TARGET[a] || 1)
      li = l + t * (L_TARGET[10] - l)
    }
    return oklchToHex(li, Math.min(0.37, peak * C_CURVE[i]), h)
  })
}

export function buildScales(sys: DesignSystem): Record<RoleKey, string[]> {
  return Object.fromEntries(ROLE_KEYS.map((k) => [k, buildScale(sys.roles[k].hex, sys.roles[k].anchor)])) as Record<RoleKey, string[]>
}

/* ---------- Semantic tokens ---------- */

export type Token = { hex: string; ref: string | null; overridden?: boolean }
export type Tokens = Record<string, Token>

export const NEUTRAL_TOKENS = ['bg', 'surface', 'surface-raised', 'border', 'border-strong', 'text', 'text-muted', 'text-subtle', 'disabled-bg', 'disabled-text', 'focus-ring'] as const
export const ROLE_TOKEN_SUFFIXES = ['', 'on', 'hover', 'active', 'subtle', 'on-subtle', 'border', 'text'] as const

/** Token name for a role variant, e.g. ('primary','on') → 'on-primary'. */
export function roleToken(role: TokenRole, variant: (typeof ROLE_TOKEN_SUFFIXES)[number]) {
  if (variant === '') return role
  if (variant === 'on') return `on-${role}`
  if (variant === 'on-subtle') return `on-${role}-subtle`
  return `${role}-${variant}`
}

export function allTokenNames(): string[] {
  return [...NEUTRAL_TOKENS, ...TOKEN_ROLES.flatMap((r) => ROLE_TOKEN_SUFFIXES.map((v) => roleToken(r, v)))]
}

const ref = (role: RoleKey, i: number) => `${role}.${STEPS[i]}`

export function buildTokens(sys: DesignSystem, mode: Mode, scales = buildScales(sys)): Tokens {
  const t: Tokens = {}
  const n = scales.neutral
  const set = (name: string, role: RoleKey | null, i: number | null, hex?: string) => {
    t[name] = role !== null && i !== null ? { hex: scales[role][i], ref: ref(role, i) } : { hex: hex!, ref: null }
  }
  /** First candidate (role step index or literal hex) meeting `min` contrast against every background. */
  const pick = (role: RoleKey, order: number[], against: string[], min: number, fallback?: string) => {
    for (const i of order) if (against.every((b) => contrastRatio(scales[role][i], b) >= min)) return { i, hex: scales[role][i] }
    if (fallback) return { i: null, hex: fallback }
    return { i: order[order.length - 1], hex: scales[role][order[order.length - 1]] }
  }
  const range = (from: number, to: number) => {
    const out: number[] = []
    const d = from <= to ? 1 : -1
    for (let i = from; d > 0 ? i <= to : i >= to; i += d) out.push(i)
    return out
  }

  if (mode === 'light') {
    set('bg', null, null, '#ffffff')
    set('surface', 'neutral', 0)
    set('surface-raised', 'neutral', 1)
    set('border', 'neutral', 2)
    const bs = pick('neutral', range(4, 10), ['#ffffff', n[0]], 3)
    set('border-strong', 'neutral', bs.i)
    const tx = pick('neutral', [9, 10], ['#ffffff', n[0], n[1]], 7, '#000000')
    tx.i === null ? set('text', null, null, tx.hex) : set('text', 'neutral', tx.i)
    const tm = pick('neutral', range(6, 10), ['#ffffff', n[0], n[1]], 4.5)
    set('text-muted', 'neutral', tm.i)
    set('text-subtle', 'neutral', 5)
    set('disabled-bg', 'neutral', 1)
    set('disabled-text', 'neutral', 4)
  } else {
    set('bg', 'neutral', 10)
    set('surface', 'neutral', 9)
    set('surface-raised', 'neutral', 8)
    set('border', 'neutral', 7)
    const bs = pick('neutral', range(5, 0), [n[10], n[9]], 3)
    set('border-strong', 'neutral', bs.i)
    const tx = pick('neutral', [0, 1], [n[10], n[9], n[8]], 7, '#ffffff')
    tx.i === null ? set('text', null, null, tx.hex) : set('text', 'neutral', tx.i)
    const tm = pick('neutral', range(3, 0), [n[10], n[9], n[8]], 4.5)
    set('text-muted', 'neutral', tm.i)
    set('text-subtle', 'neutral', 5)
    set('disabled-bg', 'neutral', 8)
    set('disabled-text', 'neutral', 6)
  }
  const bgs = [t.bg.hex, t.surface.hex]

  for (const role of TOKEN_ROLES) {
    const s = scales[role]
    const a = sys.roles[role].anchor ?? autoAnchor(sys.roles[role].hex)
    let solid = a
    if (mode === 'dark') {
      // solid fills must stand out from a dark background (3:1, like any UI component)
      while (solid > 0 && contrastRatio(s[solid], t.bg.hex) < 3) solid--
    }
    // Text on the solid colour: the scale's lightest/darkest tint, else pure white/black.
    const onFor = (i: number) => {
      const light = contrastRatio(s[i], '#ffffff') >= contrastRatio(s[i], '#000000')
      const tint = light ? 0 : 10
      return contrastRatio(s[tint], s[i]) >= 4.5 ? { light, i: tint as number | null, hex: s[tint] } : { light, i: null, hex: light ? '#ffffff' : '#000000' }
    }
    // Mid-tones where neither white nor black reaches 4.5:1: nudge the fill one step at a time.
    let on = onFor(solid)
    for (let guard = 0; guard < 10 && contrastRatio(on.hex, s[solid]) < 4.5; guard++) {
      const next = on.light ? solid + 1 : solid - 1
      if (next < 0 || next > 10) break
      solid = next
      on = onFor(solid)
    }
    set(role, role, solid)
    on.i === null ? set(roleToken(role, 'on'), null, null, on.hex) : set(roleToken(role, 'on'), role, on.i)
    // Hover/active move away from the text colour so the label stays readable.
    const dir = on.light ? 1 : -1
    const at = (k: number) => {
      const i = solid + dir * k
      return i >= 0 && i <= 10 && contrastRatio(on.hex, s[i]) >= 4.5 ? i : null
    }
    const h1 = at(1) ?? at(0)!
    const h2 = at(2) ?? h1
    set(roleToken(role, 'hover'), role, h1)
    set(roleToken(role, 'active'), role, h2)

    if (mode === 'light') {
      set(roleToken(role, 'subtle'), role, 1)
      const os = pick(role, [8, 9, 10], [s[1]], 4.5)
      set(roleToken(role, 'on-subtle'), role, os.i)
      set(roleToken(role, 'border'), role, 3)
      const tx = pick(role, range(Math.max(a, 5), 10), bgs, 4.5)
      set(roleToken(role, 'text'), role, tx.i)
    } else {
      set(roleToken(role, 'subtle'), role, 9)
      const os = pick(role, [2, 1, 0], [s[9]], 4.5)
      set(roleToken(role, 'on-subtle'), role, os.i)
      set(roleToken(role, 'border'), role, 7)
      const tx = pick(role, range(Math.min(a, 4), 0), bgs, 4.5)
      set(roleToken(role, 'text'), role, tx.i)
    }
  }
  const fr = pick('primary', mode === 'light' ? range(4, 10) : range(4, 0), [t.bg.hex, t.surface.hex], 3)
  set('focus-ring', 'primary', fr.i)

  for (const [name, hex] of Object.entries(sys.overrides[mode] ?? {})) {
    if (t[name]) t[name] = { hex, ref: null, overridden: true }
  }
  return t
}

/* ---------- Contrast pairs ---------- */

export type Pair = { fg: string; bg: string; min: number; apca: number; label: string }

/** The pairs this system promises to make readable. */
export function intendedPairs(): Pair[] {
  const pairs: Pair[] = [
    { fg: 'text', bg: 'bg', min: 4.5, apca: 75, label: 'Body text on background' },
    { fg: 'text', bg: 'surface', min: 4.5, apca: 75, label: 'Body text on surface' },
    { fg: 'text', bg: 'surface-raised', min: 4.5, apca: 75, label: 'Body text on raised surface' },
    { fg: 'text-muted', bg: 'bg', min: 4.5, apca: 60, label: 'Muted text on background' },
    { fg: 'text-muted', bg: 'surface', min: 4.5, apca: 60, label: 'Muted text on surface' },
    { fg: 'border-strong', bg: 'bg', min: 3, apca: 30, label: 'Input borders' },
    { fg: 'focus-ring', bg: 'bg', min: 3, apca: 30, label: 'Focus ring' },
    { fg: 'disabled-text', bg: 'disabled-bg', min: 1, apca: 0, label: 'Disabled (exempt from WCAG)' },
  ]
  for (const r of TOKEN_ROLES) {
    const L = ROLE_INFO[r].label
    pairs.push(
      { fg: `on-${r}`, bg: r, min: 4.5, apca: 60, label: `${L} button text` },
      { fg: `on-${r}`, bg: `${r}-hover`, min: 4.5, apca: 60, label: `${L} button text (hover)` },
      { fg: `on-${r}-subtle`, bg: `${r}-subtle`, min: 4.5, apca: 60, label: `${L} badge / alert text` },
      { fg: `${r}-text`, bg: 'bg', min: 4.5, apca: 60, label: `${L} text / links on background` },
      { fg: `${r}-text`, bg: 'surface', min: 4.5, apca: 60, label: `${L} text / links on surface` },
    )
  }
  return pairs
}

export type PairResult = Pair & { ratio: number; lc: number; pass: boolean }

export function checkPairs(tokens: Tokens, algo: 'wcag' | 'apca' = 'wcag'): PairResult[] {
  return intendedPairs().map((p) => {
    const fg = tokens[p.fg].hex
    const bg = tokens[p.bg].hex
    const ratio = contrastRatio(fg, bg)
    const lc = apcaContrast(fg, bg)
    const pass = algo === 'wcag' ? ratio >= p.min : Math.abs(lc) >= p.apca
    return { ...p, ratio, lc, pass }
  })
}

/** Suggest an override that fixes a pair: change the foreground first, the background if that fails. */
export function suggestFix(tokens: Tokens, p: Pair, algo: 'wcag' | 'apca' = 'wcag'): { token: string; hex: string } | null {
  const fg = tokens[p.fg].hex
  const bg = tokens[p.bg].hex
  if (algo === 'wcag') {
    const f = fixContrast(fg, bg, p.min)
    if (f) return { token: p.fg, hex: f }
    const b = fixContrast(bg, fg, p.min)
    return b ? { token: p.bg, hex: b } : null
  }
  // APCA: walk lightness away from the background until Lc is met
  const { l, c, h } = hexToOklch(fg)
  const bgL = hexToOklch(bg).l
  const dir = l >= bgL ? 1 : -1
  for (let k = 1; k <= 100; k++) {
    const cand = oklchToHex(l + dir * k * 0.01, c, h)
    if (Math.abs(apcaContrast(cand, bg)) >= p.apca) return { token: p.fg, hex: cand }
    if (l + dir * k * 0.01 > 1 || l + dir * k * 0.01 < 0) break
  }
  return null
}

/* ---------- Building a system from a palette ---------- */

const statusFrom = (hue: number, base: { l: number; c: number }) => oklchToHex(Math.min(0.66, Math.max(0.55, base.l)), Math.min(0.17, Math.max(0.11, base.c)), hue)

export function defaultStatus(primaryHex: string): Record<(typeof STATUS_ROLES)[number], string> {
  const p = hexToOklch(primaryHex)
  return { success: statusFrom(150, p), warning: oklchToHex(0.76, 0.16, 75), error: statusFrom(27, p), info: statusFrom(245, p) }
}

/** Assign roles from an arbitrary palette: chroma decides brand roles, the greyest colour seeds neutral. */
export function systemFromPalette(hexes: string[], name = 'My design system'): DesignSystem {
  const info = hexes.map((hex) => ({ hex, ...hexToOklch(hex) }))
  // brand colours: most colourful first, but skip near-white / near-black colours
  const usable = info.filter((x) => x.l > 0.25 && x.l < 0.92)
  const byChroma = [...(usable.length ? usable : info)].sort((a, b) => b.c - a.c)
  const primary = byChroma[0]
  const hueDist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
  const rest = byChroma.filter((x) => x.hex !== primary.hex)
  const secondary = rest[0] ?? { ...primary, hex: oklchToHex(primary.l, primary.c, primary.h + 40) }
  const accentPick = rest.filter((x) => x.hex !== secondary.hex).sort((a, b) => hueDist(b.h, primary.h) - hueDist(a.h, primary.h))[0]
  const accent = accentPick ?? { hex: oklchToHex(primary.l, primary.c, primary.h + 180) }
  // neutral: greyest colour if it is grey enough, else a faint tint of the primary hue
  const greyest = [...info].sort((a, b) => a.c - b.c)[0]
  const neutral = greyest && greyest.c < 0.04 ? greyest.hex : oklchToHex(0.55, 0.012, primary.h)
  const status = defaultStatus(primary.hex)
  const role = (hex: string): SystemRole => ({ hex, anchor: null })
  return {
    name,
    roles: {
      primary: role(primary.hex),
      secondary: role(secondary.hex),
      accent: role(accent.hex),
      neutral: { hex: neutral, anchor: greyest && greyest.c < 0.04 ? null : 5 },
      success: role(status.success),
      warning: role(status.warning),
      error: role(status.error),
      info: role(status.info),
    },
    overrides: { light: {}, dark: {} },
    fonts: { heading: 'Manrope', body: 'Manrope' },
    radius: 10,
    notes: '',
  }
}

/* ---------- 60-30-10 ---------- */

export type Bucket = 'dominant' | 'secondary' | 'accent'
/** Which share of the 60-30-10 rule a token belongs to. */
export function bucketOf(token: string): Bucket {
  if (/^(primary|accent|success|warning|error|info)|^on-(primary|accent)/.test(token)) return 'accent'
  if (/^(secondary|surface-raised|text|border-strong)|^on-secondary/.test(token)) return 'secondary'
  return 'dominant'
}
