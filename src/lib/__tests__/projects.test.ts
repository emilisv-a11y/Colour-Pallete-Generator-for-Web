import { beforeEach, describe, expect, it } from 'vitest'

// minimal in-memory localStorage for the node test environment
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

const { deleteProject, duplicateProject, ensureProjects, getActiveProjectId, getProjectList, newProject, projectSystem, switchProject } = await import('../projects')
const { getPalettes, getSessions, importBackup, makeBackup, savePalette } = await import('../storage')

beforeEach(() => store.clear())

describe('projects', () => {
  it('moves existing work into "My first project"', () => {
    store.set('d5wt:system', JSON.stringify({ name: 'Bakery', roles: {} }))
    store.set('d5wt:palettes', JSON.stringify([{ id: 'a', name: 'P', colors: ['#000000'], project: '', createdAt: 1, updatedAt: 1 }]))
    store.set('d5wt:sessions', JSON.stringify([{ id: 's', name: 'S', notes: '', createdAt: 1, updatedAt: 1, generator: {}, extra: {} }]))
    const p = ensureProjects()
    expect(p.name).toBe('Bakery')
    expect(getActiveProjectId()).toBe(p.id)
    expect(getPalettes()[0].projectId).toBe(p.id)
    expect(getSessions()[0].projectId).toBe(p.id)
    expect(ensureProjects().id).toBe(p.id) // idempotent
  })

  it('swaps working data when switching projects', () => {
    store.set('d5wt:system', JSON.stringify({ name: 'Client A' }))
    store.set('d5wt:diviSource', JSON.stringify({ context: 'et_builder' }))
    const a = ensureProjects()
    const b = newProject({ name: 'Client B' })
    const gen = switchProject(b.id)
    expect(gen).toBeNull()
    expect(store.has('d5wt:system')).toBe(false)
    expect(store.has('d5wt:diviSource')).toBe(false)
    store.set('d5wt:system', JSON.stringify({ name: 'Client B system' }))
    switchProject(a.id)
    expect(JSON.parse(store.get('d5wt:system')!).name).toBe('Client A')
    expect(projectSystem(getProjectList().find((p) => p.id === b.id)!)?.name).toBe('Client B system')
  })

  it('assigns new palettes to the active project', () => {
    const p = ensureProjects()
    savePalette({ name: 'New', project: '', colors: ['#ffffff'] })
    expect(getPalettes()[0].projectId).toBe(p.id)
  })

  it('duplicates and deletes safely', () => {
    store.set('d5wt:system', JSON.stringify({ name: 'Orig' }))
    const a = ensureProjects()
    const copy = duplicateProject(a.id)!
    expect(copy.name).toContain('(copy)')
    expect((copy.data['d5wt:system'] as { name: string }).name).toBe('Orig')
    expect(() => deleteProject(a.id)).toThrow()
    savePalette({ name: 'x', project: '', colors: ['#000000'], projectId: copy.id })
    deleteProject(copy.id)
    expect(getProjectList()).toHaveLength(1)
    expect(getPalettes()[0].projectId).toBeUndefined()
  })

  it('round-trips projects through a backup', () => {
    ensureProjects()
    newProject({ name: 'Second' })
    const json = JSON.stringify(makeBackup())
    store.clear()
    importBackup(json)
    expect(getProjectList().map((p) => p.name)).toContain('Second')
  })
})
