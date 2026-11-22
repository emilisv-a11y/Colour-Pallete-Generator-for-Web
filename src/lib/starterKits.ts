import { STARTER_KITS, type StarterKit } from '../data/starterKits'
import { DEFAULT_EFFECTS } from './effects'
import { metaFor } from './fonts'
import type { FontMeta } from './googleFonts'
import { uid, type GeneratorSnapshot } from './storage'
import { systemFromPalette, type DesignSystem } from './system'
import { DEFAULT_TYPE } from './typography'

export { STARTER_KITS }

/** Design system for a kit: roles from its palette, its fonts, type scale, radius and shape settings. */
export function kitSystem(kit: StarterKit, name = kit.name): DesignSystem {
  const base = systemFromPalette(kit.palette, name)
  const [primary, secondary, accent, neutral] = kit.palette
  const meta: Record<string, FontMeta> = {}
  for (const f of [kit.fonts.heading, kit.fonts.body]) {
    const m = metaFor(f)
    if (m) meta[f] = m
  }
  return {
    ...base,
    roles: {
      ...base.roles,
      primary: { hex: primary, anchor: null },
      secondary: { hex: secondary, anchor: null },
      accent: { hex: accent, anchor: null },
      neutral: { hex: neutral, anchor: null },
    },
    fonts: { heading: kit.fonts.heading, body: kit.fonts.body, meta },
    radius: kit.radius,
    type: { ...DEFAULT_TYPE, ...kit.type },
    effects: { ...structuredClone(DEFAULT_EFFECTS), shadowTint: kit.effects.shadowTint, shadowStrength: kit.effects.shadowStrength, buttons: { ...DEFAULT_EFFECTS.buttons, ...(kit.effects.buttons ?? {}) } },
    notes: `Started from the “${kit.name}” starter kit (${kit.for}).\n${kit.tips.map((t) => `• ${t}`).join('\n')}`,
  }
}

/** Working data for a new project made from a kit (design system, generator palette, section plan). */
export function kitProjectData(kit: StarterKit, name = kit.name): Record<string, unknown> {
  const generator: GeneratorSnapshot = {
    present: kit.palette.map((hex) => ({ id: uid(), hex, locked: false })),
    past: [],
    future: [],
    mode: 'auto',
    format: 'hex',
    vision: 'normal',
  }
  return { 'd5wt:system': kitSystem(kit, name), 'd5wt:current': generator, 'd5wt:sectionPlan': kit.plan }
}
