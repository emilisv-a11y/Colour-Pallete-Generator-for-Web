import { hexToOklch, oklchToHex } from './color'

export const ROLES = ['background', 'surface', 'text', 'primary', 'accent', 'muted'] as const
export type Role = (typeof ROLES)[number]
export type Roles = Record<Role, string>

/** Guess sensible UI roles from an arbitrary palette. */
export function autoRoles(hexes: string[], dark = false): Roles {
  const info = hexes.map((hex) => ({ hex, ...hexToOklch(hex) }))
  const byL = [...info].sort((a, b) => b.l - a.l)
  let bg = byL[0].hex
  let text = byL[byL.length - 1].hex
  if (dark) [bg, text] = [text, bg]
  const rest = info.filter((x) => x.hex !== bg && x.hex !== text).sort((a, b) => b.c - a.c)
  const primary = rest[0]?.hex ?? (dark ? oklchToHex(0.7, 0.15, 250) : oklchToHex(0.5, 0.15, 250))
  const p = hexToOklch(primary)
  const accent = rest[1]?.hex ?? oklchToHex(p.l, p.c, p.h + 150)
  const b = hexToOklch(bg)
  const surface =
    rest.find((x) => x.hex !== primary && x.hex !== accent && Math.abs(x.l - b.l) < 0.12)?.hex ?? oklchToHex(dark ? b.l + 0.06 : b.l - 0.04, b.c, b.h)
  const t = hexToOklch(text)
  const muted = oklchToHex((t.l + b.l) / 2, Math.min(t.c, 0.03), t.h)
  return { background: bg, surface, text, primary, accent, muted }
}
