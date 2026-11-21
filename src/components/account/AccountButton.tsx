import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSync } from '../../state/SyncContext'
import { Icon } from '../Icon'
import { Popover } from '../ui'

export function timeAgo(ms: number | null) {
  if (!ms) return 'not yet'
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return new Date(ms).toLocaleTimeString()
}

/** Header control: sign-in link, or the signed-in user with sync status. Hidden on hosts without a backend. */
export function AccountButton() {
  const sync = useSync()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  if (!sync.available) return null
  if (!sync.user) {
    return (
      <button className="btn btn-small account-signin" onClick={() => navigate('/account')}>
        Sign in
      </button>
    )
  }
  const u = sync.user
  const icon = sync.status === 'syncing' ? '↻' : sync.status === 'error' || sync.status === 'offline' ? '!' : '✓'
  return (
    <div className="pop-anchor">
      <button className={`account-btn s-${sync.status}`} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={`Signed in as ${u.email} · synced ${timeAgo(sync.lastSync)}`}>
        <span className="avatar">{(u.name || u.email)[0].toUpperCase()}</span>
        <span className="sync-dot" aria-hidden="true">
          {icon}
        </span>
      </button>
      {open && (
        <Popover onClose={() => setOpen(false)} className="account-menu">
          <strong>{u.name || u.email}</strong>
          <span className="muted small">
            {u.email} · {u.role === 'owner' ? 'Owner' : 'Member'}
          </span>
          <span className={`small sync-line s-${sync.status}`}>
            {sync.status === 'syncing' ? 'Syncing…' : sync.status === 'error' ? `Sync problem: ${sync.error}` : sync.status === 'offline' ? 'Offline: changes are kept and sync later' : `Synced ${timeAgo(sync.lastSync)}`}
          </span>
          <div className="row wrap">
            <button className="btn btn-small" onClick={() => sync.syncNow()}>
              <Icon name="undo" size={14} /> Sync now
            </button>
            <button
              className="btn btn-small"
              onClick={() => {
                setOpen(false)
                navigate('/account')
              }}
            >
              Account &amp; team
            </button>
            <button
              className="btn btn-small"
              onClick={() => {
                setOpen(false)
                sync.logout()
              }}
            >
              Sign out
            </button>
          </div>
        </Popover>
      )}
    </div>
  )
}
