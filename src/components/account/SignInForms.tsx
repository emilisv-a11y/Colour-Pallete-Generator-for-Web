import { useState } from 'react'
import { useToast } from '../ui'
import { authPassword } from '../../lib/api'
import { useSync } from '../../state/SyncContext'

export function SignIn({ intro }: { intro?: string }) {
  const sync = useSync()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="account-card stack"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        try {
          await sync.login(email, password)
        } catch (err) {
          setError((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <h2 style={{ margin: 0 }}>Sign in</h2>
      <p className="muted small" style={{ margin: 0 }}>
        {intro ?? 'Signing in syncs your projects, palettes and sessions across computers and lets you create client review links. Everything still works offline.'}
      </p>
      {error && <div className="form-error">{error}</div>}
      <label className="field">
        <span className="field-label">Email</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field-label">Password</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

export function ChangePassword({ forced }: { forced?: boolean }) {
  const sync = useSync()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  return (
    <form
      className="account-card stack"
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        try {
          await authPassword(current, next)
          setCurrent('')
          setNext('')
          await sync.refreshUser()
          toast('Password changed. Other devices were signed out.')
        } catch (err) {
          setError((err as Error).message)
        }
      }}
    >
      <h2 style={{ margin: 0 }}>{forced ? 'Choose your own password' : 'Change password'}</h2>
      {forced && <p className="muted small" style={{ margin: 0 }}>You signed in with a temporary password. Choose your own to continue; syncing starts afterwards.</p>}
      {error && <div className="form-error">{error}</div>}
      <label className="field">
        <span className="field-label">{forced ? 'Temporary password' : 'Current password'}</span>
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field-label">New password (at least 10 characters)</span>
        <input type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required />
      </label>
      <button className="btn btn-primary" type="submit">
        Save password
      </button>
    </form>
  )
}
