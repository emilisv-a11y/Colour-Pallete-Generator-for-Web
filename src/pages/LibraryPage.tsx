import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { MiniPalette } from '../components/generator/Panels'
import { Segmented, useCopy, useToast } from '../components/ui'
import { downloadText, paletteSlug } from '../lib/exports'
import { readableOn } from '../lib/color'
import { useColorNames } from '../lib/names'
import {
  deletePalette,
  deleteSession,
  getActiveSessionId,
  getPalettes,
  getProjects,
  getSavedColors,
  getSessions,
  toggleSavedColor,
  importBackup,
  makeBackup,
  savePalette,
  saveSession,
  setSystem,
  useStorageVersion,
  type SavedPalette,
} from '../lib/storage'
import { useGenerator } from '../state/GeneratorContext'

export default function LibraryPage() {
  useStorageVersion()
  const navigate = useNavigate()
  const toast = useToast()
  const copy = useCopy()
  const gen = useGenerator()
  const [tab, setTab] = useState<'palettes' | 'colors' | 'sessions'>('palettes')
  const [project, setProject] = useState('')
  const [q, setQ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const palettes = getPalettes().filter(
    (p) => (!project || p.project === project) && (!q || `${p.name} ${p.project} ${p.colors.join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  )
  const sessions = getSessions().filter((s) => !q || `${s.name} ${s.notes}`.toLowerCase().includes(q.toLowerCase()))
  const projects = getProjects()
  const activeId = getActiveSessionId()
  const { name: colorName } = useColorNames()
  const savedColors = getSavedColors().filter((c) => !q || `${c.hex} ${colorName(c.hex)}`.toLowerCase().includes(q.toLowerCase()))

  const rename = (p: SavedPalette) => {
    const name = prompt('Palette name', p.name)
    if (name === null) return
    const proj = prompt('Project (leave empty for none)', p.project)
    savePalette({ ...p, name: name.trim() || p.name, project: (proj ?? p.project).trim() })
  }

  return (
    <div className="page library-page">
      <header className="page-head row space-between wrap">
        <div>
          <h1>Library</h1>
          <p className="muted">Everything is stored in this browser. Download a backup to move it to another computer.</p>
        </div>
        <div className="row wrap">
          <button className="btn" onClick={() => downloadText(JSON.stringify(makeBackup(), null, 2), `d5-webtool-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}>
            <Icon name="download" size={16} /> Download backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Import backup
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
                toast(`Imported ${r.palettes} palette(s), ${r.sessions} session(s) and saved colours`)
              } catch (err) {
                alert((err as Error).message)
              }
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <div className="row wrap library-controls">
        <Segmented
          label="Library section"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'palettes', label: `Palettes (${getPalettes().length})` },
            { id: 'colors', label: `Colours (${getSavedColors().length})` },
            { id: 'sessions', label: `Sessions (${getSessions().length})` },
          ]}
        />
        <label className="color-search grow">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, project or hex" aria-label="Search library" />
        </label>
        {tab === 'palettes' && projects.length > 0 && (
          <select value={project} onChange={(e) => setProject(e.target.value)} aria-label="Filter by project">
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      {tab === 'palettes' && (
        <>
          {palettes.length === 0 && (
            <div className="empty">
              <p>No saved palettes yet.</p>
              <Link className="btn btn-primary" to="/generate">
                Open the generator
              </Link>
            </div>
          )}
          <div className="card-grid">
            {palettes.map((p) => (
              <article key={p.id} className="palette-card">
                <Link to={`/generate/${paletteSlug(p.colors)}`} className="palette-card-swatches" title="Open in generator">
                  {p.colors.map((h, i) => (
                    <span key={i} style={{ background: h }} />
                  ))}
                </Link>
                <div className="palette-card-body">
                  <div className="grow">
                    <strong>{p.name}</strong>
                    <div className="muted small">
                      {p.project && <span className="tag">{p.project}</span>} {p.colors.length} colours
                    </div>
                  </div>
                  <button className="icon-btn" title="Copy hex codes" aria-label="Copy hex codes" onClick={() => copy(p.colors.join(', ').toUpperCase(), 'hex codes')}>
                    <Icon name="copy" size={16} />
                  </button>
                  <button className="icon-btn" title="Rename / move to project" aria-label="Rename" onClick={() => rename(p)}>
                    <Icon name="edit" size={16} />
                  </button>
                  <button className="icon-btn danger" title="Delete" aria-label="Delete palette" onClick={() => confirm(`Delete “${p.name}”?`) && deletePalette(p.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === 'colors' && (
        <>
          {savedColors.length === 0 && (
            <div className="empty">
              <p>No saved colours yet. Use the heart on a generator swatch or on a colour's detail page.</p>
            </div>
          )}
          {savedColors.length >= 2 && (
            <div className="row">
              <Link className="btn" to={`/generate/${paletteSlug(savedColors.slice(0, 10).map((c) => c.hex))}`}>
                <Icon name="wand" size={16} /> Open {Math.min(10, savedColors.length)} in generator
              </Link>
            </div>
          )}
          <div className="color-grid">
            {savedColors.map((c) => (
              <article key={c.hex} className="color-tile">
                <Link to={`/color/${c.hex.slice(1)}`} className="color-tile-swatch" style={{ background: c.hex, color: readableOn(c.hex) }}>
                  {c.hex.slice(1).toUpperCase()}
                </Link>
                <div className="row">
                  <span className="grow small">{colorName(c.hex)}</span>
                  <button className="icon-btn" onClick={() => copy(c.hex.toUpperCase())} aria-label={`Copy ${c.hex}`} title="Copy">
                    <Icon name="copy" size={14} />
                  </button>
                  <button className="icon-btn danger" onClick={() => toggleSavedColor(c.hex)} aria-label={`Remove ${c.hex}`} title="Remove">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === 'sessions' && (
        <>
          {sessions.length === 0 && (
            <div className="empty">
              <p>No sessions yet. In the generator, use the Sessions button to save your whole working state.</p>
            </div>
          )}
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.id} className={s.id === activeId ? 'active' : ''}>
                <MiniPalette hexes={s.generator.present.map((x) => x.hex)} />
                <div className="grow">
                  <strong>{s.name}</strong> {s.id === activeId && <span className="tag">active</span>}
                  <div className="muted small">
                    Updated {new Date(s.updatedAt).toLocaleString()} · {s.generator.past.length} history steps
                    {s.notes && <> · {s.notes}</>}
                  </div>
                </div>
                <div className="row">
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => {
                      if (s.id !== activeId && !confirm(`Load “${s.name}”? Your current working palette and history will be replaced.`)) return
                      gen.loadSnapshot(s.generator)
                      if (s.extra?.system) setSystem(s.extra.system as never)
                      saveSession({ ...s })
                      navigate(`/generate/${paletteSlug(s.generator.present.map((x) => x.hex))}`)
                    }}
                  >
                    Load
                  </button>
                  <button
                    className="icon-btn"
                    title="Rename"
                    aria-label={`Rename ${s.name}`}
                    onClick={() => {
                      const name = prompt('Session name', s.name)
                      if (name?.trim()) saveSession({ ...s, name: name.trim() }, { activate: false })
                    }}
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button className="icon-btn danger" title="Delete" aria-label={`Delete ${s.name}`} onClick={() => confirm(`Delete session “${s.name}”?`) && deleteSession(s.id)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
