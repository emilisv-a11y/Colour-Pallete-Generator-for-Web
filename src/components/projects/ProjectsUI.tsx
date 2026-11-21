import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildHandoffZip, DEFAULT_PARTS, estimateSize, type HandoffInput, type HandoffParts } from '../../lib/handoff'
import type { Lang } from '../../lib/handoffText'
import type { DiviExport, DiviOptions, SectionKind } from '../../lib/divi'
import { downloadBlob } from '../../lib/exports'
import { metaFor } from '../../lib/fonts'
import { loadLibrary } from '../../lib/googleFonts'
import { loadNames } from '../../lib/names'
import {
  getActiveProjectId,
  getProjectList,
  newProject,
  projectData,
  projectSystem,
  snapshotWorking,
  STATUSES,
  switchProject,
  updateProject,
  type Project,
  type ProjectStatus,
} from '../../lib/projects'
import { defaultWeights, fetchPlan, fetchSizes, formatBytes, type FontFile } from '../../lib/selfHost'
import { useStorageVersion } from '../../lib/storage'
import { useGenerator } from '../../state/GeneratorContext'
import { freshSnapshot } from '../../state/palette'
import { Icon } from '../Icon'
import { Modal, Popover, Segmented, useToast } from '../ui'

/** Switch projects, loading the target's generator state (or a fresh palette). */
export function useSwitchProject() {
  const gen = useGenerator()
  const toast = useToast()
  return (id: string, quiet = false) => {
    if (id === getActiveProjectId()) return
    const next = switchProject(id, gen.snapshot())
    gen.loadSnapshot(next ?? freshSnapshot())
    if (!quiet) toast(`Switched to “${getProjectList().find((p) => p.id === id)?.name}”`)
  }
}

export const statusLabel = (s: ProjectStatus) => STATUSES.find((x) => x.id === s)?.label ?? s

/* ---------- create / edit ---------- */

