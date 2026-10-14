import { useState } from 'react'
import { Icon, Seg } from '../components/ui.jsx'
import { byId, initials } from '../data.js'

// Sign-in screen. Production sign-in is company SSO, which this prototype
// doesn't connect to; "Dev Login" signs in as a sample user for a chosen role.
const DEV_USERS = { lead: byId.a1, analyst: byId.a2 }

export default function SignIn({ onSignIn, signedOut }) {
  const [role, setRole] = useState('lead')
  const [ssoNote, setSsoNote] = useState(false)
  const user = DEV_USERS[role]
  return (
    <div className="signin">
      <main className="signin-main">
        <div className="signin-brand">
          <div className="brand-mark">SC</div>
          <div>
            <div className="brand-name">scope</div>
            <div className="brand-sub">Solution Center Hub</div>
          </div>
        </div>
        <div className="card signin-card">
          <div className="stack" style={{ gap: 4 }}>
            <h1>Sign in</h1>
            <p className="ink2">Use your company account to continue.</p>
          </div>

          {signedOut && (
            <div className="callout"><Icon name="check" size={16} /><span>You're signed out. Your open tickets stay assigned, and fair-share skips you until you're back online.</span></div>
          )}

          <button className="btn primary signin-sso" onClick={() => setSsoNote(true)}><Icon name="shield" size={16} />Continue with SSO</button>
          {ssoNote && (
            <div className="callout warn" role="status"><Icon name="alert" size={16} /><span>SSO isn't connected in this prototype yet. Use Dev Login below.</span></div>
          )}

          <div className="signin-or"><span>or</span></div>

          <section className="signin-dev" aria-labelledby="dev-login-h">
            <div className="row">
              <b id="dev-login-h">Dev Login</b>
              <span className="spacer" />
              <span className="dash-chip">Prototype only</span>
            </div>
            <span className="small muted">Signs in as a sample user. No credentials needed. Remove before release.</span>
            <Seg value={role} onChange={setRole} options={[{ id: 'lead', label: 'Team lead' }, { id: 'analyst', label: 'Analyst' }]} />
            <div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
              <span className="avatar">{initials(user.name)}</span>
              <div className="stack" style={{ gap: 0, minWidth: 0 }}>
                <b>{user.name}</b>
                <span className="small muted"><span className="mono">{user.soeid}</span> · {user.role}</span>
              </div>
            </div>
            <button className="btn signin-devbtn" data-dev-login onClick={() => onSignIn(role)}><Icon name="code" size={15} />Dev Login as {user.name.split(' ')[0]}</button>
          </section>
        </div>
        <span className="small muted">Internal tool · authorised users only</span>
      </main>
    </div>
  )
}
