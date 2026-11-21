import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiHealth, authLogin, authLogout, authMe, ApiError, type User } from '../lib/api'
import { resetSyncState, syncOnce } from '../lib/sync'
import { freshSnapshot } from './palette'
import { useGenerator } from './GeneratorContext'

type Status = 'idle' | 'syncing' | 'error' | 'offline'
type Ctx = {
  /** null while checking; false when this host has no backend (e.g. GitHub Pages) */
  available: boolean | null
  ready: boolean
  user: User | null
  status: Status
  lastSync: number | null
  error: string
  syncNow: () => Promise<void>
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const SyncCtx = createContext<Ctx | null>(null)
const USER_KEY = 'd5wt:syncUser'
const INTERVAL = 45_000

export function SyncProvider({ children }: { children: ReactNode }) {
  const gen = useGenerator()
  const genRef = useRef(gen)
  genRef.current = gen
  const [available, setAvailable] = useState<boolean | null>(null)
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [error, setError] = useState('')
  const busy = useRef(false)

  const syncNow = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setStatus('syncing')
    try {
      const res = await syncOnce(genRef.current.snapshot())
      if (res.reloadActive !== undefined) genRef.current.loadSnapshot(res.reloadActive ?? freshSnapshot())
      setLastSync(Date.now())
      setStatus('idle')
      setError('')
    } catch (e) {
      const err = e as ApiError
      if (err.status === 401) setUser(null)
      setStatus(err.status === 0 ? 'offline' : 'error')
      setError(err.message)
    } finally {
      busy.current = false
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const { user: u } = await authMe()
    setUser(u)
  }, [])

  // Detect the backend and the signed-in user once.
  useEffect(() => {
    ;(async () => {
      const h = await apiHealth()
      setAvailable(!!h)
      setReady(!!h?.ready)
      if (h?.ready) {
        try {
          const { user: u } = await authMe()
          setUser(u)
        } catch {
          /* offline */
        }
      }
    })()
  }, [])

  // Sync on sign-in, every 45 s while visible, and when the tab regains focus.
  useEffect(() => {
    if (!user || user.mustChangePassword) return
    syncNow()
    const t = setInterval(() => document.visibilityState === 'visible' && syncNow(), INTERVAL)
    const onFocus = () => syncNow()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, syncNow])

  const login = async (email: string, password: string) => {
    const { user: u } = await authLogin(email, password)
    // a different account than last time on this browser: start the sync position from scratch
    if (localStorage.getItem(USER_KEY) !== String(u.id)) resetSyncState()
    localStorage.setItem(USER_KEY, String(u.id))
    setUser(u)
    return u
  }

  const logout = async () => {
    try {
      await authLogout()
    } finally {
      setUser(null)
      setStatus('idle')
    }
  }

  return (
    <SyncCtx.Provider value={{ available, ready, user, status, lastSync, error, syncNow, login, logout, refreshUser }}>{children}</SyncCtx.Provider>
  )
}

export function useSync() {
  const c = useContext(SyncCtx)
  if (!c) throw new Error('useSync must be used inside SyncProvider')
  return c
}
