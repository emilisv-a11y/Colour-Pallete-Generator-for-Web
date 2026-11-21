import { useCallback, useSyncExternalStore } from 'react'
import type { FormatId, VisionId } from './color'
import type { ModeId } from './generate'

/* All persistence lives in localStorage for now. The shapes below are deliberately
   plain JSON so they can later be synced to a backend without migration pain. */

export type Swatch = { id: string; hex: string; locked: boolean }

export type SavedPalette = {
  id: string
  name: string
  colors: string[]
  project: string
  createdAt: number
  updatedAt: number
}

export type GeneratorSnapshot = {
  present: Swatch[]
  past: Swatch[][]
  future: Swatch[][]
  mode: ModeId
  format: FormatId
  vision: VisionId
}

export type Session = {
  id: string
  name: string
  notes: string
  createdAt: number
  updatedAt: number
  generator: GeneratorSnapshot
  /** Free-form slot for later phases (contrast checker pairs, roles, Divi settings...). */
  extra: Record<string, unknown>
}

export type Backup = {
  app: 'd5-webtool'
  version: 1
  exportedAt: string
  palettes: SavedPalette[]
  sessions: Session[]
}

const KEYS = {
  palettes: 'd5wt:palettes',
  sessions: 'd5wt:sessions',
  current: 'd5wt:current',
  activeSession: 'd5wt:activeSession',
  contrast: 'd5wt:contrast',
  theme: 'd5wt:theme',
} as const

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Could not save to localStorage', e)
  }
  emit()
}

/* ---------- tiny subscription so pages re-render when storage changes ---------- */
const listeners = new Set<() => void>()
let version = 0
function emit() {
  version++
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = () => emit()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}
/** Re-render the calling component whenever saved data changes (also across tabs). */
export function useStorageVersion() {
  return useSyncExternalStore(
    subscribe,
    useCallback(() => version, []),
  )
}

/* ---------- palettes ---------- */
export const getPalettes = () => read<SavedPalette[]>(KEYS.palettes, [])

export function savePalette(p: Omit<SavedPalette, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const list = getPalettes()
  const now = Date.now()
  const existing = p.id ? list.find((x) => x.id === p.id) : undefined
  if (existing) {
    Object.assign(existing, p, { updatedAt: now })
  } else {
    list.unshift({ ...p, id: p.id ?? uid(), createdAt: now, updatedAt: now })
  }
  write(KEYS.palettes, list)
}

export function deletePalette(id: string) {
  write(
    KEYS.palettes,
    getPalettes().filter((p) => p.id !== id),
  )
}

export const getProjects = () => [...new Set(getPalettes().map((p) => p.project).filter(Boolean))].sort()

/* ---------- sessions ---------- */
export const getSessions = () => read<Session[]>(KEYS.sessions, [])

export function saveSession(s: Omit<Session, 'createdAt' | 'updatedAt' | 'id'> & { id?: string }, opts: { activate?: boolean } = {}): Session {
  const list = getSessions()
  const now = Date.now()
  const idx = s.id ? list.findIndex((x) => x.id === s.id) : -1
  let saved: Session
  if (idx >= 0) {
    saved = { ...list[idx], ...s, id: list[idx].id, updatedAt: now }
    list[idx] = saved
  } else {
    saved = { ...s, id: s.id ?? uid(), createdAt: now, updatedAt: now }
    list.unshift(saved)
  }
  write(KEYS.sessions, list)
  if (opts.activate ?? true) setActiveSessionId(saved.id)
  return saved
}

export function deleteSession(id: string) {
  write(
    KEYS.sessions,
    getSessions().filter((s) => s.id !== id),
  )
  if (getActiveSessionId() === id) setActiveSessionId(null)
}

export const getActiveSessionId = () => read<string | null>(KEYS.activeSession, null)
export const setActiveSessionId = (id: string | null) => write(KEYS.activeSession, id)

/* ---------- autosaved working state ---------- */
export const getCurrent = () => read<GeneratorSnapshot | null>(KEYS.current, null)
export function setCurrent(s: GeneratorSnapshot) {
  try {
    localStorage.setItem(KEYS.current, JSON.stringify(s))
  } catch {
    /* ignore quota errors for autosave */
  }
}

/* ---------- contrast checker ---------- */
export const getContrastPair = () => read<{ fg: string; bg: string }>(KEYS.contrast, { fg: '#1d2433', bg: '#f4f1ea' })
export const setContrastPair = (p: { fg: string; bg: string }) => {
  try {
    localStorage.setItem(KEYS.contrast, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

/* ---------- theme ---------- */
export type ThemePref = 'system' | 'light' | 'dark'
export const getTheme = () => read<ThemePref>(KEYS.theme, 'system')
export const setTheme = (t: ThemePref) => write(KEYS.theme, t)

/* ---------- backup ---------- */
export function makeBackup(): Backup {
  return { app: 'd5-webtool', version: 1, exportedAt: new Date().toISOString(), palettes: getPalettes(), sessions: getSessions() }
}

/** Merge a backup into existing data. Items with the same id are replaced. Returns counts. */
export function importBackup(json: string): { palettes: number; sessions: number } {
  const data = JSON.parse(json) as Partial<Backup>
  if (data.app !== 'd5-webtool' || !Array.isArray(data.palettes) || !Array.isArray(data.sessions)) {
    throw new Error('This file is not a D5 WebTool backup.')
  }
  const merge = <T extends { id: string }>(cur: T[], inc: T[]) => {
    const map = new Map(cur.map((x) => [x.id, x]))
    inc.forEach((x) => map.set(x.id, x))
    return [...map.values()]
  }
  write(KEYS.palettes, merge(getPalettes(), data.palettes))
  write(KEYS.sessions, merge(getSessions(), data.sessions))
  return { palettes: data.palettes.length, sessions: data.sessions.length }
}

/** Export a single session as its own file. */
export function sessionFile(s: Session): Backup {
  return { app: 'd5-webtool', version: 1, exportedAt: new Date().toISOString(), palettes: [], sessions: [s] }
}
