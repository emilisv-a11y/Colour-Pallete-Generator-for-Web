/* ============================================================================
   Shape & motion tokens: shadows (tinted with the brand), borders, button and
   input sizes, motion durations/easings and content widths.
   Stored on the design system as `effects` (absent in older saves → defaults).
   ========================================================================== */

import { hexToOklch, oklchToHex } from './color'
import { typeOf, type DesignSystem, type Mode } from './system'
import { typeScale } from './typography'

export type ShadowTint = 'neutral' | 'brand' | 'black'
export type EffectSettings = {
  shadowTint: ShadowTint
  /** 0.5 (subtle) … 2 (strong) */
  shadowStrength: number
  borders: { thin: number; base: number; thick: number }
  buttons: { s: number; m: number; l: number } // heights in px
  input: number // input height in px
  motion: { fast: number; base: number; slow: number } // ms
  widths: { narrow: number; container: number; wide: number } // px
}

export const DEFAULT_EFFECTS: EffectSettings = {
  shadowTint: 'brand',
  shadowStrength: 1,
  borders: { thin: 1, base: 2, thick: 4 },
  buttons: { s: 36, m: 44, l: 52 },
  input: 44,
  motion: { fast: 120, base: 200, slow: 320 },
  widths: { narrow: 720, container: 1200, wide: 1440 },
}

export const effectsOf = (sys: DesignSystem): EffectSettings => {
  const e: Partial<EffectSettings> = sys.effects ?? {}
  return {
    ...DEFAULT_EFFECTS,
    ...e,
    borders: { ...DEFAULT_EFFECTS.borders, ...(e.borders ?? {}) },
    buttons: { ...DEFAULT_EFFECTS.buttons, ...(e.buttons ?? {}) },
    motion: { ...DEFAULT_EFFECTS.motion, ...(e.motion ?? {}) },
    widths: { ...DEFAULT_EFFECTS.widths, ...(e.widths ?? {}) },
  }
}

/* ---------- shadows ---------- */

export const SHADOW_NAMES = ['sm', 'md', 'lg', 'xl'] as const
export type ShadowName = (typeof SHADOW_NAMES)[number]

// [y, blur, alpha] for the two layers of each elevation: a tight contact shadow and a soft ambient one
const LAYERS: Record<ShadowName, [number, number, number][]> = {
  sm: [
    [1, 2, 0.06],
    [1, 3, 0.1],
  ],
  md: [
    [2, 4, 0.06],
    [6, 12, 0.1],
  ],
  lg: [
    [4, 8, 0.06],
    [14, 28, 0.14],
  ],
  xl: [
    [8, 16, 0.08],
    [24, 48, 0.18],
  ],
}

