import { hexToOklch, oklchToHex } from './color'

export type ModeId =
  | 'auto'
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'split'
  | 'triadic'
  | 'tetradic'
  | 'square'

export const MODES: { id: ModeId; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'monochromatic', label: 'Monochromatic' },
  { id: 'analogous', label: 'Analogous' },
  { id: 'complementary', label: 'Complementary' },
  { id: 'split', label: 'Split complementary' },
  { id: 'triadic', label: 'Triadic' },
  { id: 'tetradic', label: 'Tetradic' },
  { id: 'square', label: 'Square' },
]

const rand = (min: number, max: number) => min + Math.random() * (max - min)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const HUE_SETS: Record<Exclude<ModeId, 'auto' | 'monochromatic' | 'analogous'>, number[]> = {
  complementary: [0, 180],
  split: [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 60, 180, 240],
  square: [0, 90, 180, 270],
}

function hueOffsets(mode: Exclude<ModeId, 'auto'>, n: number): number[] {
  if (mode === 'monochromatic') return Array.from({ length: n }, () => rand(-6, 6))
  if (mode === 'analogous') {
    const spread = rand(18, 32)
    return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * spread)
  }
  const set = HUE_SETS[mode]
  return Array.from({ length: n }, (_, i) => set[i % set.length] + rand(-8, 8))
}

/**
 * Generate a palette of `slots.length` colours. Slots with a hex are locked and kept.
 * Harmonies are built in OKLCH so lightness steps look perceptually even.
 */
export function generatePalette(slots: (string | null)[], mode: ModeId): string[] {
  const n = slots.length
  const locked = slots.filter((s): s is string => !!s)
  const resolved: Exclude<ModeId, 'auto'> =
    mode === 'auto'
      ? (['analogous', 'complementary', 'split', 'triadic', 'tetradic', 'monochromatic', 'analogous', 'split'] as const)[
          Math.floor(Math.random() * 8)
        ]
      : mode

  // Base hue / chroma come from the first locked colour when there is one.
  let baseHue = rand(0, 360)
  let baseChroma = rand(0.07, 0.17)
  if (locked.length) {
    const o = hexToOklch(locked[0])
    if (o.c > 0.02) baseHue = o.h
    baseChroma = Math.max(0.05, o.c)
    // offset so the locked colour sits at its own position in the harmony
    const idx = slots.findIndex((s) => s === locked[0])
    const offs = hueOffsets(resolved, n)
    baseHue -= offs[idx] ?? 0
    return fill(slots, offs, baseHue, baseChroma, resolved, mode === 'auto')
  }
  return fill(slots, hueOffsets(resolved, n), baseHue, baseChroma, resolved, mode === 'auto')
}

function fill(
  slots: (string | null)[],
  offsets: number[],
  baseHue: number,
  baseChroma: number,
  mode: Exclude<ModeId, 'auto'>,
  isAuto: boolean,
): string[] {
  const n = slots.length
  // Evenly spread lightness with jitter so palettes always have light and dark options.
  const lo = rand(0.22, 0.36)
  const hi = rand(0.88, 0.97)
  let lights = Array.from({ length: n }, (_, i) => (n === 1 ? rand(lo, hi) : lo + ((hi - lo) * i) / (n - 1) + rand(-0.04, 0.04)))
  if (mode !== 'monochromatic') lights = shuffle(lights)

  // In auto mode, sometimes include a near-neutral colour, as real-world palettes often do.
  const neutralIdx = isAuto && n >= 4 && Math.random() < 0.55 ? Math.floor(Math.random() * n) : -1

  return slots.map((s, i) => {
    if (s) return s
    const l = lights[i]
    // reduce chroma for very light/dark colours, otherwise they leave the gamut and look muddy
    const edge = 1 - Math.pow(Math.abs(l - 0.62) / 0.5, 2) * 0.55
    let c = baseChroma * rand(0.65, 1.25) * edge
    if (i === neutralIdx) c = rand(0.005, 0.025)
    return oklchToHex(l, c, baseHue + offsets[i])
  })
}
