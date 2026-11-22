import { useEffect, useMemo, useState } from 'react'
import { buildDiviImport, DEFAULT_DIVI_OPTIONS, type DiviExport, type DiviOptions } from '../../lib/divi'
import { defaultSelection, diffSite, selectiveImport, type DiffItem, type DiffKind, type DiffStatus } from '../../lib/diviDiff'
import { applyReview, fluidText, readDiviSite, type RoleHow, type SiteReading } from '../../lib/diviRead'
import { downloadText } from '../../lib/exports'
import { fontStack, loadFonts } from '../../lib/fonts'
import { loadLibrary, type GFont } from '../../lib/googleFonts'
import { newProject } from '../../lib/projects'
import { buildScales, ROLE_INFO, ROLE_KEYS, type DesignSystem, type RoleKey } from '../../lib/system'
import { Icon } from '../Icon'
import { useSwitchProject } from '../projects/ProjectsUI'
import { Modal, Segmented, useToast } from '../ui'

export const OPEN_TAB_KEY = 'd5wt:diviOpenTab'

const HOW: Record<RoleHow, string> = {
  label: 'From its name',
  button: 'From the main button',
  usage: 'Most used',
  text: 'From the text colour',
  generated: 'Generated',
}

/* ---------- Read a site into a new project ---------- */

