import { useState } from 'react'
import { Icon, Seg } from '../components/ui.jsx'
import { byId, initials } from '../data.js'
import { WORKSPACES } from '../workspaces.js'
import { useStore } from '../store.jsx'

// Sign-in screen. Production sign-in is company SSO, which this prototype
// doesn't connect to; "Dev Login" signs in as a sample user for a chosen role.
const DEV_USERS = { lead: byId.a1, analyst: byId.a2 }

export default function SignIn({ ws, onSignIn, signedOut, onChangeWs }) {
  const [role, setRole] = useState('lead')
  const [ssoNote, setSsoNote] = useState(false)
  const user = DEV_USERS[role]
  return (
    <div className="signin">
      <main className="signin-main">
        <div className="signin-brand">
          <div className={`brand-mark ws-${ws.tone}`}>{ws.short}</div>
          <div>
            <div className="brand-name">scope</div>
            <div className="brand-sub">{ws.name}{ws.home ? ' Hub' : ''}</div>
          </div>
        </div>
        <div className="card signin-card">
          <div className="ws-chosen">
            <span className={`ws-mark ${ws.tone}`}>{ws.short}</span>
            <span className="stack" style={{ gap: 0, minWidth: 0 }}>
              <span className="small muted">Workspace</span>
              <b>{ws.name}</b>
            </span>
            <span className="spacer" />
            <button className="btn ghost sm" onClick={onChangeWs}>Change</button>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <h1>Sign in</h1>
            <p className="ink2">Use your company account to open {ws.name}.</p>
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

// First screen: pick the team workspace, then sign in to it. Each one is the same app,
// configured with that team's queues, roster, codes and knowledge base.
export function WorkspacePicker({ onPick }) {
  const { state } = useStore()
  const [newNote, setNewNote] = useState(false)
  return (
    <div className="signin">
      <main className="signin-main ws-main">
        <div className="signin-brand">
          <div className="brand-mark">SC</div>
          <div>
            <div className="brand-name">scope</div>
            <div className="brand-sub">Operations hub for resolver teams</div>
          </div>
        </div>
        <div className="ws-head">
          <h1>Choose a workspace</h1>
          <p>Pick your team, then sign in. Each team gets the same queue, explorer, reports, knowledge base and Copilot, set up for its own work.</p>
        </div>
        <div className="ws-grid">
          {WORKSPACES.map((w) => (
            <button key={w.id} className="ws-card" data-ws={w.id} onClick={() => onPick(w.id)}>
              <span className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                <span className={`ws-mark ${w.tone}`}>{w.short}</span>
                <span className="stack" style={{ gap: 0, minWidth: 0 }}>
                  <b className="ws-name">{w.name}</b>
                  <span className="small muted">{w.groups.length} assignment group{w.groups.length > 1 ? 's' : ''}</span>
                </span>
                <span className="spacer" />
                <Icon name="arrowR" size={16} />
              </span>
              <span className="small ink2 ws-desc">{w.desc}</span>
              <span className="ws-stats">
                <span><b className="num">{w.home ? state.tickets.length : w.open}</b> open</span>
                <span><b className="num">{w.members}</b> people</span>
                <span><b className="num">{w.kbPages}</b> KB pages</span>
              </span>
              <span className="ws-groups">
                {w.groups.map((g) => <span key={g} className="dash-chip">{g}</span>)}
              </span>
              <span className="small muted">Codes: <span className="mono">{w.codes.join(' · ')}</span></span>
            </button>
          ))}
          <button className="ws-card ws-new" onClick={() => setNewNote(!newNote)} aria-expanded={newNote}>
            <span className="row" style={{ gap: 10 }}>
              <span className="ws-mark"><Icon name="plus" size={16} /></span>
              <b className="ws-name">New workspace</b>
            </span>
            {newNote ? (
              <span className="small ink2 ws-desc">A platform admin sets up a team in four steps, with no code changes:
                <ol>
                  <li>Link its ServiceNow assignment groups</li>
                  <li>Add the roster and shift pattern</li>
                  <li>Choose a resolution code prefix</li>
                  <li>Create or link a knowledge base</li>
                </ol>
              </span>
            ) : (
              <span className="small muted ws-desc">Onboard another resolver team, such as Network, Cloud or Identity.</span>
            )}
          </button>
        </div>
        <span className="small ws-foot">Internal tool · authorised users only</span>
      </main>
    </div>
  )
}
