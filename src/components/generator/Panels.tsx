import { useMemo, useRef, useState } from 'react'
import { adjustColor, NO_ADJUSTMENTS, type Adjustments } from '../../lib/color'
import {
  CODE_FORMATS,
  downloadBlob,
  downloadText,
  exportCode,
  paletteKeys,
  palettePngBlob,
  paletteSlug,
  paletteSvg,
  shareUrl,
  type CodeFormat,
  type Naming,
} from '../../lib/exports'
import { colorName } from '../../lib/names'
import {
  deleteSession,
  getActiveSessionId,
  getProjects,
  getSessions,
  importBackup,
  savePalette,
  saveSession,
  sessionFile,
  useStorageVersion,
  type Session,
} from '../../lib/storage'
import { useGenerator } from '../../state/GeneratorContext'
import type { Swatch } from '../../lib/storage'
import { Icon } from '../Icon'
import { CodeBlock, Modal, Popover, Segmented, useCopy, useToast } from '../ui'

export function MiniPalette({ hexes, className = '' }: { hexes: string[]; className?: string }) {
  return (
    <div className={`mini-palette ${className}`}>
      {hexes.map((h, i) => (
        <span key={i} style={{ background: h }} />
      ))}
    </div>
  )
}

/* ---------- Export ---------- */

