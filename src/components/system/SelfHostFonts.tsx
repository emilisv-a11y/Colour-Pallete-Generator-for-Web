import { useEffect, useMemo, useState } from 'react'
import { downloadBlob } from '../../lib/exports'
import { metaFor } from '../../lib/fonts'
import { getFont, loadLibrary } from '../../lib/googleFonts'
import { buildFontZip, defaultWeights, fetchPlan, fetchSizes, fontFaceCss, formatBytes, SUBSET_LABELS, type FontFile, type FontRequest } from '../../lib/selfHost'
import type { DesignSystem } from '../../lib/system'
import { Icon } from '../Icon'
import { CodeBlock, useToast } from '../ui'

type Choice = { weights: number[]; italic: boolean }

export function SelfHostFonts({ sys }: { sys: DesignSystem }) {
  const toast = useToast()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    loadLibrary().then(() => setReady(true))
  }, [])

  const families = useMemo(() => [...new Set([sys.fonts.heading, sys.fonts.body])], [sys.fonts.heading, sys.fonts.body])
  const metas = useMemo(() => Object.fromEntries(families.map((f) => [f, metaFor(f, sys.fonts.meta)])), [families, sys.fonts.meta, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const initial = () =>
    Object.fromEntries(
      families.map((f) => {
        const roles = [f === sys.fonts.heading ? 'heading' : null, f === sys.fonts.body ? 'body' : null].filter(Boolean) as ('heading' | 'body')[]
        const weights = [...new Set(roles.flatMap((r) => defaultWeights(metas[f], r)))].sort((a, b) => a - b)
        return [f, { weights, italic: false }]
      }),
    ) as Record<string, Choice>
  const [choice, setChoice] = useState<Record<string, Choice>>(initial)
  // reset when the fonts change
  useEffect(() => setChoice(initial()), [families.join('|'), ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const availableSubsets = useMemo(() => {
    const all = new Set<string>()
    families.forEach((f) => (getFont(f)?.subsets ?? ['latin', 'latin-ext']).forEach((s) => all.add(s)))
    return Object.keys(SUBSET_LABELS).filter((s) => all.has(s))
  }, [families, metas])
  const [subsets, setSubsets] = useState<string[]>(['latin', 'latin-ext'])

  const [files, setFiles] = useState<FontFile[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string>('')

  const reqs: FontRequest[] = families
    .filter((f) => choice[f]?.weights.length)
    .map((f) => ({ family: f, weights: choice[f].weights, italic: choice[f].italic, variable: !!metas[f]?.variable }))

  useEffect(() => {
    if (!reqs.length || !subsets.length) {
      setFiles([])
      return
    }
    setError('')
    setFiles(null)
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const plan = await fetchPlan(reqs, subsets)
        if (cancelled) return
        setFiles(plan)
        const sized = await fetchSizes(plan)
        if (!cancelled) setFiles(sized)
      } catch (e) {
        if (!cancelled) setError(`${(e as Error).message}. If you ticked italics, this font may not have italics in every chosen weight.`)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [JSON.stringify(reqs), subsets.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = files?.reduce((s, f) => s + (f.size ?? 0), 0) ?? 0
  const sizesKnown = !!files?.length && files.every((f) => f.size !== undefined)
  const set = (f: string, patch: Partial<Choice>) => setChoice((c) => ({ ...c, [f]: { ...c[f], ...patch } }))

  return (
    <section className="type-card selfhost">
      <div className="row space-between wrap">
        <h2 style={{ margin: 0 }}>Self-host fonts</h2>
        <span className="tag">Recommended in the EU</span>
      </div>
      <p className="muted small">
        Loading fonts from Google sends every visitor's IP address to Google, which EU courts have treated as a privacy breach. Download the fonts and serve them from your
        own site instead. You get WOFF2 files, ready <code>@font-face</code> CSS and step-by-step Divi instructions in one ZIP.
      </p>

      <div className="selfhost-grid">
        {families.map((f) => {
          const meta = metas[f]
          const c = choice[f] ?? { weights: [], italic: false }
          const weights = (meta?.weights ?? [400, 700]).filter((w) => w >= 100 && w <= 900)
          return (
            <fieldset key={f}>
              <legend>
                {f}{' '}
                <span className="muted small">
                  {[f === sys.fonts.heading && 'headings', f === sys.fonts.body && 'body'].filter(Boolean).join(' & ')}
                  {meta?.variable && ' · variable'}
                </span>
              </legend>
              <div className="weight-chips">
                {weights.map((w) => {
                  const on = c.weights.includes(w)
                  return (
                    <label key={w} className={`weight-chip ${on ? 'on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => set(f, { weights: on ? c.weights.filter((x) => x !== w) : [...c.weights, w].sort((a, b) => a - b) })} />
                      {w}
                    </label>
                  )
                })}
              </div>
              {meta?.italic && (
                <label className="divi-check">
                  <input type="checkbox" checked={c.italic} onChange={(e) => set(f, { italic: e.target.checked })} /> Include italics
                </label>
              )}
              {meta?.variable && c.weights.length > 1 && <p className="muted small" style={{ margin: 0 }}>Variable font: one file per language covers every weight from {c.weights[0]} to {c.weights[c.weights.length - 1]}.</p>}
            </fieldset>
          )
        })}
        <fieldset>
          <legend>Languages</legend>
          {availableSubsets.map((s) => (
            <label key={s} className="divi-check">
              <input type="checkbox" checked={subsets.includes(s)} onChange={() => setSubsets((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]))} /> {SUBSET_LABELS[s]}
            </label>
          ))}
          <p className="muted small" style={{ margin: 0 }}>
            Lithuanian needs Latin Extended. Browsers only download a language file when the page uses its characters.
          </p>
        </fieldset>
      </div>

      {error && (
        <ul className="type-issues">
          <li className="warn">{error}</li>
        </ul>
      )}
      {!error && files && files.length > 0 && (
        <div className="selfhost-files">
          <div className="row space-between wrap">
            <strong>
              {files.length} files · {sizesKnown ? formatBytes(total) : 'measuring…'} total
            </strong>
            <span className="muted small">A typical page only downloads the Latin files: {formatBytes(files.filter((f) => f.subset === 'latin').reduce((s, f) => s + (f.size ?? 0), 0))}</span>
          </div>
          <ul>
            {files.map((f) => (
              <li key={f.url}>
                <code>{f.file}</code>
                <span className="muted small">{formatBytes(f.size)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!error && files === null && <p className="muted small">Checking files with Google Fonts…</p>}

      <div className="row wrap">
        <button
          className="btn btn-primary"
          disabled={!files?.length || !!busy}
          onClick={async () => {
            if (!files) return
            try {
              setBusy('Downloading 0 / ' + files.length)
              const blob = await buildFontZip(files, families, sys.fonts.body, (d, t) => setBusy(`Downloading ${d} / ${t}`))
              downloadBlob(blob, `${families.map((f) => f.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('-')}-fonts.zip`)
              toast('Font package downloaded')
            } catch (e) {
              alert((e as Error).message)
            } finally {
              setBusy('')
            }
          }}
        >
          <Icon name="download" size={16} /> {busy || 'Download font package (.zip)'}
        </button>
      </div>
      {files && files.length > 0 && (
        <details>
          <summary className="small">Preview the @font-face CSS</summary>
          <CodeBlock code={fontFaceCss(files)} label="@font-face CSS" />
        </details>
      )}
    </section>
  )
}
