/* Client for the PHP API that lives next to the app (…/api/). On hosts without it
   (e.g. GitHub Pages) `apiHealth()` returns null and cloud features stay hidden. */

export type User = { id: number; email: string; name: string; role: 'owner' | 'member'; mustChangePassword: boolean }

export class ApiError extends Error {
  status: number
  data: Record<string, unknown>
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export const apiBase = () => new URL('api/', document.baseURI).toString()

export async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(apiBase() + path.replace(/^\//, ''), {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'd5wt', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'No connection to the server')
  }
  let data: Record<string, unknown> = {}
  try {
    data = await res.json()
  } catch {
    /* not JSON: probably no API on this host */
  }
  if (!res.ok) throw new ApiError(res.status, (data.error as string) || `Server error (${res.status})`, data)
  return data as T
}

export type Health = { ok: boolean; ready: boolean }

/** Is there a D5 WebTool API on this host? null = no backend here. */
export async function apiHealth(): Promise<Health | null> {
  try {
    const res = await fetch(apiBase() + 'health', { credentials: 'same-origin' })
    const data = await res.json().catch(() => null)
    if (data && data.app === 'd5-webtool') return { ok: true, ready: !!data.ready }
    if (data && data.setup) return { ok: true, ready: false }
    return null
  } catch {
    return null
  }
}

export const authMe = () => api<{ user: User | null }>('GET', 'auth/me')
export const authLogin = (email: string, password: string) => api<{ user: User }>('POST', 'auth/login', { email, password })
export const authLogout = () => api('POST', 'auth/logout')
export const authLogoutAll = () => api('POST', 'auth/logout-all')
export const authPassword = (current: string, password: string) => api('POST', 'auth/password', { current, password })

export type TeamUser = User & { createdAt: string; lastLogin: string | null }
export const usersList = () => api<{ users: TeamUser[] }>('GET', 'users')
export const usersCreate = (u: { email: string; name: string; password: string }) => api<{ users: TeamUser[] }>('POST', 'users', u)
export const usersDelete = (id: number) => api<{ users: TeamUser[] }>('DELETE', `users/${id}`)
export const usersReset = (id: number, password: string) => api('POST', `users/${id}/password`, { password })

/* ---------- reviews ---------- */

export type ReviewEvent = { id: number; kind: 'comment' | 'choice' | 'approve'; item: string; author: string; fromOwner: boolean; body: string | null; at: string }
export type Review = {
  id: number
  token: string
  projectId: string
  title: string
  lang: 'en' | 'lt'
  hasPin: boolean
  expiresAt: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  views: number
  lastViewed: string | null
  counts: { comment: number; choice: number; approve: number }
  approval: { author: string; at: string } | null
}

export const reviewsList = (projectId: string) => api<{ reviews: Review[] }>('GET', `reviews?project=${encodeURIComponent(projectId)}`)
export const reviewsCreate = (r: { projectId: string; title: string; lang: string; snapshot: unknown; pin?: string | null; expiresAt?: string | null }) => api<{ review: Review }>('POST', 'reviews', r)
export const reviewsUpdate = (id: number, patch: Partial<{ title: string; lang: string; snapshot: unknown; pin: string | null; expiresAt: string | null; active: boolean }>) =>
  api<{ review: Review }>('PATCH', `reviews/${id}`, patch)
export const reviewsDelete = (id: number) => api('DELETE', `reviews/${id}`)
export const reviewEvents = (id: number) => api<{ events: ReviewEvent[] }>('GET', `reviews/${id}/events`)
export const reviewReply = (id: number, item: string, body: string) => api<{ events: ReviewEvent[] }>('POST', `reviews/${id}/events`, { item, body })

export type PublicReview<S = unknown> = { title: string; lang: 'en' | 'lt'; snapshot: S; events: ReviewEvent[]; approval: { author: string; at: string } | null }
export const publicReview = <S,>(token: string, pin?: string) => api<PublicReview<S>>('GET', `r/${token}`, undefined, pin ? { 'X-Review-Pin': pin } : {})
export const publicPost = (token: string, ev: { kind: string; item: string; author: string; body?: string }, pin?: string) =>
  api<{ events: ReviewEvent[]; approval: PublicReview['approval'] }>('POST', `r/${token}/events`, ev, pin ? { 'X-Review-Pin': pin } : {})

export const reviewUrl = (token: string) => `${location.origin}${location.pathname}#/review/${token}`
