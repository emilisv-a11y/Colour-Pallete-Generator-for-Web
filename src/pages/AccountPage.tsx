import { useEffect, useState } from 'react'
import { timeAgo } from '../components/account/AccountButton'
import { Icon } from '../components/Icon'
import { useCopy, useToast } from '../components/ui'
import { authLogoutAll, usersCreate, usersDelete, usersList, usersReset, type TeamUser } from '../lib/api'
import { useSync } from '../state/SyncContext'
import { ChangePassword, SignIn } from '../components/account/SignInForms'

function tempPassword() {
  const words = ['spalva', 'tonas', 'linija', 'forma', 'erdve', 'ritmas', 'kontrastas', 'atspalvis', 'sviesa', 'seselis']
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length]
  return `${pick()}-${pick()}-${(crypto.getRandomValues(new Uint32Array(1))[0] % 900) + 100}`
}

function Team() {
  const sync = useSync()
  const toast = useToast()
  const copy = useCopy()
  const [users, setUsers] = useState<TeamUser[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [error, setError] = useState('')
  const isOwner = sync.user?.role === 'owner'
  useEffect(() => {
    usersList().then((r) => setUsers(r.users)).catch((e) => setError(e.message))
  }, [])
  return (
    <section className="account-card stack">
      <h2 style={{ margin: 0 }}>Team</h2>
      <p className="muted small" style={{ margin: 0 }}>Everyone on the team shares the same projects. {isOwner ? 'Add teammates here; they choose their own password on first sign-in.' : 'Only the owner can add or remove people.'}</p>
      {error && <div className="form-error">{error}</div>}
      <ul className="team-list">
        {users.map((u) => (
          <li key={u.id}>
            <span className="avatar">{(u.name || u.email)[0].toUpperCase()}</span>
            <span className="grow">
              <strong>{u.name || u.email}</strong>
              <span className="muted small">
                {' '}
                {u.email} · {u.role === 'owner' ? 'Owner' : 'Member'} · last sign-in {u.lastLogin ? new Date(u.lastLogin.replace(' ', 'T')).toLocaleDateString() : 'never'}
                {u.mustChangePassword && ' · waiting for first sign-in'}
              </span>
            </span>
            {isOwner && u.role !== 'owner' && (
              <>
                <button
                  className="btn btn-small"
                  onClick={async () => {
                    const pw = tempPassword()
                    await usersReset(u.id, pw)
                    setCreated({ email: u.email, password: pw })
                    toast('New temporary password created')
                  }}
                >
                  Reset password
                </button>
                <button
                  className="icon-btn danger"
                  aria-label={`Remove ${u.email}`}
                  title="Remove from team"
                  onClick={async () => {
                    if (!confirm(`Remove ${u.email} from the team? Their work stays in the shared projects.`)) return
                    setUsers((await usersDelete(u.id)).users)
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {created && (
        <div className="callout stack">
          <strong>Send these sign-in details to {created.email}</strong>
          <code>
            {location.origin + location.pathname} · {created.email} · {created.password}
          </code>
          <div className="row">
            <button className="btn btn-small" onClick={() => copy(`D5 WebTool: ${location.origin + location.pathname}\nEmail: ${created.email}\nTemporary password: ${created.password}`, 'sign-in details')}>
              <Icon name="copy" size={14} /> Copy
            </button>
            <button className="btn btn-small" onClick={() => setCreated(null)}>
              Done
            </button>
          </div>
        </div>
      )}
      {isOwner && (
        <form
          className="row wrap"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            const password = tempPassword()
            try {
              setUsers((await usersCreate({ email, name, password })).users)
              setCreated({ email, password })
              setEmail('')
              setName('')
            } catch (err) {
              setError((err as Error).message)
            }
          }}
        >
          <input className="grow" type="email" placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Teammate email" />
          <input className="grow" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Teammate name" />
          <button className="btn btn-primary" type="submit">
            <Icon name="plus" size={16} /> Add teammate
          </button>
        </form>
      )}
    </section>
  )
}

export default function AccountPage() {
  const sync = useSync()
  const toast = useToast()
  if (sync.available === null) return <div className="page muted">Checking the server…</div>
  if (!sync.available) {
    return (
      <div className="page account-page">
        <h1>Account</h1>
        <div className="account-card">
          <p style={{ marginTop: 0 }}>
            Sign-in, sync between computers and client review links need the D5 WebTool server, which runs on your own domain (Hostinger). This copy of the app has no server,
            so everything is saved in this browser only.
          </p>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Open the app at your own domain to use cloud features. The setup steps are in the project README.
          </p>
        </div>
      </div>
    )
  }
  if (!sync.ready) {
    return (
      <div className="page account-page">
        <h1>Account</h1>
        <div className="account-card">
          The server is installed but not set up yet. Open <a href="api/setup.php">api/setup.php</a> to create the database tables and your owner account.
        </div>
      </div>
    )
  }
  return (
    <div className="page account-page">
      <h1>Account &amp; team</h1>
      {!sync.user ? (
        <SignIn />
      ) : sync.user.mustChangePassword ? (
        <ChangePassword forced />
      ) : (
        <>
          <section className="account-card stack">
            <div className="row space-between wrap">
              <div>
                <h2 style={{ margin: 0 }}>{sync.user.name || sync.user.email}</h2>
                <span className="muted small">
                  {sync.user.email} · {sync.user.role === 'owner' ? 'Owner' : 'Member'}
                </span>
              </div>
              <div className="row wrap">
                <button className="btn" onClick={() => sync.syncNow()}>
                  <Icon name="undo" size={16} /> Sync now
                </button>
                <button className="btn" onClick={() => sync.logout()}>
                  Sign out
                </button>
              </div>
            </div>
            <span className="small">
              {sync.status === 'error' ? `Sync problem: ${sync.error}` : sync.status === 'offline' ? 'Offline: your changes are kept and will sync later.' : `Last synced ${timeAgo(sync.lastSync)}. Syncs automatically while the app is open, and as soon as you leave the tab.`}
            </span>
            <p className="muted small" style={{ margin: 0 }}>
              If two people edit the same project at the same moment, the most recent save wins. Saved palettes and sessions sync one by one.
            </p>
          </section>
          <Team />
          <ChangePassword />
          <section className="account-card row wrap space-between">
            <span className="small">Lost a laptop or shared a computer? Sign out on every device at once.</span>
            <button
              className="btn"
              onClick={async () => {
                await authLogoutAll()
                await sync.refreshUser().catch(() => {})
                toast('Signed out everywhere')
              }}
            >
              Sign out everywhere
            </button>
          </section>
        </>
      )}
    </div>
  )
}
