#!/usr/bin/env node
/*
  Rebuild src/data/google-fonts.json, the built-in Google Fonts catalogue.

  Usage:
    node scripts/build-google-fonts.mjs                 # downloads the latest google-font-metadata package from npm
    node scripts/build-google-fonts.mjs <api.json>      # or uses a saved Google Fonts Developer API response

  The catalogue is compact: [family, category, weights, italic, variable, subsets, lastModified].
*/
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let items
let variable = new Set()
let source
if (process.argv[2]) {
  const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  items = raw.items ?? raw
  items.forEach((f) => f.axes && variable.add(f.family))
  source = 'Google Fonts Developer API'
} else {
  const dir = mkdtempSync(join(tmpdir(), 'gfm-'))
  const file = execSync('npm pack google-font-metadata --silent', { cwd: dir }).toString().trim().split('\n').pop()
  execSync(`tar -xzf ${file}`, { cwd: dir })
  const data = join(dir, 'package', 'data')
  items = JSON.parse(readFileSync(join(data, 'api-response.json'), 'utf8'))
  const vr = JSON.parse(readFileSync(join(data, 'variable-response.json'), 'utf8'))
  ;(Array.isArray(vr) ? vr : Object.values(vr)).forEach((f) => variable.add(f.family))
  source = `google-font-metadata ${file.replace(/^google-font-metadata-|\.tgz$/g, '')} (Fontsource)`
}

const CATS = { 'sans-serif': 's', serif: 'r', display: 'd', handwriting: 'h', monospace: 'm' }
const fonts = items
  .filter((f) => CATS[f.category])
  .map((f) => {
    const weights = [...new Set(f.variants.map((v) => (v === 'regular' || v === 'italic' ? 400 : parseInt(v, 10))).filter(Boolean))].sort((a, b) => a - b)
    const italic = f.variants.some((v) => v.includes('italic')) ? 1 : 0
    return [f.family, CATS[f.category], weights.map((w) => w / 100).join(''), italic, variable.has(f.family) ? 1 : 0, f.subsets.filter((s) => !/^(menu)$/.test(s)).join(','), (f.lastModified ?? '').replace(/-/g, '')]
  })
  .sort((a, b) => a[0].localeCompare(b[0]))

writeFileSync(new URL('../src/data/google-fonts.json', import.meta.url), JSON.stringify({ source, built: new Date().toISOString().slice(0, 10), fonts }))
console.log(`Wrote ${fonts.length} families from ${source}`)
