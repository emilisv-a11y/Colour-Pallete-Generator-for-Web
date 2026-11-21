/* ============================================================================
   Fluid typography & spacing
   Sizes grow linearly between a minimum and maximum viewport width, written as
   clamp(MIN rem, A rem + B vw, MAX rem). The rem part keeps browser zoom and
   user font-size settings working (WCAG 1.4.4), which pure vw units break.
   ========================================================================== */

export type TypeSettings = {
  minVw: number // px
  maxVw: number // px
  minBase: number // px, body size at minVw
  maxBase: number // px, body size at maxVw
  minRatio: number // type scale ratio at minVw
  maxRatio: number // type scale ratio at maxVw
  stepsUp: number // steps above body (headings)
  stepsDown: number // steps below body (small print)
  rootPx: number // 1rem in px (16 unless the site changes it)
}

export const DEFAULT_TYPE: TypeSettings = { minVw: 360, maxVw: 1440, minBase: 16, maxBase: 18, minRatio: 1.2, maxRatio: 1.25, stepsUp: 6, stepsDown: 2, rootPx: 16 }

export const RATIOS: { value: number; label: string }[] = [
  { value: 1.067, label: '1.067 · Minor second' },
  { value: 1.125, label: '1.125 · Major second' },
  { value: 1.2, label: '1.2 · Minor third' },
  { value: 1.25, label: '1.25 · Major third' },
  { value: 1.333, label: '1.333 · Perfect fourth' },
  { value: 1.414, label: '1.414 · Augmented fourth' },
  { value: 1.5, label: '1.5 · Perfect fifth' },
  { value: 1.618, label: '1.618 · Golden ratio' },
]

export const VIEWPORTS = [
  { label: 'Phone', w: 375 },
  { label: 'Tablet', w: 768 },
  { label: 'Laptop', w: 1280 },
  { label: 'Desktop', w: 1440 },
  { label: 'Wide', w: 1920 },
]

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d

export type Fluid = { min: number; max: number; slopeVw: number; interceptRem: number; css: string }

/** clamp() for a size going from `min`px at minVw to `max`px at maxVw (sizes may shrink too). */
export function fluid(min: number, max: number, s: Pick<TypeSettings, 'minVw' | 'maxVw' | 'rootPx'>): Fluid {
  const slope = (max - min) / (s.maxVw - s.minVw)
  const intercept = min - slope * s.minVw
  const lo = Math.min(min, max) / s.rootPx
  const hi = Math.max(min, max) / s.rootPx
  const slopeVw = round(slope * 100, 4)
  const interceptRem = round(intercept / s.rootPx, 4)
  const css =
    min === max
      ? `${round(min / s.rootPx)}rem`
      : `clamp(${round(lo)}rem, ${interceptRem}rem ${slopeVw < 0 ? '-' : '+'} ${Math.abs(slopeVw)}vw, ${round(hi)}rem)`
  return { min, max, slopeVw, interceptRem, css }
}

/** Size in px that a fluid value resolves to at a given viewport width. */
export function sizeAt(f: Pick<Fluid, 'min' | 'max'>, vw: number, s: Pick<TypeSettings, 'minVw' | 'maxVw'>) {
  const t = Math.min(1, Math.max(0, (vw - s.minVw) / (s.maxVw - s.minVw)))
  return f.min + (f.max - f.min) * t
}

export const STEP_NAMES: Record<number, string> = { [-3]: '2xs', [-2]: 'xs', [-1]: 'sm', 0: 'base', 1: 'lg', 2: 'xl', 3: '2xl', 4: '3xl', 5: '4xl', 6: '5xl', 7: '6xl', 8: '7xl' }

export type TypeStep = Fluid & {
  step: number
  name: string
  /** suggested HTML element */
  el: string | null
  lineHeight: number
  tracking: string // letter-spacing
  /** max/min size ratio — over 2.5 can break 200% zoom (WCAG 1.4.4) */
  zoomRatio: number
}

