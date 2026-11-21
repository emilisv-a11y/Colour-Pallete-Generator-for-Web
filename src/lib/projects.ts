/* ============================================================================
   Client projects
   The app's tools read and write a set of "working" keys in localStorage
   (design system, Divi data, generator state…). A project stores a copy of
   those keys. Switching projects saves the working keys into the old project
   and loads the new project's copy, so every tool keeps working unchanged.
   ========================================================================== */

import { getPalettes, getSessions, read, uid, write, type GeneratorSnapshot } from './storage'
import type { DesignSystem } from './system'

export const PROJECTS_KEY = 'd5wt:projects'
export const ACTIVE_PROJECT_KEY = 'd5wt:activeProject'

/** Per-project working keys. Anything not listed here (theme, saved colours, palettes list…) is shared. */
export const WORKING_KEYS = ['d5wt:system', 'd5wt:current', 'd5wt:activeSession', 'd5wt:diviSource', 'd5wt:diviOpts', 'd5wt:sectionPlan', 'd5wt:diviChecklist'] as const

export type ProjectStatus = 'draft' | 'progress' | 'handoff' | 'done'
export const STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'progress', label: 'In progress' },
  { id: 'handoff', label: 'Ready for handoff' },
  { id: 'done', label: 'Done' },
]

export type Project = {
  id: string
  name: string
  client: string
  website: string
  notes: string
  status: ProjectStatus
  archived: boolean
  createdAt: number
  updatedAt: number
  /** copy of the working keys (raw JSON values); for the active project the live keys are the truth */
  data: Record<string, unknown>
}

export const getProjectList = () => read<Project[]>(PROJECTS_KEY, [])
export const getActiveProjectId = () => read<string | null>(ACTIVE_PROJECT_KEY, null)
export const getActiveProject = () => getProjectList().find((p) => p.id === getActiveProjectId()) ?? null

function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}
function writeRaw(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota errors */
  }
}

/** Current working keys as a data object. Pass the generator's in-memory snapshot (autosave lags slightly). */
export function snapshotWorking(generator?: GeneratorSnapshot | null): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  WORKING_KEYS.forEach((k) => (data[k] = readRaw(k)))
  if (generator) data['d5wt:current'] = generator
  return data
}

/** Project data with live values for the active project. */
export function projectData(p: Project, generator?: GeneratorSnapshot | null): Record<string, unknown> {
  return p.id === getActiveProjectId() ? snapshotWorking(generator) : p.data
}

export const projectSystem = (p: Project, generator?: GeneratorSnapshot | null) => (projectData(p, generator)['d5wt:system'] as DesignSystem | null) ?? null
export const projectGenerator = (p: Project, generator?: GeneratorSnapshot | null) => (projectData(p, generator)['d5wt:current'] as GeneratorSnapshot | null) ?? null

function saveList(list: Project[]) {
  write(PROJECTS_KEY, list)
}

export function updateProject(id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) {
  saveList(getProjectList().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)))
}

/** Copy the live working keys into the active project (e.g. before a backup or handoff). */
export function syncActive(generator?: GeneratorSnapshot | null) {
  const id = getActiveProjectId()
  if (!id) return
  saveList(getProjectList().map((p) => (p.id === id ? { ...p, data: snapshotWorking(generator), updatedAt: Date.now() } : p)))
}

/**
 * Make `id` the active project. Saves the current working keys into the previously active project,
 * loads the target's copy and returns its generator snapshot (null = start fresh) for the caller to load.
 */
export function switchProject(id: string, currentGenerator?: GeneratorSnapshot | null): GeneratorSnapshot | null {
  const list = getProjectList()
  const target = list.find((p) => p.id === id)
  if (!target) throw new Error('Project not found')
  const prevId = getActiveProjectId()
  const now = Date.now()
  const updated = list.map((p) => (p.id === prevId && prevId !== id ? { ...p, data: snapshotWorking(currentGenerator), updatedAt: now } : p))
  if (prevId !== id) WORKING_KEYS.forEach((k) => writeRaw(k, target.data[k] ?? null))
  saveList(updated)
  write(ACTIVE_PROJECT_KEY, id)
  return (target.data['d5wt:current'] as GeneratorSnapshot | null) ?? null
}

export function newProject(fields: Partial<Pick<Project, 'name' | 'client' | 'website' | 'notes' | 'status'>>, data: Record<string, unknown> = {}): Project {
  const now = Date.now()
  const p: Project = {
    id: uid(),
    name: fields.name?.trim() || 'Untitled project',
    client: fields.client ?? '',
    website: fields.website ?? '',
    notes: fields.notes ?? '',
    status: fields.status ?? 'draft',
    archived: false,
    createdAt: now,
    updatedAt: now,
    data,
  }
  saveList([...getProjectList(), p])
  return p
}

export function duplicateProject(id: string, generator?: GeneratorSnapshot | null): Project | null {
  const src = getProjectList().find((p) => p.id === id)
  if (!src) return null
  return newProject({ name: `${src.name} (copy)`, client: src.client, website: src.website, notes: src.notes, status: 'draft' }, structuredClone(projectData(src, generator)))
}

/** Delete a project. Its palettes and sessions are kept but no longer belong to a project. */
export function deleteProject(id: string) {
  if (id === getActiveProjectId()) throw new Error('Switch to another project before deleting this one.')
  saveList(getProjectList().filter((p) => p.id !== id))
  write(
    'd5wt:palettes',
    getPalettes().map((p) => (p.projectId === id ? { ...p, projectId: undefined } : p)),
  )
  write(
    'd5wt:sessions',
    getSessions().map((s) => (s.projectId === id ? { ...s, projectId: undefined } : s)),
  )
}

/**
 * First run with projects: put everything that exists today into "My first project"
 * (working keys, palettes and sessions), so nothing is lost.
 */
export function ensureProjects(): Project {
  const list = getProjectList()
  const active = list.find((p) => p.id === getActiveProjectId())
  if (active) return active
  if (list.length) {
    write(ACTIVE_PROJECT_KEY, list[0].id)
    WORKING_KEYS.forEach((k) => writeRaw(k, list[0].data[k] ?? null))
    return list[0]
  }
  const sys = readRaw('d5wt:system') as DesignSystem | null
  const p = newProject({ name: sys?.name && sys.name !== 'My design system' ? sys.name : 'My first project', status: 'progress' }, snapshotWorking())
  write(ACTIVE_PROJECT_KEY, p.id)
  write(
    'd5wt:palettes',
    getPalettes().map((x) => (x.projectId ? x : { ...x, projectId: p.id })),
  )
  write(
    'd5wt:sessions',
    getSessions().map((x) => (x.projectId ? x : { ...x, projectId: p.id })),
  )
  return p
}
