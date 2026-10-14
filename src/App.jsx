import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { buildNotifications, currentUser, useStore } from './store.jsx'
import { Icon, Toasts } from './components/ui.jsx'
import DevTools from './components/DevTools.jsx'
import Tour from './components/Tour.jsx'
import { fmtTime, initials, slaInfo } from './data.js'
import Home from './pages/Home.jsx'
import Explorer from './pages/Explorer.jsx'
import Reports from './pages/Reports.jsx'
import Team from './pages/Team.jsx'
import Settings from './pages/Settings.jsx'
import SignIn from './pages/SignIn.jsx'

// Account profile is reached from the profile menu at the bottom of the sidebar.
const PAGES = [
  { id: 'home', label: 'Home', icon: 'home', title: 'Queue command', desc: 'Live incident queue, SLA health, staffing and your prioritised work.' },
  { id: 'explorer', label: 'Ticket Explorer', icon: 'search', title: 'Ticket Explorer', desc: 'How every incident was solved: resolution journeys, codes and handover history.' },
  { id: 'reports', label: 'Reports', icon: 'chart', title: 'Reports', desc: 'Performance, quality and coaching, plus self-serve questions answered in your browser.' },
  { id: 'team', label: 'Team Management', icon: 'team', title: 'Team Management', desc: 'Roster, access, shift coverage, attendance and your password vault.' },
  { id: 'settings', label: 'Account profile', icon: 'user', title: 'Account profile', desc: 'Your profile, access, attendance history, shifts and leave.' },
]

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

// The signed-in role is remembered per browser so a reload doesn't sign you out.
const SESSION_KEY = 'scope-session'
const readSession = () => { try { return localStorage.getItem(SESSION_KEY) } catch { return null } }
const writeSession = (role) => { try { role ? localStorage.setItem(SESSION_KEY, role) : localStorage.removeItem(SESSION_KEY) } catch { /* storage blocked */ } }

export default function App() {
  const { state, dispatch } = useStore()
  const [route, setRoute] = useState(() => {
    const h = location.hash.replace('#', '')
    return { page: PAGES.some((p) => p.id === h) ? h : 'home' }
  })
  const nav = (page, opts = {}) => {
    setRoute({ page, ...opts, key: Date.now() })
    try { history.replaceState(null, '', '#' + page) } catch { /* sandboxed frame */ }
    window.scrollTo(0, 0)
  }
  const [session, setSession] = useState(readSession)
  const [signedOut, setSignedOut] = useState(false)
  useEffect(() => { if (session && session !== state.role) dispatch({ type: 'role', role: session }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the session in step when the Dev panel switches role.
  useEffect(() => { if (session && session !== state.role) { setSession(state.role); writeSession(state.role) } }, [state.role]) // eslint-disable-line react-hooks/exhaustive-deps
  const signIn = (role) => { dispatch({ type: 'role', role }); writeSession(role); setSession(role); setSignedOut(false); nav('home') }
  const signOut = () => { writeSession(null); setSession(null); setSignedOut(true) }
  const page = PAGES.find((p) => p.id === route.page)
  if (!session) return <SignIn onSignIn={signIn} signedOut={signedOut} />
  const breached = state.tickets.filter((t) => slaInfo(t, state.now).status === 'Breached').length

  return (
    <NavCtx.Provider value={{ route, nav }}>
      <div className="app">
        <nav className="rail" aria-label="Main" data-tour="rail">
          <div className="brand">
            <div className="brand-mark">SC</div>
            <div>
              <div className="brand-name">scope</div>
              <div className="brand-sub">Solution Center Hub</div>
            </div>
          </div>
          {[['General', ['home', 'explorer', 'reports']], ['Tools', ['team']]].map(([group, ids]) => (
            <div key={group} style={{ display: 'contents' }}>
              <div className="rail-group">{group}</div>
              {PAGES.filter((p) => ids.includes(p.id)).map((p) => (
                <button key={p.id} className="nav-btn" aria-current={route.page === p.id ? 'page' : undefined} onClick={() => nav(p.id)}>
                  <Icon name={p.icon} />
                  {p.label}
                  {p.id === 'home' && breached > 0 && <span className="nav-count" title="Tickets past SLA">{breached}</span>}
                </button>
              ))}
            </div>
          ))}
          <div className="rail-foot" />
          <ProfileMenu active={route.page === 'settings'} onSettings={() => nav('settings')} onLogout={signOut} />
        </nav>
        <div className="main">
          <Header page={page} />
          <main className="page" key={route.page}>
            <div className="page-head">
              <h1>{page.title}</h1>
              <p>{page.desc}</p>
            </div>
            {route.page === 'home' && <Home route={route} />}
            {route.page === 'explorer' && <Explorer route={route} />}
            {route.page === 'reports' && <Reports route={route} />}
            {route.page === 'team' && <Team route={route} />}
            {route.page === 'settings' && <Settings />}
          </main>
        </div>
      </div>
      <Toasts />
      <DevTools />
      {state.tour && <Tour />}
    </NavCtx.Provider>
  )
}

function useOutside(open, setOpen) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, setOpen])
  return ref
}