/** Unitless line height that tightens as text gets bigger. */
export function lineHeightFor(px: number) {
  return round(Math.min(1.6, Math.max(1.1, 1.6 - (px - 16) * 0.012)), 2)
}

export function trackingFor(px: number) {
  if (px >= 40) return '-0.025em'
  if (px >= 28) return '-0.015em'
  if (px >= 20) return '-0.005em'
  if (px <= 13) return '0.01em'
  return '0'
}

export function typeScale(s: TypeSettings): TypeStep[] {
  const out: TypeStep[] = []
  for (let step = s.stepsUp; step >= -s.stepsDown; step--) {
    const min = s.minBase * Math.pow(s.minRatio, step)
    const max = s.maxBase * Math.pow(s.maxRatio, step)
    const f = fluid(round(min, 2), round(max, 2), s)
    // headings: h1 = top step, downwards; body = step 0
    const hIndex = s.stepsUp - step + 1
    const el = step === 0 ? 'p' : step > 0 && hIndex <= 6 ? `h${hIndex}` : step === -1 ? 'small' : null
    out.push({ ...f, step, name: STEP_NAMES[step] ?? `step-${step}`, el, lineHeight: lineHeightFor((min + max) / 2), tracking: trackingFor((min + max) / 2), zoomRatio: max / min })
  }
  return out
}

/* ---------- Spacing ---------- */

export const SPACE_STEPS: { name: string; mult: number }[] = [
  { name: '3xs', mult: 0.25 },
  { name: '2xs', mult: 0.5 },
  { name: 'xs', mult: 0.75 },
  { name: 's', mult: 1 },
  { name: 'm', mult: 1.5 },
  { name: 'l', mult: 2 },
  { name: 'xl', mult: 3 },
  { name: '2xl', mult: 4 },
  { name: '3xl', mult: 6 },
]

export type SpaceStep = Fluid & { name: string }

/** Spacing that scales with the body size; pairs like "s-l" span two sizes for bigger jumps (section padding). */
export function spaceScale(s: TypeSettings): SpaceStep[] {
  return SPACE_STEPS.map((p) => ({ name: p.name, ...fluid(round(s.minBase * p.mult, 2), round(s.maxBase * p.mult, 2), s) }))
}

export function spacePairs(s: TypeSettings): SpaceStep[] {
  const sc = spaceScale(s)
  const pick = (a: string, b: string) => {
    const x = sc.find((v) => v.name === a)!
    const y = sc.find((v) => v.name === b)!
    return { name: `${a}-${b}`, ...fluid(x.min, y.max, s) }
  }
  return [pick('s', 'l'), pick('m', 'xl'), pick('l', '2xl'), pick('xl', '3xl')]
}

/* ---------- Checks ---------- */

export type TypeIssue = { level: 'warn' | 'info'; text: string }

export function typeIssues(s: TypeSettings): TypeIssue[] {
  const issues: TypeIssue[] = []
  if (s.minBase < 16) issues.push({ level: 'warn', text: `Body text at ${s.minBase}px on small screens is below the commonly recommended 16px.` })
  if (s.maxVw <= s.minVw) issues.push({ level: 'warn', text: 'The maximum viewport must be wider than the minimum.' })
  const steps = typeScale(s)
  const zoomRisk = steps.filter((x) => x.zoomRatio > 2.5)
  if (zoomRisk.length)
    issues.push({
      level: 'warn',
      text: `${zoomRisk.map((x) => x.name).join(', ')} grow more than 2.5× between the viewports. At 200% browser zoom that text may not get twice as large, which is required by WCAG 1.4.4. Reduce the difference between the minimum and maximum.`,
    })
  const tiny = steps.filter((x) => x.min < 12)
  if (tiny.length) issues.push({ level: 'info', text: `${tiny.map((x) => x.name).join(', ')} ${tiny.length > 1 ? 'are' : 'is'} under 12px on small screens. Keep ${tiny.length > 1 ? 'them' : 'it'} for labels and legal text only.` })
  const top = steps[0]
  if (top && top.min > 48) issues.push({ level: 'info', text: `The largest heading is ${Math.round(top.min)}px on phones; long words may not fit a 360px screen.` })
  if (s.maxRatio > 1.5 && s.stepsUp >= 6) issues.push({ level: 'info', text: 'A large ratio with many steps makes the biggest headings very large. Consider fewer steps or a smaller ratio.' })
  return issues
}

