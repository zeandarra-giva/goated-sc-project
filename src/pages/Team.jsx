import { useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { Icon, Kpi, Modal, Seg, Tabs, copyText } from '../components/ui.jsx'
import ShiftCalendar from './ShiftCalendar.jsx'
import { DAY, NOW, SHIFT_CODES, TEAM_VAULT_SUMMARY, byId, fmtDate, fmtDay, initials, locationOn, weekStart } from '../data.js'

export default function Team({ route }) {
  const { state } = useStore()
  const [tab, setTab] = useState(route.tab || 'roster')
  const expiring = state.vault.filter((v) => v.expiresAt != null && v.expiresAt - state.now <= v.reminderDays * DAY).length
  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'roster', label: 'Roster & access', icon: 'team', count: state.analysts.length },
        { id: 'schedule', label: 'Schedule & coverage', icon: 'cal' },
        { id: 'attendance', label: 'Attendance', icon: 'clock' },
        { id: 'vault', label: 'Password vault', icon: 'key', count: expiring || undefined },
      ]} />
      {tab === 'roster' && <Roster />}
      {tab === 'schedule' && <Schedule route={route} />}
      {tab === 'attendance' && <Attendance />}
      {tab === 'vault' && <Vault />}
    </>
  )
}

export const ACCESS = {
  'Team Lead': ['Whole-queue view', 'Rebalance & set analyst status', 'Approve automated fixes', 'Edit schedule, approve leave', 'Team vault compliance (counts only)', 'Coaching scorecards'],
  Analyst: ['Own work queue + team queue (read)', 'Resolve & document tickets', 'Request automated fixes', 'Own schedule & leave requests', 'Own password vault'],
}

