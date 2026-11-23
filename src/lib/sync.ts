/* ============================================================================
   Cloud sync (local-first)
   Everything keeps working in the browser. When signed in, changed items are
   pushed and everything newer is pulled; per item the newest `updatedAt` wins.
   ========================================================================== */

import { api } from './api'
import { ACTIVE_PROJECT_KEY, getActiveProjectId, getProjectList, PROJECTS_KEY, syncActiveIfChanged, WORKING_KEYS, type Project } from './projects'
import { getPalettes, getSavedColors, getSessions, getTombstones, read, write, type GeneratorSnapshot, type SavedColor, type SavedPalette, type Session } from './storage'

const SEQ_KEY = 'd5wt:syncSeq'
const PUSHED_KEY = 'd5wt:syncPushedAt'

export type SyncItem = { kind: 'project' | 'palette' | 'session' | 'settings'; id: string; updatedAt: number; deleted?: boolean; data?: unknown }
type SyncResponse = { accepted: number; rejected: { kind: string; id: string; reason: string }[]; items: (SyncItem & { seq: number })[]; seq: number }

const colorsUpdated = () => Number(localStorage.getItem('d5wt:colorsUpdated') ?? 0)

/** Items changed locally since the last successful push. */
export function collectChanges(since: number): SyncItem[] {
  const out: SyncItem[] = []
  getProjectList().forEach((p) => p.updatedAt > since && out.push({ kind: 'project', id: p.id, updatedAt: p.updatedAt, data: p }))
  getPalettes().forEach((p) => p.updatedAt > since && out.push({ kind: 'palette', id: p.id, updatedAt: p.updatedAt, data: p }))
  getSessions().forEach((s) => s.updatedAt > since && out.push({ kind: 'session', id: s.id, updatedAt: s.updatedAt, data: s }))
  if (colorsUpdated() > since) out.push({ kind: 'settings', id: 'colors', updatedAt: colorsUpdated(), data: getSavedColors() })
  getTombstones().forEach((t) => t.at > since && out.push({ kind: t.kind, id: t.id, updatedAt: t.at, deleted: true }))
  return out
}

function writeRaw(key: string, value: unknown) {
  if (value === null || value === undefined) localStorage.removeItem(key)
  else localStorage.setItem(key, JSON.stringify(value))
}

/**
 * Apply items from the server. Returns the generator snapshot to load when the active
 * project was changed elsewhere (null = nothing to reload).
 */
export function applyRemote(items: SyncItem[]): { changed: number; reloadActive: GeneratorSnapshot | null | undefined } {
  let changed = 0
  let reloadActive: GeneratorSnapshot | null | undefined = undefined
  const activeId = getActiveProjectId()
  let projects = getProjectList()
  let palettes = getPalettes()
  let sessions = getSessions()
  let projectsDirty = false,
    palettesDirty = false,
    sessionsDirty = false

  for (const it of items) {
    if (it.kind === 'project') {
      const local = projects.find((p) => p.id === it.id)
      if (it.deleted) {
        if (local && it.id !== activeId && local.updatedAt <= it.updatedAt) {
          projects = projects.filter((p) => p.id !== it.id)
          projectsDirty = true
          changed++
        }
        continue
      }
      const remote = it.data as Project
      if (!remote || (local && local.updatedAt >= it.updatedAt)) continue
      projects = local ? projects.map((p) => (p.id === it.id ? remote : p)) : [...projects, remote]
      projectsDirty = true
      changed++
      if (it.id === activeId) {
        WORKING_KEYS.forEach((k) => writeRaw(k, remote.data?.[k] ?? null))
        reloadActive = (remote.data?.['d5wt:current'] as GeneratorSnapshot | null) ?? null
      }
    } else if (it.kind === 'palette') {
      const local = palettes.find((p) => p.id === it.id)
      if (local && local.updatedAt >= it.updatedAt) continue
      if (it.deleted) {
        if (local) {
          palettes = palettes.filter((p) => p.id !== it.id)
          palettesDirty = true
          changed++
        }
      } else if (it.data) {
        palettes = local ? palettes.map((p) => (p.id === it.id ? (it.data as SavedPalette) : p)) : [it.data as SavedPalette, ...palettes]
        palettesDirty = true
        changed++
      }
    } else if (it.kind === 'session') {
      const local = sessions.find((s) => s.id === it.id)
      if (local && local.updatedAt >= it.updatedAt) continue
      if (it.deleted) {
        if (local) {
          sessions = sessions.filter((s) => s.id !== it.id)
          sessionsDirty = true
          changed++
        }
      } else if (it.data) {
        sessions = local ? sessions.map((s) => (s.id === it.id ? (it.data as Session) : s)) : [it.data as Session, ...sessions]
        sessionsDirty = true
        changed++
      }
    } else if (it.kind === 'settings' && it.id === 'colors' && !it.deleted) {
      if (it.updatedAt > colorsUpdated()) {
        localStorage.setItem('d5wt:colorsUpdated', String(it.updatedAt))
        write('d5wt:colors', (it.data as SavedColor[]) ?? [])
        changed++
      }
    }
  }
  if (projectsDirty) write(PROJECTS_KEY, projects)
  if (palettesDirty) write('d5wt:palettes', palettes)
  if (sessionsDirty) write('d5wt:sessions', sessions)
  // a project may have arrived while none was active (fresh browser)
  if (!getActiveProjectId() && projects[0]) write(ACTIVE_PROJECT_KEY, projects[0].id)
  return { changed, reloadActive }
}