export function ExportModal({ hexes, onClose }: { hexes: string[]; onClose: () => void }) {
  const [tab, setTab] = useState<'code' | 'image' | 'link'>('code')
  const [format, setFormat] = useState<CodeFormat>('css')
  const [naming, setNaming] = useState<Naming>('names')
  const copy = useCopy()
  const code = useMemo(() => exportCode(hexes, format, naming), [hexes, format, naming])
  const svg = useMemo(() => paletteSvg(hexes), [hexes])
  const url = shareUrl(hexes)
  const fmt = CODE_FORMATS.find((f) => f.id === format)!
  const htmlSnippet = `<div style="display:flex;height:120px;border-radius:12px;overflow:hidden">\n${hexes
    .map((h) => `  <div style="flex:1;background:${h}" title="${h}"></div>`)
    .join('\n')}\n</div>`

  return (
    <Modal title="Export palette" onClose={onClose} wide>
      <Segmented
        label="Export type"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'code', label: 'Code' },
          { id: 'image', label: 'Image' },
          { id: 'link', label: 'Link & embed' },
        ]}
      />
      <MiniPalette hexes={hexes} className="export-preview" />
      {tab === 'code' && (
        <div className="stack">
          <div className="row wrap">
            <label className="field">
              <span className="field-label">Format</span>
              <select value={format} onChange={(e) => setFormat(e.target.value as CodeFormat)}>
                {CODE_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="field-label">Variable names</span>
              <Segmented
                label="Variable names"
                value={naming}
                onChange={setNaming}
                options={[
                  { id: 'names', label: 'Colour names' },
                  { id: 'numbered', label: 'color-1, color-2…' },
                ]}
              />
            </div>
          </div>
          <CodeBlock code={code} label={fmt.label} />
          <div className="row">
            <button className="btn" onClick={() => downloadText(code, `palette-${paletteSlug(hexes)}.${fmt.ext}`)}>
              <Icon name="download" size={16} /> Download .{fmt.ext}
            </button>
          </div>
        </div>
      )}
      {tab === 'image' && (
        <div className="stack">
          <div className="image-preview" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="row">
            <button className="btn btn-primary" onClick={async () => downloadBlob(await palettePngBlob(hexes), `palette-${paletteSlug(hexes)}.png`)}>
              <Icon name="download" size={16} /> PNG
            </button>
            <button className="btn" onClick={() => downloadText(svg, `palette-${paletteSlug(hexes)}.svg`, 'image/svg+xml')}>
              <Icon name="download" size={16} /> SVG
            </button>
          </div>
          <p className="muted small">PDF and Adobe swatch (ASE) export arrive in Phase 2.</p>
        </div>
      )}
      {tab === 'link' && (
        <div className="stack">
          <label className="field">
            <span className="field-label">Shareable link</span>
            <div className="row">
              <input readOnly value={url} onFocus={(e) => e.target.select()} />
              <button className="btn btn-primary" onClick={() => copy(url, 'link')}>
                <Icon name="copy" size={16} /> Copy
              </button>
            </div>
          </label>
          <div className="field">
            <span className="field-label">HTML snippet</span>
            <CodeBlock code={htmlSnippet} label="HTML snippet" />
          </div>
          <div className="field">
            <span className="field-label">Variable names used in code exports</span>
            <p className="muted small">{paletteKeys(hexes, 'names').join(', ')}</p>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ---------- Save palette ---------- */

export function SaveModal({ hexes, onClose }: { hexes: string[]; onClose: () => void }) {
  const toast = useToast()
  const defaultName = hexes
    .slice(0, 2)
    .map((h) => colorName(h))
    .filter(Boolean)
    .join(' & ')
  const [name, setName] = useState(defaultName || 'Untitled palette')
  const [project, setProject] = useState('')
  const projects = getProjects()
  const save = () => {
    savePalette({ name: name.trim() || 'Untitled palette', project: project.trim(), colors: hexes })
    toast('Palette saved to Library')
    onClose()
  }
  return (
    <Modal
      title="Save palette"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="save" size={16} /> Save
          </button>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <MiniPalette hexes={hexes} />
        <label className="field">
          <span className="field-label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Project (optional)</span>
          <input value={project} onChange={(e) => setProject(e.target.value)} list="project-list" placeholder="e.g. Client website" />
          <datalist id="project-list">
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

/* ---------- Sessions ---------- */

export function SessionsModal({ onClose }: { onClose: () => void }) {
  useStorageVersion()
  const gen = useGenerator()
  const toast = useToast()
  const sessions = getSessions()
  const activeId = getActiveSessionId()
  const active = sessions.find((s) => s.id === activeId)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const saveNew = () => {
    const s = saveSession({ name: name.trim() || `Session ${new Date().toLocaleString()}`, notes, generator: gen.snapshot(), extra: {} })
    toast(`Saved session “${s.name}”`)
    setName('')
    setNotes('')
  }
  const update = (s: Session) => {
    saveSession({ ...s, generator: gen.snapshot() })
    toast(`Updated “${s.name}”`)
  }
  const load = (s: Session) => {
    if (activeId !== s.id && !confirm(`Load “${s.name}”? Your current palette and history will be replaced. Save it as a session first if you want to keep it.`)) return
    gen.loadSnapshot(s.generator)
    saveSession({ ...s }) // marks it active and bumps updatedAt
    toast(`Loaded “${s.name}”`)
    onClose()
  }

  return (
    <Modal title="Sessions" onClose={onClose} wide>
      <p className="muted">
        A session stores your whole working state: the palette, locks, full undo history and generator settings. Your work is
        also autosaved in this browser, so closing the tab never loses it.
      </p>

      {active && (
        <div className="callout row wrap">
          <div className="grow">
            <strong>Active session: {active.name}</strong>
            <div className="muted small">Last saved {new Date(active.updatedAt).toLocaleString()}</div>
          </div>
          <button className="btn btn-primary" onClick={() => update(active)}>
            <Icon name="save" size={16} /> Save changes
          </button>
        </div>
      )}

      <form
        className="stack session-new"
        onSubmit={(e) => {
          e.preventDefault()
          saveNew()
        }}
      >
        <h3>Save current work as a new session</h3>
        <div className="row wrap">
          <input className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="Session name, e.g. Bakery site – v1" />
          <button className="btn" type="submit">
            <Icon name="plus" size={16} /> Save new
          </button>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} />
      </form>

      <div className="row space-between">
        <h3>Saved sessions ({sessions.length})</h3>
        <div className="row">
          <button className="btn btn-small" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> Import file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const r = importBackup(await f.text())
                toast(`Imported ${r.sessions} session(s), ${r.palettes} palette(s)`)
              } catch (err) {
                alert((err as Error).message)
              }
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {sessions.length === 0 && <p className="muted">No sessions yet.</p>}
      <ul className="session-list">
        {sessions.map((s) => (
          <li key={s.id} className={s.id === activeId ? 'active' : ''}>
            <MiniPalette hexes={s.generator.present.map((x) => x.hex)} />
            <div className="grow">
              <strong>{s.name}</strong>
              <div className="muted small">
                {new Date(s.updatedAt).toLocaleString()} · {s.generator.past.length} history steps
                {s.notes && <> · {s.notes}</>}
              </div>
            </div>
            <div className="row">
              <button className="btn btn-small btn-primary" onClick={() => load(s)}>
                Load
              </button>
              <button
                className="icon-btn"
                title="Download session file"
                aria-label={`Download ${s.name}`}
                onClick={() => downloadText(JSON.stringify(sessionFile(s), null, 2), `d5-session-${s.name.replace(/[^a-z0-9]+/gi, '-')}.json`, 'application/json')}
              >
                <Icon name="download" size={16} />
              </button>
              <button
                className="icon-btn danger"
                title="Delete session"
                aria-label={`Delete ${s.name}`}
                onClick={() => confirm(`Delete session “${s.name}”?`) && deleteSession(s.id)}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

/* ---------- Adjust ---------- */

const SLIDERS: { key: keyof Adjustments; label: string; min: number; max: number }[] = [
  { key: 'hue', label: 'Hue', min: -180, max: 180 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
]

export function AdjustPanel({
  value,
  onChange,
  onApply,
  onCancel,
}: {
  value: Adjustments
  onChange: (a: Adjustments) => void
  onApply: () => void
  onCancel: () => void
}) {
  return (
    <aside className="adjust-panel" aria-label="Adjust palette">
      <div className="row space-between">
        <h3>Adjust palette</h3>
        <button className="btn btn-small" onClick={() => onChange(NO_ADJUSTMENTS)}>
          Reset
        </button>
      </div>
      {SLIDERS.map((s) => (
        <label key={s.key} className={`slider slider-${s.key}`}>
          <span className="row space-between">
            <span>{s.label}</span>
            <span className="muted">
              {value[s.key] > 0 ? '+' : ''}
              {value[s.key]}
            </span>
          </span>
          <input type="range" min={s.min} max={s.max} value={value[s.key]} onChange={(e) => onChange({ ...value, [s.key]: Number(e.target.value) })} />
        </label>
      ))}
      <div className="row">
        <button className="btn grow" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary grow" onClick={onApply}>
          Apply
        </button>
      </div>
    </aside>
  )
}

export function applyAdjust(swatches: Swatch[], a: Adjustments): Swatch[] {
  return swatches.map((s) => ({ ...s, hex: adjustColor(s.hex, a) }))
}

/* ---------- History ---------- */

export function HistoryPopover({ past, onJump, onClose }: { past: Swatch[][]; onJump: (i: number) => void; onClose: () => void }) {
  return (
    <Popover onClose={onClose} className="history-pop">
      <h3>History</h3>
      {past.length === 0 && <p className="muted small">No earlier palettes yet. Press space to generate.</p>}
      <ul>
        {past
          .map((p, i) => ({ p, i }))
          .reverse()
          .slice(0, 40)
          .map(({ p, i }) => (
            <li key={i}>
              <button
                onClick={() => {
                  onJump(i)
                  onClose()
                }}
                title="Go back to this palette"
              >
                <MiniPalette hexes={p.map((s) => s.hex)} />
              </button>
            </li>
          ))}
      </ul>
    </Popover>
  )
}

/* ---------- Shortcuts ---------- */

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['Space', 'Generate a new palette'],
    ['Ctrl/⌘ + Z', 'Undo'],
    ['Ctrl/⌘ + Shift + Z  or  Ctrl + Y', 'Redo'],
    ['A', 'Toggle adjust panel'],
    ['E', 'Export'],
    ['S', 'Save palette'],
    ['F', 'Fullscreen'],
    ['?', 'Show shortcuts'],
    ['Esc', 'Close panels'],
  ]
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <table className="kbd-table">
        <tbody>
          {rows.map(([k, d]) => (
            <tr key={k}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}