function Roster() {
  const { state, dispatch } = useStore()
  const lead = state.role === 'lead'
  const [adding, setAdding] = useState(false)
  const [m, setM] = useState({ name: '', soeid: '', role: 'Analyst', group: 'Service Desk L2', shift: 'Early', location: 'WFH', status: 'offline', skills: [] })
  return (
    <>
      <section>
        <div className="card">
          <div className="card-h"><h3>Team roster</h3><span className="spacer" />{lead && <button className="btn primary sm" onClick={() => setAdding(true)}><Icon name="plus" size={14} />Add member</button>}</div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>SOEID</th><th>Access role</th><th>Assignment group</th><th>Default shift</th><th>Base location</th><th>Today</th><th>Skills</th></tr></thead>
              <tbody>
                {state.analysts.map((a) => (
                  <tr key={a.id}>
                    <td className="nowrap"><span className="row tight"><span className="avatar sm">{initials(a.name)}</span><b>{a.name}</b></span></td>
                    <td className="mono">{a.soeid}</td>
                    <td><span className={`pill ${a.role === 'Team Lead' ? 'accent' : 'plain'}`}>{a.role}</span></td>
                    <td className="nowrap">{a.group}</td>
                    <td>{a.shift}</td>
                    <td>{a.location}</td>
                    <td><span className={`pill ${a.status === 'online' ? 'good' : a.status === 'leave' ? 'warn' : 'plain'}`}>{a.status === 'leave' ? 'On leave' : a.status === 'online' ? 'Online' : 'Off shift'}</span></td>
                    <td className="small ink2">{a.skills.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {adding && (
        <Modal title="Add team member" onClose={() => setAdding(false)} footer={<>
          <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
          <button className="btn primary" disabled={!m.name.trim() || !/^[A-Z]{2}\d{5}$/.test(m.soeid)} onClick={() => { dispatch({ type: 'addMember', member: m }); setAdding(false) }}>Add member</button>
        </>}>
          <div className="form-grid">
            <label className="field"><span>Full name</span><input id="nm-name" className="in" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></label>
            <label className="field"><span>SOEID <span className="hint">2 letters + 5 digits</span></span><input id="nm-soeid" className="in mono" value={m.soeid} onChange={(e) => setM({ ...m, soeid: e.target.value.toUpperCase() })} placeholder="AB12345" /></label>
            <label className="field"><span>Access role</span><select id="nm-role" className="in" value={m.role} onChange={(e) => setM({ ...m, role: e.target.value })}><option>Analyst</option><option>Team Lead</option></select></label>
            <label className="field"><span>Assignment group</span><select id="nm-group" className="in" value={m.group} onChange={(e) => setM({ ...m, group: e.target.value })}>{['Service Desk L2', 'Apps Support', 'Infra Ops'].map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className="field"><span>Default shift</span><select id="nm-shift" className="in" value={m.shift} onChange={(e) => setM({ ...m, shift: e.target.value })}>{['Early', 'Mid', 'Late'].map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className="field"><span>Base location</span><select id="nm-loc" className="in" value={m.location} onChange={(e) => setM({ ...m, location: e.target.value })}><option>WFH</option><option>Onsite</option></select></label>
          </div>
        </Modal>
      )}
    </>
  )
}

function Schedule({ route }) {
  const { state, dispatch } = useStore()
  const lead = state.role === 'lead'
  const me = currentUser(state)
  const [leaves, setLeaves] = useState([
    { id: 'LV-2291', who: 'a9', type: 'Personal leave', from: NOW + 19 * DAY, days: 3, status: 'Pending' },
    { id: 'LV-2302', who: 'a4', type: 'Personal leave', from: NOW + 9 * DAY, days: 1, status: 'Pending' },
    { id: 'LV-2288', who: 'a10', type: 'Sick leave', from: NOW - 1 * DAY, days: 2, status: 'Approved' },
  ])
  const people = state.analysts
  return (
    <>
      <ShiftCalendar initial={route} />
      <section className="grid g-2">
        <div className="card">
          <div className="card-h"><h3>Leave requests</h3></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>ID</th><th>Analyst</th><th>Type</th><th>From</th><th className="r">Days</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{l.id}</td><td className="nowrap">{byId[l.who].name}</td><td>{l.type}</td><td className="nowrap">{fmtDate(l.from)}</td><td className="r">{l.days}</td>
                    <td className="nowrap">{l.status === 'Pending' && lead ? (
                      <span className="row tight">
                        <button className="btn primary sm" onClick={() => setLeaves(leaves.map((x) => (x.id === l.id ? { ...x, status: 'Approved' } : x)))}>Approve</button>
                        <button className="btn sm" onClick={() => setLeaves(leaves.map((x) => (x.id === l.id ? { ...x, status: 'Rejected' } : x)))}>Reject</button>
                      </span>
                    ) : <span className={`pill ${l.status === 'Approved' ? 'good' : l.status === 'Rejected' ? 'crit' : 'warn'}`}>{l.status}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Holidays & weekend rota</h3></div>
          <div className="card-b stack">
            {[
              [state.schedule.days[11], 'Public holiday', 'Skeleton crew: Andrea, Paolo, Bea'],
              [state.schedule.days[5], 'Weekend duty', people.filter((a) => state.schedule.sched[a.id]?.[5] === 'W').map((a) => a.name).join(', ') || 'Nobody assigned'],
              [state.schedule.days[6], 'Weekend duty', people.filter((a) => state.schedule.sched[a.id]?.[6] === 'W').map((a) => a.name).join(', ') || 'Nobody assigned'],
              [state.schedule.days[12], 'Weekend duty', people.filter((a) => state.schedule.sched[a.id]?.[12] === 'W').map((a) => a.name).join(', ') || 'Nobody assigned'],
            ].map(([d, t, who], i) => (
              <div key={i} className="list-row small"><b style={{ width: 70 }}>{fmtDay(d)}</b><span className={`pill ${t === 'Public holiday' ? 'warn' : 'plain'}`}>{t}</span><span className="ink2">{who}</span></div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function Attendance() {
  const { state } = useStore()
  const todayIdx = Math.floor((state.now - weekStart(state.now)) / DAY)
  const rows = state.analysts.map((a, i) => {
    const code = state.schedule.sched[a.id]?.[todayIdx] || 'OFF'
    const shift = SHIFT_CODES[code]
    let status = 'Not yet due', tone = 'plain', inAt = '—'
    if (shift.kind === 'leave') { status = shift.label; tone = 'warn' }
    else if (shift.kind !== 'shift') { status = shift.label }
    else if (a.status === 'online') {
      const late = [3, 6].includes(i) ? 12 + i : 0
      const [h, mm] = shift.time.split('–')[0].split(':').map(Number)
      const d = new Date(state.now); d.setHours(h, mm + late - (late ? 0 : 4), 0, 0)
      inAt = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      status = late ? `Late ${late}m` : 'On time'; tone = late ? 'warn' : 'good'
    }
    return { a, code, shift, status, tone, inAt, loc: shift.kind === 'shift' ? locationOn(a, todayIdx) : '—' }
  })
  const month = state.analysts.map((a, i) => ({ a, onTime: 0.86 + ((i * 7) % 12) / 100, lates: (i * 3) % 5, absences: i % 4 === 3 ? 1 : 0, leave: (i * 2) % 4 }))
  return (
    <>
      <section className="grid g-kpi">
        <Kpi label="Clocked in today" icon="clock" value={rows.filter((r) => r.inAt !== '—').length} unit={`/ ${rows.filter((r) => r.shift.kind === 'shift').length} scheduled`} />
        <Kpi label="Late arrivals" icon="alert" value={rows.filter((r) => r.status.startsWith('Late')).length} state="warn" />
        <Kpi label="On leave" icon="cal" tone="azure" value={rows.filter((r) => r.shift.kind === 'leave').length} />
        <Kpi label="Team on-time rate (30d)" icon="check" tone="navy" value={`${Math.round(month.reduce((s, m) => s + m.onTime, 0) / month.length * 100)}%`} />
      </section>
      <section className="grid g-2">
        <div className="card">
          <div className="card-h"><h3>Today</h3></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Analyst</th><th>Shift</th><th>Clock-in</th><th>Location</th><th>Status</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.a.id}><td className="nowrap">{r.a.name}</td><td className="nowrap">{r.shift.label}<span className="muted small"> {r.shift.time}</span></td><td className="mono">{r.inAt}</td><td>{r.loc}</td><td><span className={`pill ${r.tone}`}>{r.status}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Last 30 days</h3></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Analyst</th><th className="r">On time</th><th className="r">Lates</th><th className="r">Absences</th><th className="r">Leave days</th></tr></thead>
              <tbody>{month.map((m) => (
                <tr key={m.a.id}><td className="nowrap">{m.a.name}</td><td className="r">{Math.round(m.onTime * 100)}%</td><td className="r">{m.lates}</td><td className="r" style={{ color: m.absences ? 'var(--crit)' : undefined }}>{m.absences}</td><td className="r">{m.leave}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}

// ---------- Password vault ----------
const POLICY_DAYS = 90
const genPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?'
  const a = new Uint32Array(18); crypto.getRandomValues(a)
  return Array.from(a, (x) => chars[x % chars.length]).join('')
}
const strengthOf = (p) => {
  let s = 0
  if (p.length >= 12) s++
  if (p.length >= 16) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s >= 5 ? 'Strong' : s >= 3 ? 'Fair' : 'Weak'
}
const vaultStatus = (v, now) => {
  if (v.expiresAt == null) return { label: 'No expiry set', tone: 'plain', days: null }
  const days = Math.ceil((v.expiresAt - now) / DAY)
  if (days <= 0) return { label: 'Expired', tone: 'crit', days }
  if (days <= v.reminderDays) return { label: `Expires in ${days}d`, tone: 'warn', days }
  return { label: 'Healthy', tone: 'good', days }
}

const FLOW = [
  ['plus', 'Add', 'App, username, password'],
  ['cal', 'Set expiry', '30 / 60 / 90 days or a date'],
  ['bell', 'Get reminded', 'Bell + banner at your lead time'],
  ['refresh', 'Rotate', 'Generate, update the app, confirm'],
  ['check', 'Age resets', 'New expiry, audit entry'],
]

function Vault() {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const lead = state.role === 'lead'
  const [edit, setEdit] = useState(null)
  const [rotate, setRotate] = useState(null)
  const [unlocked, setUnlocked] = useState(false)
  const [unlock, setUnlock] = useState(false)
  const [shown, setShown] = useState({})
  const [del, setDel] = useState(null)
  const items = state.vault.map((v) => ({ v, s: vaultStatus(v, state.now), age: Math.floor((state.now - v.changedAt) / DAY) }))
    .sort((a, b) => (a.s.days ?? 999) - (b.s.days ?? 999))
  const due = items.filter((i) => i.s.tone === 'crit' || i.s.tone === 'warn')
  return (
    <>
      <section className="card">
        <div className="card-h"><h3>How the vault works</h3><span className="muted small">Each analyst sees only their own credentials for third-party apps.</span></div>
        <div className="card-b">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {FLOW.map(([ic, t, s], i) => (
              <div key={t} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <span className="qa-ic"><Icon name={ic} size={16} /></span>
                <div className="stack" style={{ gap: 0 }}><b className="small">{i + 1}. {t}</b><span className="small muted">{s}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {due.length > 0 && (
        <div className={`callout ${due.some((d) => d.s.tone === 'crit') ? 'crit' : 'warn'}`} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Icon name="key" />
          <span style={{ flex: 1, minWidth: 200 }}><b>{due.length} password{due.length > 1 ? 's' : ''} need{due.length > 1 ? '' : 's'} rotating:</b> {due.map((d) => `${d.v.app} (${d.s.label.toLowerCase()})`).join(', ')}</span>
          <button className="btn sm" onClick={() => setRotate(due[0].v)}>Rotate {due[0].v.app}</button>
        </div>
      )}

      <section className="card">
        <div className="card-h">
          <h3>My credentials</h3><span className="muted small">{me.name} · {me.soeid}</span>
          <span className="spacer" />
          {unlocked ? <span className="pill good"><Icon name="lock" size={11} />Unlocked for this session</span> : <button className="btn sm" onClick={() => setUnlock(true)}><Icon name="lock" size={14} />Unlock to reveal</button>}
          <button className="btn primary sm" onClick={() => setEdit({ id: null, app: '', user: me.soeid.toLowerCase(), secret: genPassword(), expiry: '90', reminderDays: 7 })}><Icon name="plus" size={14} />Add credential</button>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>App</th><th>Username</th><th>Password</th><th>Password age</th><th>Expires</th><th>Reminder</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map(({ v, s, age }) => (
                <tr key={v.id}>
                  <td><b>{v.app}</b><div className="small muted">Strength: {v.strength}</div></td>
                  <td className="mono">{v.user}</td>
                  <td className="nowrap">
                    <span className="mono">{unlocked && shown[v.id] ? v.secret : '••••••••••••'}</span>
                    <button className="btn ghost sm" aria-label="Show password" onClick={() => (unlocked ? setShown({ ...shown, [v.id]: !shown[v.id] }) : setUnlock(true))}><Icon name="eye" size={14} /></button>
                    <button className="btn ghost sm" aria-label="Copy password" onClick={() => (unlocked ? copyText(v.secret, dispatch) : setUnlock(true))}><Icon name="copy" size={14} /></button>
                  </td>
                  <td style={{ minWidth: 130 }}>
                    <div className="row tight"><b className="num">{age}d</b><span className="muted small">/ {POLICY_DAYS}d policy</span></div>
                    <div className="meter" style={{ height: 5 }}><i style={{ width: `${Math.min(100, (age / POLICY_DAYS) * 100)}%`, background: age >= POLICY_DAYS ? 'var(--crit)' : age >= POLICY_DAYS * 0.8 ? 'var(--warn)' : 'var(--good)' }} /></div>
                  </td>
                  <td className="nowrap small">{v.expiresAt ? fmtDate(v.expiresAt) : <span className="muted">Not set</span>}</td>
                  <td className="nowrap small">{v.expiresAt ? `${v.reminderDays} days before` : '—'}</td>
                  <td><span className={`pill ${s.tone}`}>{s.label}</span></td>
                  <td className="nowrap">
                    {del === v.id ? (
                      <span className="row tight"><span className="small">Remove?</span><button className="btn danger sm" onClick={() => { dispatch({ type: 'vaultDelete', id: v.id }); setDel(null) }}>Remove</button><button className="btn sm" onClick={() => setDel(null)}>Keep</button></span>
                    ) : (
                      <span className="row tight">
                        <button className="btn sm" onClick={() => setRotate(v)}><Icon name="refresh" size={13} />Rotate</button>
                        <button className="btn ghost sm" onClick={() => setEdit({ ...v, expiry: v.expiresAt ? 'date' : 'none', date: v.expiresAt ? new Date(v.expiresAt).toISOString().slice(0, 10) : '' })}>Edit</button>
                        <button className="btn ghost sm" onClick={() => setDel(v.id)} aria-label="Remove"><Icon name="x" size={13} /></button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <div className="empty">Your vault is empty. Add the first third-party app credential.</div>}
        </div>
        <div className="small muted" style={{ padding: 12 }}>Prototype only: values are generated samples. In production, secrets are encrypted client-side and the server never sees them in plain text.</div>
      </section>

      {lead && (
        <section className="card">
          <div className="card-h"><h3>Team vault compliance</h3><span className="muted small">Counts only. Team leads never see analysts' passwords.</span></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Analyst</th><th className="r">Credentials</th><th className="r">Expiring soon</th><th className="r">Expired</th><th className="r">Weak</th><th></th></tr></thead>
              <tbody>{TEAM_VAULT_SUMMARY.map((t) => (
                <tr key={t.id}>
                  <td className="nowrap">{byId[t.id].name}</td><td className="r">{t.total}</td>
                  <td className="r" style={{ color: t.expiring ? 'var(--warn)' : undefined }}>{t.expiring}</td>
                  <td className="r" style={{ color: t.expired ? 'var(--crit)' : undefined }}>{t.expired}</td>
                  <td className="r">{t.weak}</td>
                  <td>{t.expired || t.expiring ? <button className="btn sm" onClick={() => dispatch({ type: 'toast', text: `Reminder sent to ${byId[t.id].name}` })}>Send reminder</button> : <span className="pill good">Compliant</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      {unlock && (
        <Modal title="Confirm it's you" sub="Revealing or copying passwords needs a fresh sign-in check." onClose={() => setUnlock(false)} footer={<>
          <button className="btn" onClick={() => setUnlock(false)}>Cancel</button>
          <button className="btn primary" onClick={() => { setUnlocked(true); setUnlock(false) }}>Verify</button>
        </>}>
          <label className="field"><span>SSO PIN or authenticator code</span><input id="vault-pin" className="in mono" inputMode="numeric" placeholder="Any 6 digits in this prototype" maxLength={6} /></label>
          <div className="small muted">The vault locks again after 10 minutes or when you leave the page.</div>
        </Modal>
      )}
      {edit && <VaultForm item={edit} onClose={() => setEdit(null)} />}
      {rotate && <RotateForm item={rotate} onClose={() => setRotate(null)} />}
    </>
  )
}

function VaultForm({ item, onClose }) {
  const { dispatch } = useStore()
  const [f, setF] = useState(item)
  const [show, setShow] = useState(false)
  const st = strengthOf(f.secret || '')
  const expiresAt = f.expiry === 'none' ? null : f.expiry === 'date' ? (f.date ? new Date(f.date + 'T23:59').getTime() : null) : Date.now() + Number(f.expiry) * DAY
  const save = () => {
    dispatch({ type: 'vaultSave', item: { id: f.id || Math.random().toString(36).slice(2, 9), app: f.app.trim(), user: f.user.trim(), secret: f.secret, changedAt: item.id && item.secret === f.secret ? item.changedAt : Date.now(), expiresAt, reminderDays: Number(f.reminderDays), strength: st } })
    onClose()
  }
  return (
    <Modal title={item.id ? `Edit ${item.app}` : 'Add credential'} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn primary" disabled={!f.app.trim() || !f.user.trim() || !f.secret || (f.expiry === 'date' && !f.date)} onClick={save}>{item.id ? 'Save changes' : 'Add to vault'}</button>
    </>}>
      <div className="form-grid">
        <label className="field"><span>Third-party app</span><input id="v-app" className="in" value={f.app} onChange={(e) => setF({ ...f, app: e.target.value })} placeholder="e.g. Jira Service Management" /></label>
        <label className="field"><span>Username</span><input id="v-user" className="in mono" value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })} /></label>
      </div>
      <label className="field"><span>Password</span>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="v-secret" className="in mono" style={{ flex: 1 }} type={show ? 'text' : 'password'} value={f.secret} onChange={(e) => setF({ ...f, secret: e.target.value })} />
          <button className="btn sm" type="button" onClick={() => setShow(!show)}><Icon name="eye" size={14} /></button>
          <button className="btn sm" type="button" onClick={() => setF({ ...f, secret: genPassword() })}><Icon name="refresh" size={14} />Generate</button>
        </div>
        <span className={`small`} style={{ color: st === 'Strong' ? 'var(--good)' : st === 'Fair' ? 'var(--warn)' : 'var(--crit)' }}>Strength: {st}</span>
      </label>
      <div className="form-grid">
        <label className="field"><span>Expiry</span>
          <select id="v-expiry" className="in" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })}>
            <option value="none">No expiry</option><option value="30">30 days from today</option><option value="60">60 days from today</option><option value="90">90 days from today</option><option value="date">Pick a date…</option>
          </select>
        </label>
        {f.expiry === 'date' && <label className="field"><span>Expiry date</span><input id="v-date" type="date" className="in" value={f.date || ''} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>}
        <label className="field"><span>Remind me</span>
          <select id="v-remind" className="in" value={f.reminderDays} disabled={f.expiry === 'none'} onChange={(e) => setF({ ...f, reminderDays: e.target.value })}>
            <option value="1">1 day before</option><option value="7">7 days before</option><option value="14">14 days before</option><option value="30">30 days before</option>
          </select>
        </label>
      </div>
      {expiresAt && <div className="callout accent small"><Icon name="bell" size={16} />Expires {fmtDate(expiresAt)}. You'll get a bell notification and a vault banner from {fmtDate(expiresAt - Number(f.reminderDays) * DAY)}, repeating daily until you rotate it.</div>}
      {f.expiry === 'none' && <div className="callout warn small"><Icon name="alert" size={16} />Without an expiry you won't get reminders. Team policy is rotation every {POLICY_DAYS} days.</div>}
    </Modal>
  )
}

function RotateForm({ item, onClose }) {
  const { dispatch } = useStore()
  const [secret, setSecret] = useState(genPassword())
  const [cycle, setCycle] = useState(90)
  const [done, setDone] = useState(false)
  return (
    <Modal title={`Rotate ${item.app} password`} sub={`Current password is ${Math.floor((Date.now() - item.changedAt) / DAY)} days old`} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn primary" disabled={!done} onClick={() => { dispatch({ type: 'vaultRotate', id: item.id, secret, cycleDays: cycle }); onClose() }}>Save new password</button>
    </>}>
      <div className="stack">
        <span className="section-title">1. New password</span>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="rot-secret" className="in mono" style={{ flex: 1 }} value={secret} onChange={(e) => setSecret(e.target.value)} />
          <button className="btn sm" onClick={() => setSecret(genPassword())}><Icon name="refresh" size={14} />Regenerate</button>
          <button className="btn sm" onClick={() => copyText(secret, dispatch)}><Icon name="copy" size={14} />Copy</button>
        </div>
        <span className="small muted">Strength: {strengthOf(secret)}</span>
      </div>
      <div className="stack">
        <span className="section-title">2. Change it in {item.app}</span>
        <label className="check small"><input id="rot-done" type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />I've updated the password in {item.app} and signed in successfully</label>
      </div>
      <div className="stack">
        <span className="section-title">3. Next expiry</span>
        <Seg value={cycle} onChange={setCycle} options={[{ id: 30, label: '30 days' }, { id: 60, label: '60 days' }, { id: 90, label: '90 days' }]} />
        {item.expiresAt == null && <span className="small muted">This credential has no expiry, so the cycle is ignored. Edit it to add one.</span>}
      </div>
    </Modal>
  )
}