function Header({ page }) {
  const { state } = useStore()
  const now = new Date(state.now)
  return (
    <header className="header">
      <nav className="crumb" aria-label="Breadcrumb"><span className="crumb-back" aria-hidden="true"><Icon name={page.icon} size={16} /></span><span>Scope</span><Icon name="arrowR" size={14} /><b>{page.label}</b></nav>
      <div className="header-center"><SnowStatus /></div>
      <div className="header-right">
      <div className="date-chip" title="Local time">
        <b>{now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</b>
        <span className="muted small">{fmtTime(state.now)} · Week {isoWeek(now)}</span>
      </div>
      <ThemeToggle />
      <Notifications />
      </div>
    </header>
  )
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t - y0) / 864e5 + 1) / 7)
}

function SnowStatus() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, setOpen)
  const ago = Math.max(0, Math.round((Date.now() - state.snow.lastSync) / 1000))
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force((x) => x + 1), 5000); return () => clearInterval(t) }, [])
  const open_ = state.tickets.length
  const p1 = state.tickets.filter((t) => t.priority === 'P1').length
  const unassigned = state.tickets.filter((t) => !t.assignedTo).length
  return (
    <div className="pop-anchor" ref={ref} data-tour="snow">
      <button className="snow-pill" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="snow-ic"><Icon name="refresh" size={15} /></span>
        <b>ServiceNow</b>
        <span className="row tight muted"><span className="dot live" />Live · {ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`} ago</span>
        <span className="muted small">In:</span>
        <span className="dash-chip">{open_} open</span>
        <span className="dash-chip">P1 {p1}</span>
        <span className="dash-chip">{unassigned} waiting</span>
      </button>
      {open && (
        <div className="popover popover-center" style={{ width: 320 }}>
          <div className="card-h"><h3>ServiceNow sync</h3><span className="spacer" /><span className="pill good">Healthy</span></div>
          <div className="card-b stack">
            {[
              ['Instance', 'corp.service-now.com (simulated)'],
              ['Last sync', `${fmtTime(state.snow.lastSync)} · every 30s`],
              ['API latency', `${state.snow.latencyMs} ms`],
              ['Open incidents in queue', open_],
              ['P1 open', p1],
              ['Waiting for an analyst', unassigned],
              ['Pulled in the last hour', state.snow.intakeLastHour],
            ].map(([k, v]) => (
              <div key={k} className="row" style={{ justifyContent: 'space-between' }}><span className="muted">{k}</span><b className="num">{v}</b></div>
            ))}
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn sm" onClick={() => dispatch({ type: 'sync' })}><Icon name="refresh" size={14} />Sync now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const NOTIF_ICON = { sla: 'clock', approval: 'bolt', handover: 'clip', leave: 'cal', coverage: 'team', info: 'book', password: 'key', p1: 'alert', assign: 'user' }

function Notifications() {
  const { state, dispatch } = useStore()
  const { nav } = useNav()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('action')
  const ref = useOutside(open, setOpen)
  const all = buildNotifications(state)
  const unread = all.filter((n) => !state.read[n.id])
  const list = all.filter((n) => n.group === tab)
  return (
    <div className="pop-anchor" ref={ref} data-tour="notif">
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Notifications, ${unread.length} unread`} aria-expanded={open}>
        <Icon name="bell" />
        {unread.length > 0 && <span className="badge">{unread.length > 99 ? '99+' : unread.length}</span>}
      </button>
      {open && (
        <div className="popover">
          <div className="card-h" style={{ paddingBottom: 6 }}>
            <h3>Notifications</h3>
            <span className="spacer" />
            <button className="btn ghost sm" onClick={() => dispatch({ type: 'readAll', ids: all.map((n) => n.id) })}>Mark all read</button>
          </div>
          <div style={{ padding: '0 8px' }}>
            <div className="tabs">
              {[['action', 'Needs action'], ['update', 'Updates']].map(([id, l]) => (
                <button key={id} className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                  {l}<span className="ct">{all.filter((n) => n.group === id && !state.read[n.id]).length}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {list.length === 0 && <div className="empty">Nothing here. You're caught up.</div>}
            {list.map((n) => (
              <button key={n.id} className={`notif ${state.read[n.id] ? '' : 'unread'}`} onClick={() => {
                dispatch({ type: 'read', id: n.id })
                setOpen(false)
                nav(n.page, { tab: n.tab, ticket: n.ticket, approval: n.approval })
              }}>
                <span className={`notif-ic ${n.tone}`}><Icon name={NOTIF_ICON[n.kind] || 'bell'} size={15} /></span>
                <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                  <b style={{ fontSize: 13 }}>{n.title}</b>
                  {n.sub && <span className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.sub}</span>}
                  <span className="muted small">{fmtTime(n.at)}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="muted small" style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}>
            {state.role === 'lead' ? 'Team lead view: SLA risk across the whole queue, fix approvals, handovers, leave and coverage.' : 'Analyst view: your SLA risk, new assignments, fix decisions and password reminders.'}
          </div>
        </div>
      )}
    </div>
  )
}

function readTheme() {
  try { return (localStorage.getItem('scope-theme') || localStorage.getItem('serviceops-theme')) || 'light' } catch { return 'light' }
}

function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme)
  useEffect(() => {
    document.documentElement.setAttribute('data-app-theme', theme)
    try { localStorage.setItem('scope-theme', theme) } catch { /* storage blocked */ }
  }, [theme])
  const dark = theme === 'dark'
  return (
    <button className="icon-btn theme-btn" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
    </button>
  )
}

function ProfileMenu({ active, onSettings, onLogout }) {
  const { state } = useStore()
  const me = currentUser(state)
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, setOpen)
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  return (
    <div className="profile-wrap" ref={ref} data-tour="profile">
      {open && (
        <div className="profile-menu" role="menu" aria-label="Account">
          <div className="profile-menu-head">
            <span className="avatar">{initials(me.name)}</span>
            <div className="stack" style={{ gap: 0, minWidth: 0 }}>
              <b className="small">{me.name}</b>
              <span className="muted small mono">{me.soeid} · {me.role}</span>
            </div>
          </div>
          <button role="menuitem" className="menu-item" onClick={() => { setOpen(false); onSettings() }}><Icon name="user" size={16} />Account profile</button>
          <button role="menuitem" className="menu-item danger" onClick={() => { setOpen(false); onLogout() }}><Icon name="logout" size={16} />Log out</button>
        </div>
      )}
      <button className={`profile-btn ${active ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <span className="avatar sm">{initials(me.name)}</span>
        <span className="profile-text">
          <b>{me.name}</b>
          <span>{me.role}</span>
        </span>
        <Icon name={open ? 'chevDown' : 'chevUp'} size={15} />
      </button>
    </div>
  )
}