export function ReadSiteModal({ source, fileName, onClose }: { source: DiviExport; fileName: string; onClose: () => void }) {
  const toast = useToast()
  const switchTo = useSwitchProject()
  const [reading, setReading] = useState<SiteReading | null>(null)
  const [families, setFamilies] = useState<GFont[]>([])
  const [name, setName] = useState(fileName ? fileName.replace(/\.json$/i, '').replace(/[-_]+/g, ' ').replace(/\b(all )?presets?\b/i, '').trim() || 'Imported Divi site' : 'Imported Divi site')
  const [website, setWebsite] = useState('')
  const [roles, setRoles] = useState<Partial<Record<RoleKey, string>>>({})
  const [heading, setHeading] = useState('')
  const [body, setBody] = useState('')
  const [keepText, setKeepText] = useState(true)

  useEffect(() => {
    let alive = true
    loadLibrary()
      .catch(() => [] as GFont[])
      .then((lib) => {
        if (!alive) return
        setFamilies(lib)
        const r = readDiviSite(source, name)
        setReading(r)
        setHeading(r.fonts.heading.family)
        setBody(r.fonts.body.family)
      })
    return () => {
      alive = false
    }
  }, [source]) // eslint-disable-line react-hooks/exhaustive-deps

  const sys: DesignSystem | null = useMemo(() => (reading ? applyReview(reading, { roles, heading: heading.trim(), body: body.trim(), name: name.trim() || 'Imported Divi site', keepTextColour: keepText }) : null), [reading, roles, heading, body, name, keepText])
  useEffect(() => {
    if (sys) loadFonts([sys.fonts.heading, sys.fonts.body], sys.fonts.meta)
  }, [sys?.fonts.heading, sys?.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps
  const scales = useMemo(() => (sys ? buildScales(sys) : null), [sys])
  // one entry per colour value; the first (e.g. Divi's own "Primary Color") names it
  const siteHexes = useMemo(() => {
    const m = new Map<string, SiteReading['colors'][number]>()
    reading?.colors.forEach((c) => c.hex && !m.has(c.hex) && m.set(c.hex, c))
    return [...m.values()]
  }, [reading])

  const create = () => {
    if (!sys) return
    const opts = { ...DEFAULT_DIVI_OPTIONS, ...readOpts(), onConflict: 'update' as const }
    const p = newProject(
      { name: sys.name, website: website.trim(), status: 'progress', notes: `Created from a Divi 5 export${fileName ? ` (${fileName})` : ''} on ${new Date().toLocaleDateString('en-GB')}.` },
      { 'd5wt:system': sys, 'd5wt:diviSource': source, 'd5wt:diviOpts': opts },
    )
    try {
      sessionStorage.setItem(OPEN_TAB_KEY, 'diff')
    } catch {
      /* ignore */
    }
    switchTo(p.id, true)
    toast(`Created “${p.name}” from the site`)
    onClose()
  }

  return (
    <Modal
      title="Build a design system from this site"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={create} disabled={!sys}>
            <Icon name="check" size={16} /> Create project
          </button>
        </>
      }
    >
      {!reading || !sys || !scales ? (
        <p className="muted">Reading the site…</p>
      ) : (
        <div className="stack rt-review">
          <p className="muted small" style={{ margin: 0 }}>
            This creates a new client project with a design system rebuilt from the site's global colours, variables and presets. Your current project doesn't change. Check what was found, change anything that's wrong, then compare the site with the system under <strong>Site differences</strong>.
          </p>
          <div className="rt-fields">
            <label className="field">
              <span className="field-label">Project name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Website (optional)</span>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </label>
          </div>

          {reading.notes.some((n) => n.level === 'warn') && (
            <ul className="rt-notes">
              {reading.notes
                .filter((n) => n.level === 'warn')
                .map((n, i) => (
                  <li key={i} className="warn">
                    {n.text}
                  </li>
                ))}
            </ul>
          )}

          <h3 className="rt-h">Colours</h3>
          <ul className="rt-roles">
            {ROLE_KEYS.map((k) => {
              const f = reading.roles.find((r) => r.role === k)!
              const hex = sys.roles[k].hex
              const changed = !!roles[k] && roles[k] !== f.hex
              return (
                <li key={k}>
                  <div className="rt-role-head">
                    <strong>{ROLE_INFO[k].label}</strong>
                    <span className={`tag rt-how-${changed ? 'manual' : f.how}`}>{changed ? 'Changed by you' : HOW[f.how]}</span>
                  </div>
                  <div className="rt-scale" aria-hidden="true">
                    {scales[k].map((h, i) => (
                      <span key={i} style={{ background: h }} />
                    ))}
                  </div>
                  <div className="row wrap rt-role-pick">
                    <input type="color" value={hex} onChange={(e) => setRoles((r) => ({ ...r, [k]: e.target.value }))} aria-label={`${ROLE_INFO[k].label} colour`} />
                    <select
                      value={siteHexes.some((c) => c.hex === hex) ? hex : ''}
                      onChange={(e) => setRoles((r) => ({ ...r, [k]: e.target.value || f.hex }))}
                      aria-label={`Use a site colour for ${ROLE_INFO[k].label}`}
                    >
                      <option value="">{hex.toUpperCase()}{siteHexes.some((c) => c.hex === hex) ? '' : ' (not a site colour)'}</option>
                      {siteHexes.map((c) => (
                        <option key={c.id} value={c.hex!}>
                          {c.label} · {c.hex!.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="muted small">{changed ? `Was ${f.hex.toUpperCase()}: ${f.source}` : f.source}</span>
                </li>
              )
            })}
          </ul>
          {reading.textColor && (
            <label className="divi-check">
              <input type="checkbox" checked={keepText} onChange={(e) => setKeepText(e.target.checked)} />
              <span>
                Keep the site's exact text colour <span className="chip" style={{ background: reading.textColor.hex }} /> {reading.textColor.hex.toUpperCase()} <span className="muted small">({reading.textColor.source})</span>
              </span>
            </label>
          )}

          <h3 className="rt-h">Fonts</h3>
          <datalist id="rt-font-list">
            {families.map((f) => (
              <option key={f.family} value={f.family} />
            ))}
          </datalist>
          <div className="rt-fields">
            {(
              [
                ['Headings', heading, setHeading, reading.fonts.heading],
                ['Body text', body, setBody, reading.fonts.body],
              ] as const
            ).map(([label, value, setValue, finding]) => (
              <label className="field" key={label}>
                <span className="field-label">{label}</span>
                <input list="rt-font-list" value={value} onChange={(e) => setValue(e.target.value)} style={{ fontFamily: fontStack(value, sys.fonts.meta) }} />
                <span className="muted small">{finding.source}</span>
              </label>
            ))}
          </div>

          <h3 className="rt-h">Type, spacing and radius</h3>
          <ul className="rt-facts">
            <li>
              <strong>Type scale:</strong> body {sys.type!.minBase}px → {sys.type!.maxBase}px, ratio {sys.type!.minRatio} → {sys.type!.maxRatio}, screens {sys.type!.minVw}–{sys.type!.maxVw}px.{' '}
              <span className="muted small">{reading.type.source}</span>
            </li>
            <li>
              <strong>Corner radius:</strong> {sys.radius}px. <span className="muted small">{reading.radius.source}</span>
            </li>
            {reading.spacing.length > 0 && (
              <li>
                <strong>Spacing on the site:</strong>{' '}
                {reading.spacing.map((s, i) => (
                  <span key={s.label}>
                    {i > 0 && ', '}
                    <code>{s.label}</code> <span className="muted small">{fluidText(s.read) || 'not a size'}</span>
                  </span>
                ))}
              </li>
            )}
            {reading.button && (
              <li className="rt-button-row">
                <strong>Main button:</strong>{' '}
                <span className="rt-button" style={{ background: reading.button.background ?? undefined, color: reading.button.text ?? undefined, borderRadius: sys.radius, fontFamily: fontStack(sys.fonts.body, sys.fonts.meta) }}>
                  {reading.button.name}
                </span>{' '}
                <span className="muted small">background “{reading.button.backgroundLabel}”</span>
              </li>
            )}
          </ul>
          {reading.notes.some((n) => n.level === 'info') && (
            <ul className="rt-notes">
              {reading.notes
                .filter((n) => n.level === 'info')
                .map((n, i) => (
                  <li key={i}>{n.text}</li>
                ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function readOpts(): Partial<DiviOptions> {
  try {
    return JSON.parse(localStorage.getItem('d5wt:diviOpts') ?? '{}')
  } catch {
    return {}
  }
}

/* ---------- Differences ---------- */

const STATUS_LABEL: Record<DiffStatus, string> = { changed: 'Changes', new: 'New', same: 'Same', 'site-only': 'Only on site' }
const KIND_LABEL: Record<DiffKind, string> = { color: 'Global colours', variable: 'Variables', preset: 'Presets' }
type Filter = DiffStatus | 'all'

function Value({ item, side }: { item: DiffItem; side: 'site' | 'system' }) {
  const hex = side === 'site' ? item.siteHex : item.systemHex
  const fl = side === 'site' ? item.siteFluid : item.systemFluid
  const raw = side === 'site' ? item.site : item.system
  if (item.kind === 'color') return hex ? <span className="rt-val"><span className="chip" style={{ background: hex }} /> {hex.toUpperCase()}</span> : <span className="muted">—</span>
  if (item.kind === 'variable') return raw ? <span className="rt-val" title={raw}>{fluidText(fl ?? null) || raw}</span> : <span className="muted">—</span>
  return null
}

export function DiffTab({ sys, source }: { sys: DesignSystem; source: DiviExport }) {
  const opts: DiviOptions = useMemo(() => ({ ...DEFAULT_DIVI_OPTIONS, ...readOpts(), onConflict: 'update' }), [])
  const build = useMemo(() => buildDiviImport(sys, opts, source), [sys, opts, source])
  const items = useMemo(() => diffSite(build, source), [build, source])
  // selection resets when the design system (and so the item list) changes
  const [picked, setPicked] = useState(() => ({ items, set: defaultSelection(items) }))
  const selected = picked.items === items ? picked.set : defaultSelection(items)
  const setSelected = (fn: (s: Set<string>) => Set<string>) => setPicked({ items, set: fn(selected) })
  const [filterState, setFilter] = useState<Filter | null>(null)
  const result = useMemo(() => selectiveImport(build, source, selected), [build, source, selected])
  const count = (s: DiffStatus) => items.filter((i) => i.status === s).length
  const filter: Filter = filterState ?? (count('changed') ? 'changed' : count('new') ? 'new' : 'all')
  const order: Record<DiffStatus, number> = { changed: 0, new: 1, same: 2, 'site-only': 3 }
  const shown = items.filter((i) => filter === 'all' || i.status === filter).sort((a, b) => order[a.status] - order[b.status])
  const toggle = (keys: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      keys.forEach((k) => (on ? n.add(k) : n.delete(k)))
      return n
    })
  const slug = sys.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'
  const labelOfColour = (id: string) => build.file.global_colors.find(([k]) => k === id)?.[1].label

  return (
    <div className="stack">
      <p className="muted small" style={{ margin: 0 }}>
        Your site (the uploaded export) compared with this design system, using the settings from the Import file tab. Tick what should change. Unticked items stay exactly as they are on the site, and nothing is ever deleted.
      </p>
      <Segmented
        label="Show"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'changed', label: `Changes (${count('changed')})` },
          { id: 'new', label: `New (${count('new')})` },
          { id: 'same', label: `Same (${count('same')})` },
          { id: 'site-only', label: `Only on site (${count('site-only')})` },
          { id: 'all', label: 'All' },
        ]}
      />
      {filter === 'site-only' && <p className="muted small" style={{ margin: 0 }}>These are on the site but not in the design system. The update file never removes them.</p>}

      {(['color', 'variable', 'preset'] as DiffKind[]).map((kind) => {
        const list = shown.filter((i) => i.kind === kind)
        if (!list.length) return null
        const pickable = list.filter((i) => i.status === 'changed' || i.status === 'new').map((i) => i.key)
        const on = pickable.filter((k) => selected.has(k)).length
        return (
          <section key={kind} className="rt-group">
            <div className="row space-between wrap">
              <h3 className="rt-h">
                {KIND_LABEL[kind]} <span className="muted small">({list.length})</span>
              </h3>
              {pickable.length > 0 && (
                <label className="divi-check">
                  <input type="checkbox" checked={on === pickable.length} ref={(el) => {
                    if (el) el.indeterminate = on > 0 && on < pickable.length
                  }} onChange={(e) => toggle(pickable, e.target.checked)} />
                  Select all ({on}/{pickable.length})
                </label>
              )}
            </div>
            <ul className="rt-diff">
              {list.map((i) => {
                const pick = i.status === 'changed' || i.status === 'new'
                return (
                  <li key={i.key} className={`rt-${i.status}`}>
                    <input type="checkbox" disabled={!pick} checked={pick && selected.has(i.key)} onChange={(e) => toggle([i.key], e.target.checked)} aria-label={`Include ${i.label}`} />
                    <span className="rt-name">
                      <strong>{i.label}</strong>
                      {i.group && <span className="muted small"> {i.group}</span>}
                    </span>
                    <span className={`tag rt-tag-${i.status}`}>{STATUS_LABEL[i.status]}</span>
                    {kind !== 'preset' && (
                      <span className="rt-values">
                        {i.status !== 'new' && <Value item={i} side="site" />}
                        {(i.status === 'changed' || i.status === 'new') && (
                          <>
                            {i.status === 'changed' && <span className="muted">→</span>}
                            <Value item={i} side="system" />
                          </>
                        )}
                        {i.relinkOnly && i.system && <span className="muted small">same colour, now linked to {labelOfColour(i.system.match(/"name":"([^"]+)"/)?.[1] ?? '') ?? 'a scale colour'}</span>}
                      </span>
                    )}
                    {kind === 'preset' && i.status === 'changed' && <span className="muted small rt-values">settings differ</span>}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <div className="rt-bar">
        <span>
          <strong>{selected.size}</strong> selected
          {result.added.length > 0 && <span className="muted small"> + {result.added.length} added automatically because selected items use them</span>}
          {result.broken.length > 0 && <span className="form-error"> {result.broken.length} broken references</span>}
        </span>
        <button className="btn btn-primary" type="button" disabled={!selected.size} onClick={() => downloadText(JSON.stringify(result.file, null, 1), `${slug}-divi5-update.json`, 'application/json')}>
          <Icon name="download" size={16} /> Download update file
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Import it in Divi the same way you exported your presets, on a staging site or after a backup first.
      </p>
    </div>
  )
}
