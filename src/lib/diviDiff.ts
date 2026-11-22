/* ============================================================================
   Divi 5 round trip, part 2: differences between a site export and what the
   design system would import, and an import file with only the chosen changes.
   Nothing is ever deleted from the site: items left unticked keep their value.
   ========================================================================== */

import { findBrokenRefs, parseRef, type DiviBuild, type DiviExport, type DiviPresetGroup } from './divi'
import { readFluid, resolveHex, type FluidRead } from './diviRead'

export type DiffStatus = 'changed' | 'new' | 'same' | 'site-only'
export type DiffKind = 'color' | 'variable' | 'preset'

export type DiffItem = {
  key: string // `${kind}:${id}`
  kind: DiffKind
  id: string
  label: string
  status: DiffStatus
  site?: string
  system?: string
  siteHex?: string | null
  systemHex?: string | null
  siteFluid?: FluidRead | null
  systemFluid?: FluidRead | null
  /** colours: same visible colour but linked differently */
  relinkOnly?: boolean
  /** presets: module or group name, e.g. divi/heading */
  group?: string
}

/** JSON with sorted keys, so attribute order doesn't count as a difference. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(v ?? null)
}

const ws = (s: string) => s.replace(/\s+/g, ' ').trim()

/** The site with the import applied on top: used to resolve the system's linked colours and variables. */
function merged(build: DiviBuild, source: DiviExport): DiviExport {
  const colors = new Map(source.global_colors)
  build.file.global_colors.forEach(([id, c]) => colors.set(id, c))
  const vars = new Map(source.global_variables.map((v) => [v.id, v]))
  build.file.global_variables.forEach((v) => vars.set(v.id, v))
  return { ...source, global_colors: [...colors.entries()], global_variables: [...vars.values()] }
}

export function diffSite(build: DiviBuild, source: DiviExport): DiffItem[] {
  const out: DiffItem[] = []
  const after = merged(build, source)

  // colours
  const siteColors = new Map(source.global_colors)
  for (const [id, c] of build.file.global_colors) {
    const prev = siteColors.get(id)
    const systemHex = resolveHex(id, after).hex
    if (!prev) {
      out.push({ key: `color:${id}`, kind: 'color', id, label: c.label, status: 'new', system: c.color, systemHex })
      continue
    }
    const siteHex = resolveHex(id, source).hex
    const same = ws(prev.color) === ws(c.color)
    out.push({
      key: `color:${id}`,
      kind: 'color',
      id,
      label: prev.label || c.label,
      status: same ? 'same' : 'changed',
      site: prev.color,
      system: c.color,
      siteHex,
      systemHex,
      relinkOnly: !same && !!siteHex && siteHex === systemHex,
    })
  }
  const builtColors = new Set(build.file.global_colors.map(([id]) => id))
  for (const [id, c] of source.global_colors) {
    if (!builtColors.has(id)) out.push({ key: `color:${id}`, kind: 'color', id, label: c.label, status: 'site-only', site: c.color, siteHex: resolveHex(id, source).hex })
  }

  // variables
  const siteVars = new Map(source.global_variables.map((v) => [v.id, v]))
  for (const v of build.file.global_variables) {
    const prev = siteVars.get(v.id)
    const systemFluid = readFluid(v.value, after)
    if (!prev) {
      out.push({ key: `variable:${v.id}`, kind: 'variable', id: v.id, label: v.label, status: 'new', system: v.value, systemFluid })
      continue
    }
    const siteFluid = readFluid(prev.value, source)
    const sameNumbers = !!siteFluid && !!systemFluid && siteFluid.fluid === systemFluid.fluid && Math.abs(siteFluid.minPx - systemFluid.minPx) < 0.05 && Math.abs(siteFluid.maxPx - systemFluid.maxPx) < 0.05 && (!siteFluid.fluid || (Math.abs(siteFluid.minVw - systemFluid.minVw) <= 10 && Math.abs(siteFluid.maxVw - systemFluid.maxVw) <= 10))
    out.push({
      key: `variable:${v.id}`,
      kind: 'variable',
      id: v.id,
      label: prev.label || v.label,
      status: ws(prev.value) === ws(v.value) || sameNumbers ? 'same' : 'changed',
      site: prev.value,
      system: v.value,
      siteFluid,
      systemFluid,
    })
  }
  const builtVars = new Set(build.file.global_variables.map((v) => v.id))
  for (const v of source.global_variables) {
    if (!builtVars.has(v.id)) out.push({ key: `variable:${v.id}`, kind: 'variable', id: v.id, label: v.label, status: 'site-only', site: v.value, siteFluid: readFluid(v.value, source) })
  }

  // presets (the site's default presets are copied unchanged into the build, so they are skipped)
  for (const type of ['module', 'group'] as const) {
    const built = build.file.presets[type] ?? {}
    const site = source.presets?.[type] ?? {}
    for (const [group, g] of Object.entries(built)) {
      for (const [id, p] of Object.entries(g.items)) {
        const prev = site[group]?.items?.[id]
        if (prev && id === site[group]?.default && prev === p) continue
        if (!prev && id === g.default) continue // placeholder default for a new group; always included with the group
        if (!prev) out.push({ key: `preset:${id}`, kind: 'preset', id, label: p.name, group, status: 'new' })
        else out.push({ key: `preset:${id}`, kind: 'preset', id, label: p.name, group, status: stable(prev.attrs) === stable(p.attrs) ? 'same' : 'changed' })
      }
    }
    for (const [group, g] of Object.entries(site)) {
      for (const [id, p] of Object.entries(g.items ?? {})) {
        if (!built[group]?.items?.[id]) out.push({ key: `preset:${id}`, kind: 'preset', id, label: p.name, group, status: 'site-only' })
      }
    }
  }
  return out
}