/* ---------- Code ---------- */

export type TypeFormat = 'css' | 'tailwind4' | 'scss' | 'json'

export function typeCss(s: TypeSettings, fonts?: { heading: string; body: string }, stacks?: { heading: string; body: string }) {
  const steps = typeScale(s)
  const space = [...spaceScale(s), ...spacePairs(s)]
  const header = `/* Fluid type & space · ${s.minVw}px → ${s.maxVw}px · body ${s.minBase}→${s.maxBase}px · ratio ${s.minRatio}→${s.maxRatio} */`
  const vars = [
    ...steps.map((x) => `  --step-${x.step}: ${x.css}; /* ${x.name}: ${Math.round(x.min)}→${Math.round(x.max)}px */`),
    '',
    ...space.map((x) => `  --space-${x.name}: ${x.css};`),
  ].join('\n')
  const els = steps
    .filter((x) => x.el && x.el !== 'p')
    .map((x) => `${x.el} {\n  font-size: var(--step-${x.step});\n  line-height: ${x.lineHeight};${x.tracking !== '0' ? `\n  letter-spacing: ${x.tracking};` : ''}\n}`)
    .join('\n\n')
  const fontLines = fonts && stacks ? `\n  font-family: ${stacks.body};` : ''
  const headingFont = fonts && stacks ? `\nh1, h2, h3, h4, h5, h6 {\n  font-family: ${stacks.heading};\n}\n` : ''
  return `${header}
:root {
${vars}
}

body {
  font-size: var(--step-0);
  line-height: ${lineHeightFor(s.minBase)};${fontLines}
}
${headingFont}
${els}
`
}

export function exportType(s: TypeSettings, format: TypeFormat, fonts?: { heading: string; body: string }, stacks?: { heading: string; body: string }): string {
  const steps = typeScale(s)
  const space = [...spaceScale(s), ...spacePairs(s)]
  switch (format) {
    case 'css':
      return typeCss(s, fonts, stacks)
    case 'tailwind4':
      return `/* Fluid type & space for Tailwind v4: text-base, text-2xl…, p-fluid-m, gap-fluid-s-l… */
@theme {
${steps.map((x) => `  --text-${x.name}: ${x.css};\n  --text-${x.name}--line-height: ${x.lineHeight};${x.tracking !== '0' ? `\n  --text-${x.name}--letter-spacing: ${x.tracking};` : ''}`).join('\n')}

${space.map((x) => `  --spacing-fluid-${x.name}: ${x.css};`).join('\n')}
}
`
    case 'scss':
      return `// Fluid type & space
${steps.map((x) => `$step-${x.step < 0 ? 'n' + -x.step : x.step}: ${x.css}; // ${x.name}`).join('\n')}

$type-scale: (
${steps.map((x) => `  '${x.name}': (size: ${x.css}, line-height: ${x.lineHeight}, letter-spacing: ${x.tracking}),`).join('\n')}
);

${space.map((x) => `$space-${x.name}: ${x.css};`).join('\n')}
`
    case 'json':
      return (
        JSON.stringify(
          {
            settings: s,
            type: Object.fromEntries(steps.map((x) => [x.name, { step: x.step, element: x.el, minPx: x.min, maxPx: x.max, clamp: x.css, lineHeight: x.lineHeight, letterSpacing: x.tracking }])),
            space: Object.fromEntries(space.map((x) => [x.name, { minPx: x.min, maxPx: x.max, clamp: x.css }])),
          },
          null,
          2,
        ) + '\n'
      )
  }
}