export function ProjectModal({ project, onClose }: { project?: Project; onClose: () => void }) {
  const gen = useGenerator()
  const switchTo = useSwitchProject()
  const toast = useToast()
  const [name, setName] = useState(project?.name ?? '')
  const [client, setClient] = useState(project?.client ?? '')
  const [website, setWebsite] = useState(project?.website ?? '')
  const [notes, setNotes] = useState(project?.notes ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'draft')
  const [copyCurrent, setCopyCurrent] = useState(false)

  const save = () => {
    if (project) {
      updateProject(project.id, { name: name.trim() || project.name, client, website, notes, status })
      toast('Project saved')
    } else {
      const data = copyCurrent ? structuredClone(snapshotWorking(gen.snapshot())) : {}
      if (copyCurrent) delete data['d5wt:activeSession']
      const p = newProject({ name, client, website, notes, status }, data)
      switchTo(p.id, true)
      toast(`Created “${p.name}”`)
    }
    onClose()
  }

  return (
    <Modal
      title={project ? 'Edit project' : 'New project'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            {project ? 'Save' : 'Create project'}
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
        <label className="field">
          <span className="field-label">Project name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bakery website" />
        </label>
        <div className="row wrap">
          <label className="field grow">
            <span className="field-label">Client</span>
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Company or person" />
          </label>
          <label className="field grow">
            <span className="field-label">Website</span>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Notes (included in the handoff README)</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {!project && (
          <label className="divi-check">
            <input type="checkbox" checked={copyCurrent} onChange={(e) => setCopyCurrent(e.target.checked)} /> Start from the current palette, design system and Divi settings
            (otherwise a fresh start)
          </label>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

/* ---------- header switcher ---------- */

export function ProjectSwitcher() {
  useStorageVersion()
  const navigate = useNavigate()
  const switchTo = useSwitchProject()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const activeId = getActiveProjectId()
  const list = getProjectList()
  const active = list.find((p) => p.id === activeId)
  const visible = list.filter((p) => !p.archived).sort((a, b) => b.updatedAt - a.updatedAt)
  return (
    <div className="pop-anchor">
      <button className="project-switch" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title="Switch client project">
        <Icon name="folder" size={16} />
        <span className="project-switch-name">{active?.name ?? 'Projects'}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)} className="project-menu">
          <span className="field-label">Projects</span>
          {visible.map((p) => (
            <button
              key={p.id}
              role="menuitemradio"
              aria-checked={p.id === activeId}
              className={`project-item ${p.id === activeId ? 'on' : ''}`}
              onClick={() => {
                switchTo(p.id)
                setOpen(false)
              }}
            >
              <span className={`status-dot s-${p.status}`} />
              <span className="grow">
                <strong>{p.name}</strong>
                {p.client && <span className="muted small"> · {p.client}</span>}
              </span>
              {p.id === activeId && <Icon name="check" size={14} />}
            </button>
          ))}
          <div className="project-menu-foot">
            <button
              className="btn btn-small"
              onClick={() => {
                setOpen(false)
                setCreating(true)
              }}
            >
              <Icon name="plus" size={14} /> New project
            </button>
            <button
              className="btn btn-small"
              onClick={() => {
                setOpen(false)
                navigate('/projects')
              }}
            >
              Manage projects
            </button>
          </div>
        </Popover>
      )}
      {creating && <ProjectModal onClose={() => setCreating(false)} />}
    </div>
  )
}

/* ---------- handoff ---------- */

const PART_LABELS: { key: keyof HandoffParts; label: string; hint: string }[] = [
  { key: 'brandKit', label: 'Brand guidelines', hint: 'brand-kit.html: opens in any browser, prints to PDF' },
  { key: 'colours', label: 'Palette files', hint: 'PDF colour sheet, Adobe ASE, GIMP palette, PNG, SVG' },
  { key: 'tokens', label: 'Design tokens', hint: 'CSS (light + dark), SCSS, Tailwind, W3C tokens, Tokens Studio, Bootstrap' },
  { key: 'typography', label: 'Fluid typography', hint: 'clamp() type and spacing scale' },
  { key: 'divi', label: 'Divi 5 files', hint: 'import file, Theme Options CSS, section plan' },
  { key: 'fonts', label: 'Self-hosted fonts', hint: 'WOFF2 files + CSS, no connection to Google' },
]

export function HandoffModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const gen = useGenerator()
  const toast = useToast()
  const navigate = useNavigate()
  const switchTo = useSwitchProject()
  const data = useMemo(() => projectData(project, gen.snapshot()), [project.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const sys = projectSystem(project, gen.snapshot())
  const [lang, setLang] = useState<Lang>('en')
  const [parts, setParts] = useState<HandoffParts>(DEFAULT_PARTS)
  const [fontFiles, setFontFiles] = useState<FontFile[] | null>(null)
  const [fontError, setFontError] = useState('')
  const [busy, setBusy] = useState('')

  // Work out the self-hosted font files (and their sizes) for this project's fonts.
  useEffect(() => {
    if (!sys) return
    let cancelled = false
    ;(async () => {
      try {
        await loadLibrary()
        const fams = [...new Set([sys.fonts.heading, sys.fonts.body])]
        const reqs = fams.map((f) => {
          const meta = metaFor(f, sys.fonts.meta)
          const roles = [f === sys.fonts.heading ? 'heading' : null, f === sys.fonts.body ? 'body' : null].filter(Boolean) as ('heading' | 'body')[]
          return { family: f, weights: [...new Set(roles.flatMap((r) => defaultWeights(meta, r)))].sort((a, b) => a - b), italic: false, variable: !!meta?.variable }
        })
        const plan = await fetchPlan(reqs, ['latin', 'latin-ext'])
        if (!cancelled) setFontFiles(await fetchSizes(plan))
      } catch (e) {
        if (!cancelled) setFontError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sys?.fonts.heading, sys?.fonts.body]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!sys) {
    return (
      <Modal title="Handoff package" onClose={onClose}>
        <p>“{project.name}” has no design system yet. The handoff package is built from it.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            switchTo(project.id)
            onClose()
            navigate('/system')
          }}
        >
          Open this project's Design system
        </button>
      </Modal>
    )
  }

  const input: HandoffInput = {
    project: { name: project.name, client: project.client, website: project.website, notes: project.notes },
    sys,
    divi: {
      source: (data['d5wt:diviSource'] as DiviExport | null) ?? null,
      options: (data['d5wt:diviOpts'] as Partial<DiviOptions> | null) ?? null,
      plan: (data['d5wt:sectionPlan'] as SectionKind[] | null) ?? null,
    },
    fontFiles: parts.fonts && fontFiles ? fontFiles : undefined,
  }
  const size = estimateSize(input, lang, parts)
  const fontsPending = parts.fonts && !fontFiles && !fontError

  return (
    <Modal title={`Handoff package · ${project.name}`} onClose={onClose} wide>
      <p className="muted small" style={{ margin: 0 }}>
        One ZIP for the client or developer: a README with install steps, the brand guidelines and every file needed to build the site.
      </p>
      <div className="field">
        <span className="field-label">Language of the README and brand guidelines</span>
        <Segmented
          label="Language"
          value={lang}
          onChange={setLang}
          options={[
            { id: 'en', label: 'English' },
            { id: 'lt', label: 'Lietuvių' },
          ]}
        />
      </div>
      <div className="handoff-parts">
        {PART_LABELS.map((p) => (
          <label key={p.key} className={`handoff-part ${parts[p.key] ? 'on' : ''}`}>
            <input type="checkbox" checked={parts[p.key]} onChange={(e) => setParts({ ...parts, [p.key]: e.target.checked })} />
            <span>
              <strong>{p.label}</strong>
              <span className="muted small">
                {p.hint}
                {p.key === 'fonts' && parts.fonts && (fontError ? ` · couldn't prepare fonts: ${fontError}` : fontFiles ? ` · ${fontFiles.length} files, ${formatBytes(fontFiles.reduce((n, f) => n + (f.size ?? 0), 0))}` : ' · checking…')}
                {p.key === 'divi' && parts.divi && !data['d5wt:diviSource'] && ' · tip: upload the site export on the Divi 5 page first so names merge'}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="row wrap space-between">
        <span className="muted small">
          Fonts: <strong>{sys.fonts.heading}</strong> + <strong>{sys.fonts.body}</strong> · About <strong>{formatBytes(size)}</strong>
        </span>
        <button
          className="btn btn-primary"
          disabled={!!busy || fontsPending}
          onClick={async () => {
            try {
              setBusy('Preparing…')
              await loadNames()
              const { blob, name, files } = await buildHandoffZip(input, lang, parts, setBusy)
              downloadBlob(blob, name)
              toast(`Downloaded ${files.length} files`)
              if (project.status === 'draft' || project.status === 'progress') updateProject(project.id, { status: 'handoff' })
            } catch (e) {
              alert(`Could not build the package: ${(e as Error).message}`)
            } finally {
              setBusy('')
            }
          }}
        >
          <Icon name="download" size={16} /> {busy || (fontsPending ? 'Preparing fonts…' : 'Download handoff ZIP')}
        </button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Want to check the pieces first? <Link to="/brand-kit" onClick={onClose}>Brand kit</Link>, <Link to="/divi" onClick={onClose}>Divi 5</Link> and{' '}
        <Link to="/system" onClick={onClose}>Design system</Link> show the active project.
      </p>
    </Modal>
  )
}
