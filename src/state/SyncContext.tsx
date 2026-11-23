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
  /** true once the backend check and the signed-in user check have finished */
  checked: boolean
  user: User | null
  status: Status
  lastSync: number | null
  error: string
  syncNow: (opts?: { keepalive?: boolean }) => Promise<void>
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const SyncCtx = createContext<Ctx | null>(null)
const USER_KEY = 'd5wt:syncUser'
/** Last signed-in user, so the app still opens offline on a browser that was signed in. */
const CACHED_KEY = 'd5wt:syncUserCache'

function cachedUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(CACHED_KEY) ?? 'null')
  } catch {
    return null
  }
}
function cacheUser(u: User | null) {
  if (u) localStorage.setItem(CACHED_KEY, JSON.stringify(u))
  else localStorage.removeItem(CACHED_KEY)
}
const INTERVAL = 45_000

export function SyncProvider({ children }: { children: ReactNode }) {
  const gen = useGenerator()
  const genRef = useRef(gen)
  genRef.current = gen
  const [available, setAvailable] = useState<boolean | null>(null)
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [user, setUserState] = useState<User | null>(null)
  const setUser = useCallback((u: User | null) => {
    setUserState(u)
    cacheUser(u)
  }, [])
  const [status, setStatus] = useState<Status>('idle')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const again = useRef(false)

  const syncNow = useCallback(async (opts: { keepalive?: boolean } = {}): Promise<void> => {
    // a sync asked for while one is running (e.g. leaving the tab) runs straight after it, so late changes go too
    if (busy.current) {
      again.current = true
      return
    }
    busy.current = true
    setStatus('syncing')
    try {
      do {
        again.current = false
        try {
          const res = await syncOnce(genRef.current.snapshot(), opts)
          if (res.reloadActive !== undefined) genRef.current.loadSnapshot(res.reloadActive ?? freshSnapshot())
          setLastSync(Date.now())
          setStatus('idle')
          setError('')
        } catch (e) {
          const err = e as ApiError
          if (err.status === 401) setUser(null)
          setStatus(err.status === 0 ? 'offline' : 'error')
          setError(err.message)
          break
        }
      } while (again.current)
    } finally {
      busy.current = false
      again.current = false
    }
  }, [setUser])

  const refreshUser = useCallback(async () => {
    const { user: u } = await authMe()
    setUser(u)
  }, [setUser])

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
        } catch (e) {
          // offline: keep working as the last signed-in user; a real "signed out" answer clears it
          if ((e as ApiError).status === 401) setUser(null)
          else setUserState(cachedUser())
        }
      } else if (!h) {
        // no server reachable: on the own domain while offline, keep the cached user
        setUserState(cachedUser())
      }
      setChecked(true)
    })()
  }, [setUser])

  // Sync on sign-in, every 45 s while visible, when the tab regains focus, and straight away when the
  // user leaves the tab (switches tab or app, minimises or closes it), so teammates get the latest changes.
  useEffect(() => {
    if (!user || user.mustChangePassword) return
    syncNow()
    const t = setInterval(() => document.visibilityState === 'visible' && syncNow(), INTERVAL)
    const onFocus = () => syncNow()
    const onHide = () => document.visibilityState === 'hidden' && syncNow({ keepalive: true })
    const onPageHide = () => syncNow({ keepalive: true })
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
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
    <SyncCtx.Provider value={{ available, ready, checked, user, status, lastSync, error, syncNow, login, logout, refreshUser }}>{children}</SyncCtx.Provider>
  )
}

export function useSync() {
  const c = useContext(SyncCtx)
  if (!c) throw new Error('useSync must be used inside SyncProvider')
  return c
}
