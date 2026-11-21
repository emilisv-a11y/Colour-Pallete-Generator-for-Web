import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildHandoffZip, DEFAULT_PARTS, estimateSize, handoffTextFiles, slugify, type HandoffInput } from '../handoff'
import { palettePdf } from '../files'
import { systemFromPalette } from '../system'

const sys = systemFromPalette(['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'], 'Kepyklėlė')
const input: HandoffInput = {
  project: { name: 'Kepyklėlė „Duona“', client: 'UAB Duona', website: 'https://duona.lt', notes: 'Use the accent sparingly.' },
  sys,
  date: new Date('2026-11-21'),
}

describe('handoff package', () => {
  it('builds every text file in English', () => {
    const f = handoffTextFiles(input, 'en', { ...DEFAULT_PARTS, fonts: false })
    for (const k of ['README.html', 'brand-kit.html', 'colours/palette.svg', 'colours/palette.gpl', 'tokens/design-tokens.css', 'tokens/design-tokens.dtcg.json', 'typography/fluid-type.css', 'divi/divi5-import.json', 'divi/divi-custom.css', 'divi/section-plan.html'])
      expect(f[k], k).toBeTruthy()
    ;['tokens/design-tokens.dtcg.json', 'tokens/tokens-studio.json', 'tokens/tokens.json', 'divi/divi5-import.json', 'colours/colours.json'].forEach((k) => expect(() => JSON.parse(f[k])).not.toThrow())
    expect(f['README.html']).toContain('Install on a Divi 5 website')
    expect(f['README.html']).toContain('UAB Duona')
    expect(f['README.html']).not.toContain('fonts/fonts.css') // fonts not included
    expect(f['brand-kit.html']).toContain('fonts.googleapis.com')
    expect(f['brand-kit.html']).toContain('&bdquo;Duona&ldquo;'.replace('&bdquo;', '„').replace('&ldquo;', '“'))
  })
  it('writes Lithuanian documents', () => {
    const f = handoffTextFiles(input, 'lt', DEFAULT_PARTS)
    expect(f['README.html']).toContain('<html lang="lt">')
    expect(f['README.html']).toContain('Prekės ženklo ir svetainės perdavimo paketas')
    expect(f['brand-kit.html']).toContain('Prekės ženklo spalvos')
    expect(f['divi/section-plan.html']).toContain('Sekcijų spalvų planas')
  })
  it('respects the chosen parts', () => {
    const f = handoffTextFiles(input, 'en', { brandKit: false, colours: false, tokens: false, typography: true, divi: false, fonts: false })
    expect(Object.keys(f).sort()).toEqual(['README.html', 'typography/fluid-type.css', 'typography/tailwind-v4-type.css'])
    expect(estimateSize(input, 'en', DEFAULT_PARTS)).toBeGreaterThan(estimateSize(input, 'en', { ...DEFAULT_PARTS, tokens: false }))
  })
  it('packs a ZIP inside one folder', async () => {
    const { blob, name, files } = await buildHandoffZip(input, 'lt', { ...DEFAULT_PARTS, fonts: false })
    expect(name).toBe('kepyklele-duona-handoff.zip')
    const z = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const keys = Object.keys(z)
    expect(keys.every((k) => k.startsWith('kepyklele-duona-handoff/'))).toBe(true)
    expect(files).toContain('colours/palette.pdf')
    expect(strFromU8(z['kepyklele-duona-handoff/colours/palette.pdf'].slice(0, 8))).toBe('%PDF-1.4')
    expect(strFromU8(z['kepyklele-duona-handoff/colours/palette.ase'].slice(0, 4))).toBe('ASEF')
    expect(strFromU8(z['kepyklele-duona-handoff/README.html'])).toContain('Paruošta')
  })
  it('keeps Lithuanian letters readable in the PDF', async () => {
    const pdf = new TextDecoder('latin1').decode(await palettePdf(['#000000'], 'Kepyklėlė ąčę').arrayBuffer())
    expect(pdf).toContain('(Kepyklele ace)')
    expect(slugify('Ąžuolų g. 5')).toBe('azuolu-g-5')
  })
})
