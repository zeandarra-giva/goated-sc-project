import { useMemo, useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { Icon, Kpi } from '../components/ui.jsx'
import { ACCESS } from './Team.jsx'
import { DAY, LEAVE_REQUESTS, SHIFT_CODES, fmtDate, initials, seedActivity, weekStart } from '../data.js'

const KINDS = [
  ['onsite', 'Worked onsite', 'var(--s7)'],
  ['wfh', 'Worked from home', 'color-mix(in srgb, var(--s7) 45%, var(--card))'],
  ['late', 'Late shift', 'var(--pink)'],
  ['weekend', 'Weekend duty', 'var(--s3)'],
  ['leave', 'Personal leave', 'var(--s4)'],
  ['sick', 'Sick leave', 'var(--s8)'],
  ['holiday', 'Holiday', 'var(--s1)'],
  ['none', 'Rest day', 'var(--heat-0)'],
]

const kindLabel = (k) => KINDS.find((x) => x[0] === k)[1]
// Hover text for a heatmap day. Worked days also say which shift it was.
function describe(c) {
  const sh = c.shift && SHIFT_CODES[c.shift]
  const shift = sh && `${sh.label === 'Weekend duty' ? 'Weekend duty' : sh.label + ' shift'} (${sh.time})`
  if (c.kind === 'onsite' || c.kind === 'wfh') return `${kindLabel(c.kind)} · ${shift}`
  if (c.kind === 'late' || c.kind === 'weekend') return `${shift} · ${c.loc === 'WFH' ? 'from home' : 'onsite'}`
  return kindLabel(c.kind)
}

export default function Settings() {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const activity = useMemo(() => seedActivity(me), [me])
  const [fields, setFields] = useState([['Timezone', 'Asia/Manila (UTC+8)'], ['Phone', '+63 917 555 0142'], ['Desk', 'Tower 2 · 14F · D-21']])
  const [nf, setNf] = useState({ k: '', v: '' })
  const [profile, setProfile] = useState({ email: `${me.name.toLowerCase().replace(' ', '.')}@corp.example`, manager: me.role === 'Team Lead' ? 'Service Ops Manager' : 'Andrea Santos' })
  const [hover, setHover] = useState(null)
  const [reqs, setReqs] = useState(LEAVE_REQUESTS)
  const [newLeave, setNewLeave] = useState({ type: 'Personal leave', from: '', days: 1 })

  const counts = Object.fromEntries(KINDS.map(([k]) => [k, activity.filter((d) => d.kind === k).length]))
  // Pad so the first column starts on Sunday, like a contribution graph.
  const pad = new Date(activity[0].ts).getDay()
  const cells = [...Array(pad).fill(null), ...activity]
  const months = []
  cells.forEach((c, i) => {
    if (!c) return
    const d = new Date(c.ts)
    if (d.getDate() === 1) months.push({ col: Math.floor(i / 7), label: d.toLocaleDateString([], { month: 'short' }) })
  })
  const weekIdx = Math.floor((state.now - weekStart(state.now)) / DAY)
  const myWeek = state.schedule.days.slice(0, 7).map((d, i) => [d, state.schedule.sched[me.id]?.[i]])

  return (
    <>
      <section className="grid g-1-2">
        <div className="stack lg" style={{ alignSelf: 'start' }}>
        <div className="card">
          <div className="card-b stack lg" style={{ paddingTop: 18 }}>
            <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
              <span className="avatar lg">{initials(me.name)}</span>
              <div className="stack" style={{ gap: 2 }}>
                <h2 style={{ font: '600 20px/1.2 var(--f-cond)' }}>{me.name}</h2>
                <span className="mono ink2">{me.soeid}</span>
                <span className={`pill ${me.role === 'Team Lead' ? 'accent' : 'plain'}`} style={{ alignSelf: 'flex-start' }}>{me.role}</span>
              </div>
            </div>
            <div className="stack">
              {[['Assignment group', me.group], ['Default shift', `${me.shift} · ${SHIFT_CODES[me.shift[0]]?.time || ''}`], ['Base location', me.location], ['Skills', me.skills.join(', ')]].map(([k, v]) => (
                <div key={k} className="list-row small"><span className="muted" style={{ width: 120 }}>{k}</span><b>{v}</b></div>
              ))}
            </div>
            <label className="field"><span>Work email</span><input id="pf-email" className="in" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
            <label className="field"><span>Reports to</span><input id="pf-mgr" className="in" value={profile.manager} onChange={(e) => setProfile({ ...profile, manager: e.target.value })} /></label>
            <div className="stack">
              <span className="section-title">More details</span>
              {fields.map(([k, v], i) => (
                <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
                  <span className="small muted" style={{ width: 90, flex: 'none' }}>{k}</span>
                  <input className="in" style={{ flex: 1 }} value={v} aria-label={k} onChange={(e) => setFields(fields.map((f, j) => (j === i ? [k, e.target.value] : f)))} />
                  <button className="btn ghost sm" aria-label={`Remove ${k}`} onClick={() => setFields(fields.filter((_, j) => j !== i))}><Icon name="x" size={13} /></button>
                </div>
              ))}
              <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (nf.k.trim()) { setFields([...fields, [nf.k.trim(), nf.v]]); setNf({ k: '', v: '' }) } }}>
                <input id="pf-newk" className="in" style={{ width: 110 }} placeholder="Field" value={nf.k} onChange={(e) => setNf({ ...nf, k: e.target.value })} />
                <input id="pf-newv" className="in" style={{ flex: 1, minWidth: 0 }} placeholder="Value" value={nf.v} onChange={(e) => setNf({ ...nf, v: e.target.value })} />
                <button className="btn sm" type="submit"><Icon name="plus" size={14} />Add</button>
              </form>
            </div>
            <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'toast', text: 'Profile saved' })}>Save profile</button>
          </div>
        </div>

          <div className="card">
            <div className="card-h"><h3>Role-based access</h3><span className="spacer" /><span className="pill accent">You: {me.role}</span></div>
            <div className="card-b stack lg">
              {Object.entries(ACCESS).map(([r, list]) => {
                const mine = r === me.role
                return (
                  <div key={r} className="stack" style={{ gap: 6, opacity: mine ? 1 : 0.55 }}>
                    <div className="row"><span className={`pill ${mine ? 'accent' : ''}`}>{r}</span>{mine && <span className="small muted">your access</span>}</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }} className="small ink2 stack">{list.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )
              })}
              <span className="small muted">Access is assigned by your team lead in Team Management.</span>
            </div>
          </div>
        </div>

        <div className="stack lg">
          <div className="card">
            <div className="card-h"><h3>Your year at a glance</h3><span className="muted small">{activity.length} days · attendance, shifts and leave</span></div>
            <div className="card-b stack lg">
              <div className="tbl-wrap" style={{ paddingBottom: 4 }}>
                <div style={{ display: 'inline-grid', gridTemplateColumns: '28px auto', gap: 4 }}>
                  <span />
                  <div style={{ position: 'relative', height: 14 }}>
                    {months.map((m) => <span key={m.col + m.label} className="small muted" style={{ position: 'absolute', left: m.col * 15, fontSize: 11 }}>{m.label}</span>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gap: 3, fontSize: 10 }} className="muted">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => <span key={i} style={{ lineHeight: '12px' }}>{d}</span>)}
                  </div>
                  <div className="heat" onMouseLeave={() => setHover(null)}>
                    {cells.map((c, i) => c ? (
                      <i key={i} data-k={c.kind} className={i === cells.length - 1 ? 'today' : ''} onMouseEnter={() => setHover(c)}
                        title={`${fmtDate(c.ts)}: ${describe(c)}`} />
                    ) : <i key={i} style={{ visibility: 'hidden' }} />)}
                  </div>
                </div>
              </div>
              <div className="small ink2" style={{ minHeight: 20 }}>{hover ? <><b>{new Date(hover.ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</b> · {describe(hover)}</> : 'Hover a square to see the day.'}</div>
              <div className="legend">
                {KINDS.map(([k, l, c]) => <span key={k}><i style={{ background: c }} />{l} <b className="num">{counts[k]}</b></span>)}
              </div>
            </div>
          </div>

          <section className="grid g-kpi">
            <Kpi label="Personal leave left" icon="cal" value={15 - counts.leave > 0 ? 15 - Math.min(15, counts.leave) : 0} unit="/ 15 days" />
            <Kpi label="Sick leave left" icon="user" tone="azure" value={Math.max(0, 10 - counts.sick)} unit="/ 10 days" />
            <Kpi label="Attendance rate" icon="check" tone="ice" value={`${Math.round(((counts.onsite + counts.wfh + counts.late) / Math.max(1, counts.onsite + counts.wfh + counts.late + counts.sick)) * 100)}%`} foot="Worked days vs. unplanned absence" />
          </section>

          <div className="card">
            <div className="card-h"><h3>This week's shifts</h3></div>
            <div className="card-b">
              <div className="grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                {myWeek.map(([d, c], i) => (
                  <div key={d} className="stack" style={{ gap: 4, alignItems: 'center' }}>
                    <span className="small" style={{ fontWeight: i === weekIdx ? 700 : 400, color: i === weekIdx ? 'var(--accent)' : 'var(--muted)' }}>{new Date(d).toLocaleDateString([], { weekday: 'short' })}</span>
                    <div className={`cell ${c}`} title={SHIFT_CODES[c]?.label}>{c}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Leave requests</h3></div>
            <div className="card-b stack lg">
              <form className="row" onSubmit={(e) => {
                e.preventDefault()
                if (!newLeave.from) return
                const from = new Date(newLeave.from + 'T09:00').getTime()
                setReqs([{ id: `LV-${2300 + reqs.length}`, type: newLeave.type, from, to: from + (newLeave.days - 1) * DAY, days: Number(newLeave.days), status: 'Pending', approver: me.role === 'Team Lead' ? 'Service Ops Manager' : 'Andrea Santos' }, ...reqs])
                dispatch({ type: 'toast', text: 'Leave request sent for approval' })
              }}>
                <select id="lv-type" className="in" value={newLeave.type} onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value })}><option>Personal leave</option><option>Sick leave</option></select>
                <input id="lv-from" type="date" className="in" value={newLeave.from} onChange={(e) => setNewLeave({ ...newLeave, from: e.target.value })} aria-label="Start date" />
                <input id="lv-days" type="number" min="1" max="15" className="in" style={{ width: 72 }} value={newLeave.days} onChange={(e) => setNewLeave({ ...newLeave, days: e.target.value })} aria-label="Days" />
                <button className="btn primary sm" type="submit">Request leave</button>
              </form>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>ID</th><th>Type</th><th>Dates</th><th className="r">Days</th><th>Approver</th><th>Status</th></tr></thead>
                  <tbody>{reqs.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td><td>{r.type}</td><td className="nowrap">{fmtDate(r.from)}{r.days > 1 && ` – ${fmtDate(r.to)}`}</td><td className="r">{r.days}</td><td className="small">{r.approver}</td>
                      <td><span className={`pill ${r.status === 'Approved' ? 'good' : r.status === 'Rejected' ? 'crit' : 'warn'}`} title={r.note}>{r.status}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