/** The colour shadows are made of: a very dark shade of the brand or neutral hue (black in dark mode). */
export function shadowColor(sys: DesignSystem, mode: Mode = 'light'): string {
  const e = effectsOf(sys)
  if (mode === 'dark' || e.shadowTint === 'black') return '#000000'
  const src = e.shadowTint === 'brand' ? sys.roles.primary.hex : sys.roles.neutral.hex
  const o = hexToOklch(src)
  return oklchToHex(0.22, Math.min(o.c, e.shadowTint === 'brand' ? 0.09 : 0.02), o.h)
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function shadowCss(sys: DesignSystem, name: ShadowName, mode: Mode = 'light'): string {
  const e = effectsOf(sys)
  const c = rgb(shadowColor(sys, mode))
  const k = e.shadowStrength * (mode === 'dark' ? 2.4 : 1)
  return LAYERS[name].map(([y, blur, a]) => `0 ${y}px ${blur}px rgb(${c} / ${Math.min(0.9, Math.round(a * k * 1000) / 1000)})`).join(', ')
}

/* ---------- buttons ---------- */

export type ButtonSize = { name: 's' | 'm' | 'l'; height: number; fontPx: number; padY: number; padX: number }

/** Button sizes: font from the type scale (sm / base / lg at the large screen size), padding so the button reaches its height. */
export function buttonSizes(sys: DesignSystem): ButtonSize[] {
  const e = effectsOf(sys)
  const steps = typeScale(typeOf(sys))
  const font = (step: number) => Math.round((steps.find((s) => s.step === step)?.max ?? 16) * 10) / 10
  const make = (name: 's' | 'm' | 'l', height: number, step: number): ButtonSize => {
    const fontPx = Math.min(font(step), height * 0.45)
    const padY = Math.max(4, Math.round((height - fontPx * 1.2) / 2))
    return { name, height, fontPx: Math.round(fontPx * 10) / 10, padY, padX: Math.round(height * 0.5) }
  }
  return [make('s', e.buttons.s, -1), make('m', e.buttons.m, 0), make('l', e.buttons.l, 1)]
}

/* ---------- motion ---------- */

export const EASINGS: { name: string; css: string; use: string }[] = [
  { name: 'standard', css: 'cubic-bezier(0.2, 0, 0, 1)', use: 'Most changes: hover, colour, size' },
  { name: 'out', css: 'cubic-bezier(0, 0, 0.2, 1)', use: 'Things appearing (menus, modals)' },
  { name: 'in', css: 'cubic-bezier(0.4, 0, 1, 1)', use: 'Things leaving the screen' },
  { name: 'bounce', css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', use: 'Playful details, use sparingly' },
]

/* ---------- all values as CSS variables ---------- */

/** px → rem (16px root), so sizes follow the visitor's font-size setting. */
export const rem = (px: number) => `${Math.round((px / 16) * 10000) / 10000}rem`

export type EffectVar = { name: string; value: string; dark?: string; group: 'shadow' | 'border' | 'button' | 'motion' | 'width' }

export function effectVars(sys: DesignSystem): EffectVar[] {
  const e = effectsOf(sys)
  const out: EffectVar[] = []
  SHADOW_NAMES.forEach((n) => out.push({ group: 'shadow', name: `shadow-${n}`, value: shadowCss(sys, n, 'light'), dark: shadowCss(sys, n, 'dark') }))
  ;(['thin', 'base', 'thick'] as const).forEach((n) => out.push({ group: 'border', name: `border-${n}`, value: `${e.borders[n]}px` }))
  buttonSizes(sys).forEach((b) => {
    out.push({ group: 'button', name: `btn-${b.name}-height`, value: rem(b.height) })
    out.push({ group: 'button', name: `btn-${b.name}-pad-y`, value: rem(b.padY) })
    out.push({ group: 'button', name: `btn-${b.name}-pad-x`, value: rem(b.padX) })
    out.push({ group: 'button', name: `btn-${b.name}-font`, value: `${Math.round((b.fontPx / 16) * 1000) / 1000}rem` })
  })
  out.push({ group: 'button', name: 'input-height', value: rem(e.input) })
  ;(['fast', 'base', 'slow'] as const).forEach((n) => out.push({ group: 'motion', name: `duration-${n}`, value: `${e.motion[n]}ms` }))
  EASINGS.forEach((x) => out.push({ group: 'motion', name: `ease-${x.name}`, value: x.css }))
  ;(['narrow', 'container', 'wide'] as const).forEach((n) => out.push({ group: 'width', name: `width-${n}`, value: rem(e.widths[n]) }))
  return out
}

/** CSS variables (light + dark shadows), reduced-motion handling and small helper classes. */
export function effectsCss(sys: DesignSystem): string {
  const vars = effectVars(sys)
  const darkVars = vars.filter((v) => v.dark)
  return `/* shape & motion */
:root {
${vars.map((v) => `  --${v.name}: ${v.value};`).join('\n')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${darkVars.map((v) => `    --${v.name}: ${v.dark};`).join('\n')}
  }
}

:root[data-theme='dark'] {
${darkVars.map((v) => `  --${v.name}: ${v.dark};`).join('\n')}
}

/* people who ask their device for less motion get instant changes */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-base: 0ms;
    --duration-slow: 0ms;
  }
}`
}

/** Small helper classes for Divi (Advanced → CSS ID & Classes → CSS Class). */
export function effectHelpers(sys: DesignSystem, p = 'd5-'): string {
  const sizes = buttonSizes(sys)
  return `/* helper classes: Advanced → CSS ID & Classes → CSS Class */
${SHADOW_NAMES.map((n) => `.${p}shadow-${n} { box-shadow: var(--shadow-${n}); }`).join('\n')}
.${p}lift { transition: box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard); }
.${p}lift:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
${sizes.map((b) => `.${p}btn-${b.name} .et_pb_button, .${p}btn-${b.name}.et_pb_button { min-height: var(--btn-${b.name}-height); padding: var(--btn-${b.name}-pad-y) var(--btn-${b.name}-pad-x) !important; font-size: var(--btn-${b.name}-font) !important; }`).join('\n')}
.${p}narrow { max-width: var(--width-narrow); margin-inline: auto; }
.${p}container { max-width: var(--width-container); margin-inline: auto; }
.${p}wide { max-width: var(--width-wide); margin-inline: auto; }
input:not([type=checkbox]):not([type=radio]):not([type=submit]), select { min-height: var(--input-height); }`
}
