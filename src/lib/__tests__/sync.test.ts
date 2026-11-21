import { beforeEach, describe, expect, it } from 'vitest'

const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
} as Storage

const { ensureProjects, getProjectList, newProject, deleteProject, syncActiveIfChanged } = await import('../projects')
const { savePalette, getPalettes, deletePalette, toggleSavedColor } = await import('../storage')
const { applyRemote, collectChanges } = await import('../sync')

beforeEach(() => store.clear())

describe('sync', () => {
  it('collects only changes since the last push, including deletions and saved colours', () => {
    const t0 = Date.now() - 1
    ensureProjects()
    savePalette({ name: 'A', project: '', colors: ['#000000'] })
    toggleSavedColor('#ff0000')
    const kinds = collectChanges(t0).map((c) => c.kind).sort()
    expect(kinds).toEqual(['palette', 'project', 'settings'])
    const id = getPalettes()[0].id
    deletePalette(id)
    expect(collectChanges(t0).some((c) => c.kind === 'palette' && c.id === id && c.deleted)).toBe(true)
    expect(collectChanges(Date.now() + 1000)).toHaveLength(0)
  })

  it('applies newer remote items and ignores older ones', () => {
    ensureProjects()
    savePalette({ name: 'Local', project: '', colors: ['#000000'] })
    const p = getPalettes()[0]
    applyRemote([{ kind: 'palette', id: p.id, updatedAt: p.updatedAt - 10, data: { ...p, name: 'Old remote' } }])
    expect(getPalettes()[0].name).toBe('Local')
    applyRemote([{ kind: 'palette', id: p.id, updatedAt: p.updatedAt + 10, data: { ...p, name: 'New remote', updatedAt: p.updatedAt + 10 } }])
    expect(getPalettes()[0].name).toBe('New remote')
    applyRemote([{ kind: 'palette', id: p.id, updatedAt: p.updatedAt + 20, deleted: true }])
    expect(getPalettes()).toHaveLength(0)
  })

  it('reloads the active project when it changed on another device', () => {
    store.set('d5wt:system', JSON.stringify({ name: 'Mine' }))
    const a = ensureProjects()
    const remote = { ...getProjectList()[0], updatedAt: a.updatedAt + 1000, data: { 'd5wt:system': { name: 'Teammate edit' }, 'd5wt:current': null } }
    const res = applyRemote([{ kind: 'project', id: a.id, updatedAt: remote.updatedAt, data: remote }])
    expect(res.reloadActive).toBeNull() // no generator state in the remote copy: start fresh
    expect(JSON.parse(store.get('d5wt:system')!).name).toBe('Teammate edit')
  })

  it('does not delete the open project from under you', () => {
    const a = ensureProjects()
    applyRemote([{ kind: 'project', id: a.id, updatedAt: Date.now() + 5000, deleted: true }])
    expect(getProjectList()).toHaveLength(1)
    const b = newProject({ name: 'Other' })
    applyRemote([{ kind: 'project', id: b.id, updatedAt: Date.now() + 5000, deleted: true }])
    expect(getProjectList().map((p) => p.id)).toEqual([a.id])
  })

  it('only bumps the active project when its data really changed', () => {
    const a = ensureProjects()
    store.set('d5wt:system', JSON.stringify({ name: 'x' }))
    expect(syncActiveIfChanged()).toBe(true)
    const after = getProjectList().find((p) => p.id === a.id)!.updatedAt
    expect(syncActiveIfChanged()).toBe(false)
    expect(getProjectList().find((p) => p.id === a.id)!.updatedAt).toBe(after)
    void deleteProject
  })
})

describe('placeholder project', () => {
  it('recognises an untouched first project', async () => {
    const { isPlaceholder } = await import('../sync')
    store.clear()
    const p = ensureProjects()
    expect(isPlaceholder(getProjectList().find((x) => x.id === p.id)!)).toBe(true)
    savePalette({ name: 'x', project: '', colors: ['#000000'] })
    expect(isPlaceholder(getProjectList().find((x) => x.id === p.id)!)).toBe(false)
  })
})
