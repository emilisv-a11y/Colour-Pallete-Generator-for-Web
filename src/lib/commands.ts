/* Command palette data: pages and a simple ranking. */

export type Command = { id: string; label: string; group: 'Go to' | 'Actions' | 'Projects'; keywords?: string; run: () => void }

export const PAGES: { to: string; label: string; keywords?: string }[] = [
  { to: '/generate', label: 'Generator', keywords: 'palette colours space' },
  { to: '/explore', label: 'Explore palettes', keywords: 'browse curated inspiration' },
  { to: '/visualize', label: 'Visualizer', keywords: 'mockup landing page' },
  { to: '/system', label: 'Design system', keywords: 'roles scales tokens type' },
  { to: '/brand-kit', label: 'Brand kit', keywords: 'guidelines print pdf' },
  { to: '/divi', label: 'Divi 5', keywords: 'import presets variables layouts dark mode' },
  { to: '/contrast', label: 'Contrast checker', keywords: 'wcag accessibility' },
  { to: '/library', label: 'Library', keywords: 'saved palettes colours backup' },
  { to: '/projects', label: 'Projects', keywords: 'clients handoff' },
  { to: '/image', label: 'Image colour picker', keywords: 'photo extract' },
  { to: '/gradient', label: 'Gradient maker', keywords: 'linear radial' },
  { to: '/mesh', label: 'Mesh gradient', keywords: 'blob background' },
  { to: '/text-on-image', label: 'Text on image checker', keywords: 'hero overlay contrast' },
  { to: '/logo', label: 'Logo checker', keywords: 'svg recolour' },
  { to: '/brand-assets', label: 'Favicon & social images', keywords: 'icon og share' },
  { to: '/starters', label: 'Starter kits', keywords: 'industry template restaurant law spa shop' },
  { to: '/collage', label: 'Collage & moodboard', keywords: 'images' },
  { to: '/tailwind', label: 'Tailwind colours', keywords: 'reference' },
  { to: '/account', label: 'Account & team', keywords: 'sign out password teammates' },
]

/** Simple ranking: every typed word must appear; earlier and label matches rank higher. */
export function rank(cmds: Command[], query: string): Command[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return cmds
  return cmds
    .map((c) => {
      const label = c.label.toLowerCase()
      const hay = `${label} ${c.keywords ?? ''} ${c.group.toLowerCase()}`
      if (!words.every((w) => hay.includes(w))) return null
      const score = words.reduce((n, w) => n + (label.startsWith(w) ? 0 : label.includes(w) ? 1 : 3), 0)
      return { c, score }
    })
    .filter((x): x is { c: Command; score: number } => !!x)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.c)
}
