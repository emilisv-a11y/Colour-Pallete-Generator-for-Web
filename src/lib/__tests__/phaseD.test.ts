import { beforeEach, describe, expect, it } from 'vitest'
import manifest from '../../../public/manifest.webmanifest?raw'

// minimal in-memory localStorage for the node test environment
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
} as Storage

const { AUTO_GAP, autoVersion, deleteVersion, diffSystems, getVersions, renameVersion, saveVersion } = await import('../versions')
const { getSystem, setSystem } = await import('../storage')
const { systemFromPalette } = await import('../system')
const { WORKING_KEYS } = await import('../projects')
const { PAGES, rank } = await import('../commands')
const { simulateDeep, simulateTokens } = await import('../../components/VisionSelect')
const { buildTokens } = await import('../system')

const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], 'Test')

beforeEach(() => store.clear())

describe('version history', () => {
  it('keeps the previous design system automatically, at most every 15 minutes', () => {
    setSystem(sys)
    expect(getVersions()).toHaveLength(0) // nothing before the first save
    setSystem({ ...sys, radius: 4 })
    expect(getVersions()).toHaveLength(1)
    expect(getVersions()[0]).toMatchObject({ auto: true })
    expect(getVersions()[0].system.radius).toBe(sys.radius)
    setSystem({ ...sys, radius: 6 }) // within 15 minutes: no new version
    expect(getVersions()).toHaveLength(1)
    autoVersion(getSystem(), Date.now() + AUTO_GAP + 1)
    expect(getVersions()).toHaveLength(2)
    expect(getVersions()[0].system.radius).toBe(6)
  })
  it('names, renames, deletes and prunes old automatic versions only', () => {
    const named = saveVersion(sys, 'Sent to client')
    for (let i = 0; i < 30; i++) saveVersion({ ...sys, radius: i }, 'auto', true, Date.now() + i)
    const list = getVersions()
    expect(list.filter((v) => v.auto)).toHaveLength(20)
    expect(list.some((v) => v.id === named.id)).toBe(true)
    renameVersion(list[0].id, 'Kept')
    expect(getVersions()[0]).toMatchObject({ label: 'Kept', auto: false })
    deleteVersion(named.id)
    expect(getVersions().some((v) => v.id === named.id)).toBe(false)
  })
  it('belongs to the project (switches and syncs with it)', () => {
    expect(WORKING_KEYS).toContain('d5wt:systemVersions')
  })
  it('lists the differences in plain terms', () => {
    const b = structuredClone(sys)
    b.roles.primary.hex = '#ff0000'
    b.fonts.heading = 'Lora'
    b.radius = 2
    b.overrides.light.text = '#000000'
    b.effects = { shadowTint: 'black', shadowStrength: 1, borders: { thin: 1, base: 2, thick: 4 }, buttons: { s: 36, m: 48, l: 52 }, input: 44, motion: { fast: 120, base: 200, slow: 320 }, widths: { narrow: 720, container: 1200, wide: 1440 } }
    const d = diffSystems(sys, b)
    const labels = d.map((c) => c.label)
    expect(labels).toEqual(expect.arrayContaining(['Primary', 'Headings', 'Corner radius', 'text (light, manual)', 'Shadow colour', 'Button heights']))
    expect(d.find((c) => c.label === 'Primary')).toMatchObject({ area: 'Colours', after: '#ff0000', colour: true })
    expect(diffSystems(sys, structuredClone(sys))).toEqual([])
  })
})

describe('command palette', () => {
  const cmds = PAGES.map((p) => ({ id: p.to, label: p.label, group: 'Go to' as const, keywords: p.keywords, run: () => {} }))
  it('finds tools by name, keyword and partial words', () => {
    expect(rank(cmds, 'divi')[0].label).toBe('Divi 5')
    expect(rank(cmds, 'favicon')[0].label).toBe('Favicon & social images')
    expect(rank(cmds, 'dark mode')[0].label).toBe('Divi 5')
    expect(rank(cmds, 'contr')[0].label).toBe('Contrast checker')
    expect(rank(cmds, 'zzz')).toEqual([])
    expect(rank(cmds, '')).toHaveLength(cmds.length)
  })
})

describe('colour-blindness view', () => {
  it('simulates tokens and nested colours, leaving other values alone', () => {
    const t = buildTokens(sys, 'light')
    const sim = simulateTokens(t, 'achromatopsia')
    expect(sim.primary.hex).not.toBe(t.primary.hex)
    const { hex } = sim.primary
    expect(hex.slice(1, 3)).toBe(hex.slice(3, 5)) // grey
    expect(simulateTokens(t, 'normal')).toBe(t)
    expect(simulateDeep({ bg: '#ff0000', label: 'Brand', n: 3, list: ['#00ff00'] }, 'achromatopsia')).toMatchObject({ label: 'Brand', n: 3 })
  })
})

describe('installable app', () => {
  it('has a manifest with relative paths and a maskable icon', () => {
    const m = JSON.parse(manifest)
    expect(m.start_url.startsWith('./')).toBe(true)
    expect(m.icons.every((i: { src: string }) => !i.src.startsWith('/'))).toBe(true)
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
  })
})