/**
 * A browser creates an empty "My first project" before anyone signs in. If that placeholder is still
 * untouched (no design system, palettes, sessions or Divi data) it is not worth uploading.
 */
export function isPlaceholder(p: Project): boolean {
  const d = p.data ?? {}
  return (
    p.name === 'My first project' &&
    !d['d5wt:system'] &&
    !d['d5wt:diviSource'] &&
    !getPalettes().some((x) => x.projectId === p.id) &&
    !getSessions().some((x) => x.projectId === p.id)
  )
}

/**
 * First sync of this account on this browser: pull before pushing, and if the account already has
 * projects, replace the untouched local placeholder with them.
 */
async function firstPull(): Promise<GeneratorSnapshot | null | undefined> {
  const res = await api<SyncResponse>('POST', 'sync', { since: 0, items: [] })
  const remoteProjects = res.items.filter((i) => i.kind === 'project' && !i.deleted)
  let reload: GeneratorSnapshot | null | undefined = undefined
  const activeId = getActiveProjectId()
  const local = getProjectList()
  const placeholder = local.find((p) => p.id === activeId)
  if (remoteProjects.length && placeholder && local.length === 1 && isPlaceholder(placeholder)) {
    write(PROJECTS_KEY, [])
    localStorage.removeItem(ACTIVE_PROJECT_KEY)
    const target = [...remoteProjects].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    write(PROJECTS_KEY, remoteProjects.map((i) => i.data as Project))
    write(ACTIVE_PROJECT_KEY, target.id)
    const data = (target.data as Project).data ?? {}
    WORKING_KEYS.forEach((k) => writeRaw(k, data[k] ?? null))
    reload = (data['d5wt:current'] as GeneratorSnapshot | null) ?? null
  }
  const applied = applyRemote(res.items)
  localStorage.setItem(SEQ_KEY, JSON.stringify(res.seq))
  return reload !== undefined ? reload : applied.reloadActive
}

/** One round trip: push local changes, pull remote ones. */
export async function syncOnce(generator?: GeneratorSnapshot | null, opts: { keepalive?: boolean } = {}) {
  let firstReload: GeneratorSnapshot | null | undefined = undefined
  if (read<number>(SEQ_KEY, 0) === 0 && read<number>(PUSHED_KEY, 0) === 0) firstReload = await firstPull()
  if (firstReload === undefined) syncActiveIfChanged(generator)
  const started = Date.now()
  const since = read<number>(PUSHED_KEY, 0)
  const items = collectChanges(since)
  const res = await api<SyncResponse>('POST', 'sync', { since: read<number>(SEQ_KEY, 0), items }, {}, opts)
  const applied = applyRemote(res.items)
  localStorage.setItem(SEQ_KEY, JSON.stringify(res.seq))
  localStorage.setItem(PUSHED_KEY, JSON.stringify(started))
  // tombstones that the server has now are no longer needed locally
  const left = getTombstones().filter((t) => t.at > started)
  localStorage.setItem('d5wt:tombstones', JSON.stringify(left))
  return { pushed: res.accepted, pulled: applied.changed, reloadActive: firstReload !== undefined ? firstReload : applied.reloadActive }
}

/** Forget sync position (e.g. after signing in to a different account). */
export function resetSyncState() {
  localStorage.removeItem(SEQ_KEY)
  localStorage.removeItem(PUSHED_KEY)
}