/** Every global colour / variable id a value references. */
function refsIn(v: unknown, out = new Set<string>()): Set<string> {
  if (typeof v === 'string') {
    const direct = parseRef(v)
    if (direct?.name) out.add(direct.name)
    for (const m of v.matchAll(/\$variable\((.*?)\)\$/g)) {
      const r = parseRef(m[0])
      if (r?.name) out.add(r.name)
    }
  } else if (Array.isArray(v)) v.forEach((x) => refsIn(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => refsIn(x, out))
  return out
}

export type SelectiveImport = { file: DiviExport; count: number; added: { key: string; label: string }[]; broken: string[] }

/**
 * Import file with only the selected items. New colours/variables that a selected item needs are
 * added automatically (listed in `added`), so nothing in the file points at something missing.
 */
export function selectiveImport(build: DiviBuild, source: DiviExport, selected: Set<string>): SelectiveImport {
  const keep = new Set(selected)
  const siteIds = new Set<string>([...source.global_colors.map(([id]) => id), ...source.global_variables.map((v) => v.id)])
  const labelOf = new Map<string, string>([...build.file.global_colors.map(([id, c]) => [`color:${id}`, c.label] as const), ...build.file.global_variables.map((v) => [`variable:${v.id}`, v.label] as const)])
  const keyFor = (id: string) => (id.startsWith('gcid-') ? `color:${id}` : `variable:${id}`)
  const added: { key: string; label: string }[] = []

  const presetsOf = () => {
    const pick = (bag: Record<string, DiviPresetGroup>) => {
      const res: Record<string, DiviPresetGroup> = {}
      for (const [name, g] of Object.entries(bag)) {
        const items = Object.fromEntries(Object.entries(g.items).filter(([id]) => keep.has(`preset:${id}`)))
        if (!Object.keys(items).length) continue
        // keep the group's default preset (unchanged copy of the site's, or the placeholder) so Divi accepts the group
        res[name] = { default: g.default, items: { ...(g.items[g.default] ? { [g.default]: g.items[g.default] } : {}), ...items } }
      }
      return res
    }
    return { module: pick(build.file.presets.module ?? {}), group: pick(build.file.presets.group ?? {}) }
  }

  // add missing dependencies until stable
  for (let i = 0; i < 10; i++) {
    const colors = build.file.global_colors.filter(([id]) => keep.has(`color:${id}`))
    const vars = build.file.global_variables.filter((v) => keep.has(`variable:${v.id}`))
    const presets = presetsOf()
    const refs = refsIn([colors, vars, presets])
    let grew = false
    for (const id of refs) {
      const key = keyFor(id)
      if (keep.has(key) || siteIds.has(id) || !labelOf.has(key)) continue
      keep.add(key)
      added.push({ key, label: labelOf.get(key)! })
      grew = true
    }
    if (!grew) break
  }

  const file: DiviExport = {
    ...build.file,
    presets: presetsOf(),
    global_colors: build.file.global_colors.filter(([id]) => keep.has(`color:${id}`)),
    global_variables: build.file.global_variables.filter((v) => keep.has(`variable:${v.id}`)),
  }
  const count = file.global_colors.length + file.global_variables.length + [...keep].filter((k) => k.startsWith('preset:')).length
  return { file, count, added, broken: findBrokenRefs(file, source) }
}

/** What to tick by default: everything that changes or is new. */
export const defaultSelection = (items: DiffItem[]) => new Set(items.filter((i) => i.status === 'changed' || i.status === 'new').map((i) => i.key))
