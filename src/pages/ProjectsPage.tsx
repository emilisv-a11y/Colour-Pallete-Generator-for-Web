import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { HandoffModal, ProjectModal, statusLabel, useSwitchProject } from '../components/projects/ProjectsUI'
import { Segmented, useToast } from '../components/ui'
import { deleteProject, duplicateProject, getActiveProjectId, getProjectList, projectGenerator, projectSystem, STATUSES, updateProject, type Project, type ProjectStatus } from '../lib/projects'
import { getPalettes, getSessions, useStorageVersion } from '../lib/storage'
import { ROLE_KEYS } from '../lib/system'
import { useGenerator } from '../state/GeneratorContext'

function colorsOf(p: Project, gen: ReturnType<typeof useGenerator>) {
  const sys = projectSystem(p, gen.snapshot())
  if (sys) return ROLE_KEYS.slice(0, 4).map((r) => sys.roles[r].hex)
  return projectGenerator(p, gen.snapshot())?.present.map((s) => s.hex) ?? []
}

export default function ProjectsPage() {
  useStorageVersion()
  const gen = useGenerator()
  const toast = useToast()
  const navigate = useNavigate()
  const switchTo = useSwitchProject()
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [editing, setEditing] = useState<Project | null | 'new'>(null)
  const [handoff, setHandoff] = useState<Project | null>(null)
  const activeId = getActiveProjectId()
  const all = getProjectList()
  const list = all.filter((p) => (view === 'archived' ? p.archived : !p.archived)).sort((a, b) => (a.id === activeId ? -1 : b.id === activeId ? 1 : b.updatedAt - a.updatedAt))
  const palettes = getPalettes()
  const sessions = getSessions()

  return (
    <div className="page projects-page">
      <header className="page-head row space-between wrap">
        <div>
          <h1>Projects</h1>
          <p className="muted">One project per client: its own design system, palettes, sessions and Divi settings. Switch projects from the header.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size={16} /> New project
        </button>
      </header>

      <Segmented
        label="Show"
        value={view}
        onChange={setView}
        options={[
          { id: 'active', label: `Current (${all.filter((p) => !p.archived).length})` },
          { id: 'archived', label: `Archived (${all.filter((p) => p.archived).length})` },
        ]}
      />

      {list.length === 0 && <div className="empty">{view === 'archived' ? 'No archived projects.' : 'No projects yet.'}</div>}

      <div className="card-grid project-grid">
        {list.map((p) => {
          const colors = colorsOf(p, gen)
          const isActive = p.id === activeId
          const hasSystem = !!projectSystem(p, gen.snapshot())
          return (
            <article key={p.id} className={`palette-card project-card ${isActive ? 'active' : ''}`}>
              <div className="palette-card-swatches">
                {colors.length ? colors.map((h, i) => <span key={i} style={{ background: h }} />) : <span className="no-colours">No colours yet</span>}
              </div>
              <div className="project-body">
                <div className="row space-between">
                  <h3>{p.name}</h3>
                  {isActive && <span className="tag">Open</span>}
                </div>
                <div className="muted small">
                  {p.client || 'No client set'}
                  {p.website && <> · {p.website.replace(/^https?:\/\//, '')}</>}
                </div>
                <div className="row wrap small">
                  <select value={p.status} onChange={(e) => updateProject(p.id, { status: e.target.value as ProjectStatus })} aria-label={`Status of ${p.name}`} className={`status-select s-${p.status}`}>
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="muted">
                    {palettes.filter((x) => x.projectId === p.id).length} palettes · {sessions.filter((x) => x.projectId === p.id).length} sessions · {hasSystem ? 'design system ✓' : 'no design system'}
                  </span>
                </div>
                <div className="muted small">Updated {new Date(p.updatedAt).toLocaleDateString()}</div>
                <div className="row wrap project-actions">
                  {!isActive && (
                    <button className="btn btn-small btn-primary" onClick={() => switchTo(p.id)}>
                      Open
                    </button>
                  )}
                  {isActive && (
                    <button className="btn btn-small btn-primary" onClick={() => navigate('/system')}>
                      Design system
                    </button>
                  )}
                  <button className="btn btn-small" onClick={() => setHandoff(p)} title="Download the client handoff package">
                    <Icon name="download" size={14} /> Handoff ZIP
                  </button>
                  <button className="icon-btn" onClick={() => setEditing(p)} title="Edit details" aria-label={`Edit ${p.name}`}>
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      const c = duplicateProject(p.id, gen.snapshot())
                      if (c) toast(`Created “${c.name}”`)
                    }}
                    title="Duplicate"
                    aria-label={`Duplicate ${p.name}`}
                  >
                    <Icon name="copy" size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      if (isActive && !p.archived) return toast('Open another project before archiving this one')
                      updateProject(p.id, { archived: !p.archived })
                    }}
                    title={p.archived ? 'Restore' : 'Archive'}
                    aria-label={p.archived ? `Restore ${p.name}` : `Archive ${p.name}`}
                  >
                    <Icon name={p.archived ? 'upload' : 'archive'} size={16} />
                  </button>
                  <button
                    className="icon-btn danger"
                    disabled={isActive}
                    onClick={() => {
                      if (!confirm(`Delete “${p.name}”? Its palettes and sessions stay in the Library without a project.`)) return
                      deleteProject(p.id)
                      toast('Project deleted')
                    }}
                    title={isActive ? 'Open another project before deleting this one' : 'Delete'}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {editing && <ProjectModal project={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {handoff && <HandoffModal project={handoff} onClose={() => setHandoff(null)} />}
      <p className="muted small">Status: {STATUSES.map((s) => statusLabel(s.id)).join(' → ')}. Downloading a handoff package moves Draft and In progress projects to “Ready for handoff”.</p>
    </div>
  )
}
