import type { ReactNode } from 'react'
import { useSync } from '../../state/SyncContext'
import { ChangePassword, SignIn } from './SignInForms'

function Brand() {
  return (
    <div className="brand login-brand">
      <span className="brand-mark" aria-hidden="true">
        <i /> <i /> <i />
      </span>
      <span className="brand-name">
        D5 <b>WebTool</b>
      </span>
    </div>
  )
}

/**
 * On a domain with the D5 WebTool server, the app opens only after signing in.
 * Without a server (GitHub Pages, or the server can't be reached) the app opens as before.
 */
export function LoginGate({ children }: { children: ReactNode }) {
  const sync = useSync()
  if (sync.available === false) return <>{children}</>
  if (!sync.checked) return <div className="login-screen" aria-busy="true" />
  if (!sync.ready)
    return (
      <div className="login-screen">
        <Brand />
        <div className="account-card login-card">
          The server is installed but not set up yet. Open <a href="api/setup.php">api/setup.php</a> to create the database tables and your owner account.
        </div>
      </div>
    )
  if (!sync.user)
    return (
      <div className="login-screen">
        <Brand />
        <SignIn intro="Sign in to open the tool. Ask the owner for an account if you don't have one." />
      </div>
    )
  if (sync.user.mustChangePassword)
    return (
      <div className="login-screen">
        <Brand />
        <ChangePassword forced />
        <button className="btn btn-small login-out" type="button" onClick={() => sync.logout()}>
          Sign out
        </button>
      </div>
    )
  return <>{children}</>
}
