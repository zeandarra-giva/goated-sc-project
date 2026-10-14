import { useMemo, useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { useNav } from '../App.jsx'
import { WeekPreview } from './ShiftCalendar.jsx'
import { Drawer, Icon, InfoTip, Kpi, KpiShell, Prio, Ring, SlaPill, Tabs, copyText } from '../components/ui.jsx'
import { ResolveModal, TicketWorkspace } from '../components/Workspace.jsx'
import {
  DAY, HOUR, MAX_LOAD_POINTS, PRIORITIES, SHIFT_CODES, byId, fmtDate, fmtDateTime, fmtDay, fmtDur, fmtTime,
  initials, loadOf, locationOn, slaInfo, weekStart,
} from '../data.js'

export function queueMetrics(tickets, analysts, now) {
  const open = tickets.filter((t) => t.state !== 'Resolved')
  const n = Math.max(1, open.length)
  const sla = open.map((t) => slaInfo(t, now))
  const breached = sla.filter((s) => s.status === 'Breached').length
  const atRisk = sla.filter((s) => s.status === 'At risk').length
  const crit = open.filter((t) => t.priority === 'P1' || t.priority === 'P2').length
  const online = analysts.filter((a) => a.status === 'online')
  const load = open.reduce((s, t) => s + PRIORITIES[t.priority].weight, 0)
  const loadRatio = Math.min(1, load / Math.max(1, online.length * MAX_LOAD_POINTS))
  const avgQueueAge = open.reduce((s, t) => s + (now - t.queuedAt), 0) / n
  const ageRatio = Math.min(1, avgQueueAge / (8 * HOUR))
  const parts = [
    { label: 'SLA pressure', w: 40, v: Math.min(1, (breached + atRisk * 0.6) / n) },
    { label: 'P1/P2 share', w: 25, v: crit / n },
    { label: 'Load vs. capacity', w: 20, v: loadRatio },
    { label: 'Queue age', w: 15, v: ageRatio },
  ]
  const risk = Math.round(parts.reduce((s, p) => s + p.w * p.v, 0))
  const slaHealth = sla.reduce((s, x) => s + x.pct, 0) / n
  const ageHealth = open.filter((t) => now - t.openedAt < PRIORITIES[t.priority].slaH * HOUR * 0.5).length / n
  return { open, breached, atRisk, crit, online, risk, parts, slaHealth, ageHealth, p1: open.filter((t) => t.priority === 'P1').length }
}

const toneOf = (risk) => (risk >= 60 ? 'crit' : risk >= 35 ? 'warn' : 'good')

export default function Home({ route }) {
  const { state, dispatch } = useStore()
  const { nav } = useNav()
  const me = currentUser(state)
  const lead = state.role === 'lead'
  const [tab, setTab] = useState(route.approval ? 'approvals' : lead ? 'queue' : 'mine')
  const [drawer, setDrawer] = useState(route.ticket || null)
  const [resolving, setResolving] = useState(null)
  const m = queueMetrics(state.tickets, state.analysts, state.now)
  const myOpen = state.tickets.filter((t) => t.assignedTo === me.id)
  const pendingFix = state.approvals.filter((a) => a.status === 'Pending').length
  const drawerTicket = state.tickets.find((t) => t.id === drawer)

  const tabs = [
    { id: 'queue', label: 'Team queue', count: m.open.length },
    { id: 'mine', label: 'My work queue', count: myOpen.length },
    { id: 'handover', label: 'Shift handover' },
    ...(lead ? [{ id: 'approvals', label: 'Fix approvals', count: pendingFix }] : []),
  ]

  return (
    <>
      <section className="grid g-kpi" aria-label="Queue health" data-tour="kpis">
        <Kpi label="Active incidents" icon="alert" value={m.open.length} state={m.p1 ? 'crit' : undefined}
          info={<><span>Open incidents pulled from ServiceNow, refreshed every 30 seconds.</span><span><b>Breached</b>: past the SLA deadline for its priority (P1 4h, P2 8h, P3 24h, P4 72h).</span><span><b>At risk</b>: less than 25% of the SLA window left.</span></>}
          foot={<><span className="prio P1">P1 {m.p1}</span><span className="prio P2">P2 {m.crit - m.p1}</span><span>{m.breached} breached · {m.atRisk} at risk</span></>} />
        <KpiShell label="Queue risk score" icon="bolt" state={toneOf(m.risk)} info={<>
              <span>0–100, recomputed from the live queue on every sync.</span>
              {m.parts.map((p, i) => (
                <div key={p.label} className="stack" style={{ gap: 3 }}>
                  <div className="row"><b className="ink">{p.label}</b><span className="muted">× {p.w}</span><span className="spacer" /><b className="num">{Math.round(p.w * p.v)} pts</b></div>
                  <div className="meter" style={{ height: 6 }}><i style={{ width: `${p.v * 100}%`, background: `var(--kb-${i + 1})` }} /></div>
                  <span className="muted">{[
                    'Breached count fully, at-risk (under 25% SLA left) count 60%.',
                    'Share of open tickets that are P1 or P2.',
                    `Weighted load (P1 = 3, P2 = 2, P3/P4 = 1) vs ${MAX_LOAD_POINTS} points per online analyst.`,
                    'Average time in queue vs an 8-hour ceiling.',
                  ][i]}</span>
                </div>
              ))}
              <span>Below 35 is low, 35–59 elevated, 60+ high.</span>
          </>}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <div className="kpi-v">{m.risk}<small>/100</small></div>
            <span className={`pill ${toneOf(m.risk)}`}>{m.risk >= 60 ? 'High' : m.risk >= 35 ? 'Elevated' : 'Low'}</span>
          </div>
          <div className="meter">{m.parts.map((p, i) => <i key={p.label} style={{ width: `${p.w * p.v}%`, background: `var(--kb-${i + 1})` }} title={`${p.label}: ${Math.round(p.w * p.v)} pts`} />)}</div>
          <div className="kpi-foot">Driven by {m.parts.slice().sort((a, b) => b.w * b.v - a.w * a.v)[0].label.toLowerCase()}</div>
        </KpiShell>
        <KpiShell label="SLA health average" icon="clock" state={m.slaHealth < 0.35 ? 'crit' : m.slaHealth < 0.55 ? 'warn' : 'good'} info={<>
              <span><b>Expiration health</b>: the average share of SLA time still left across all open tickets. 100 means every ticket was just opened; 0 means everything has breached.</span>
              <span><b>Ticket age health</b>: share of open tickets younger than half of their SLA window.</span>
              <span>The ring turns amber below 55 and red below 35.</span>
          </>}>
          <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
            <Ring value={m.slaHealth} tone={m.slaHealth < 0.35 ? 'crit' : m.slaHealth < 0.55 ? 'warn' : 'good'} label="SLA time remaining" />
            <div className="stack" style={{ gap: 8, flex: 1 }}>
              <div><div className="small ink2">Expiration health</div><b className="num">{Math.round(m.slaHealth * 100)}% SLA time left</b></div>
              <div><div className="small ink2">Ticket age health</div><b className="num">{Math.round(m.ageHealth * 100)}% under half of SLA</b></div>
            </div>
          </div>
        </KpiShell>
        <Kpi label="Analysts online" icon="team" tone="navy" info={<span>Analysts signed in and on shift right now. Only online analysts receive new tickets.</span>} value={m.online.length} unit={`/ ${state.analysts.length}`}
          foot={<>{state.analysts.filter((a) => a.status === 'leave').length} on leave · {state.analysts.filter((a) => a.status === 'offline').length} off shift</>} />
      </section>

      <section className="grid g-2">
        <ScheduleCard />
        <AssignmentCard />
      </section>

      <section className="card">
        <div style={{ padding: '4px 12px 0' }}><Tabs tabs={tabs} value={tab} onChange={setTab} /></div>
        {tab === 'queue' && <QueueTable onOpen={setDrawer} onResolve={setResolving} />}
        {tab === 'mine' && <MyWork onResolve={setResolving} />}
        {tab === 'handover' && <Handover onOpenLog={() => nav('explorer', { tab: 'handover' })} />}
        {tab === 'approvals' && <Approvals highlight={route.approval} />}
      </section>

      {drawerTicket && (
        <Drawer title={<span className="eyebrow">Ticket workspace</span>} onClose={() => setDrawer(null)}>
          <TicketWorkspace ticket={drawerTicket} onResolve={(t) => setResolving(t)} />
        </Drawer>
      )}
      {resolving && <ResolveModal ticket={resolving} onClose={() => { setResolving(null); if (resolving.id === drawer) setDrawer(null) }} />}
    </>
  )
}

function ScheduleCard() {
  const { nav } = useNav()
  return <WeekPreview onOpen={(opts = {}) => nav('team', { tab: 'schedule', ...opts })} />
}

function AssignmentCard() {
  const { state, dispatch } = useStore()
  const lead = state.role === 'lead'
  const rows = state.analysts
    .filter((a) => a.status !== 'leave')
    .map((a) => ({ a, load: loadOf(a.id, state.tickets), count: state.tickets.filter((t) => t.assignedTo === a.id).length, today: state.stats[a.id]?.today || 0 }))
    .sort((x, y) => (x.a.status === 'online' ? 0 : 1) - (y.a.status === 'online' ? 0 : 1) || y.load - x.load)
  const online = rows.filter((r) => r.a.status === 'online')
  const spread = online.length ? Math.max(...online.map((r) => r.load)) - Math.min(...online.map((r) => r.load)) : 0
  return (
    <div className="card" data-tour="assign">
      <div className="card-h">
        <h2>Assigned per online analyst</h2>
        <span className={`pill ${spread <= 2 ? 'good' : spread <= 4 ? 'warn' : 'crit'}`}>{spread <= 2 ? 'Balanced' : 'Uneven'} · spread {spread} pts</span>
        <span className="spacer" />
        {lead && <button className="btn sm" data-tour="rebalance" onClick={() => dispatch({ type: 'rebalance' })}><Icon name="swap" size={14} />Rebalance</button>}
        <InfoTip title="Fair-share assignment">
          <span>New tickets go to the online analyst with the lowest <b>weighted load</b>: P1 = 3 pts, P2 = 2, P3/P4 = 1, capped at {MAX_LOAD_POINTS} pts each.</span>
          <span>Ties go to whoever has the fewest tickets assigned today, then whoever has waited longest since their last assignment.</span>
          <span>Offline and on-leave analysts are skipped. <b>Spread</b> is the gap between the highest and lowest load; 2 pts or less counts as balanced.</span>
          {lead && <span>Set someone offline, then use <b>Rebalance</b> to hand their tickets to the rest of the shift.</span>}
        </InfoTip>
      </div>
      <div className="card-b stack lg">
        <div className="stack" style={{ gap: 10 }}>
          {rows.map((r) => (
            <div key={r.a.id} className="row" style={{ flexWrap: 'nowrap', opacity: r.a.status === 'online' ? 1 : 0.6 }}>
              <span className="avatar sm">{initials(r.a.name)}</span>
              <span style={{ width: 112, flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="small">{r.a.name}</span>
              <div className="hbar-track" style={{ flex: 1, minWidth: 40 }} title={`${r.load} load points`}>
                <div className="hbar-fill" style={{ width: `${(r.load / MAX_LOAD_POINTS) * 100}%`, background: r.load >= MAX_LOAD_POINTS * 0.8 ? 'var(--crit)' : 'var(--s7)' }} />
              </div>
              <span className="num small" style={{ width: 70, textAlign: 'right' }}><b>{r.count}</b> open · {r.load}p</span>
              <span className="num small muted" style={{ width: 54, textAlign: 'right' }}>{r.today} today</span>
              {lead ? (
                <select className="in sm" aria-label={`${r.a.name} status`} value={r.a.status} onChange={(e) => dispatch({ type: 'analystStatus', id: r.a.id, status: e.target.value })}>
                  <option value="online">Online</option><option value="offline">Offline</option>
                </select>
              ) : <span className={`pill ${r.a.status === 'online' ? 'good' : 'plain'}`}>{r.a.status}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QueueTable({ onOpen, onResolve }) {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const [q, setQ] = useState('')
  const [prio, setPrio] = useState('All')
  const [sla, setSla] = useState('All')
  const [mine, setMine] = useState(false)
  const rows = useMemo(() => state.tickets
    .map((t) => ({ t, s: slaInfo(t, state.now) }))
    .filter(({ t, s }) => (prio === 'All' || t.priority === prio) && (sla === 'All' || s.status === sla) && (!mine || t.assignedTo === me.id) &&
      (!q || `${t.id} ${t.desc} ${byId[t.assignedTo]?.name || ''}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.s.remaining - b.s.remaining), [state.tickets, state.now, q, prio, sla, mine, me.id])
  return (
    <div>
      <div className="row" style={{ padding: 12 }}>
        <input id="queue-search" className="in" placeholder="Search ID, description, analyst" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200, maxWidth: 360 }} />
        <select id="queue-prio" className="in" value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Priority">{['All', 'P1', 'P2', 'P3', 'P4'].map((p) => <option key={p}>{p}</option>)}</select>
        <select id="queue-sla" className="in" value={sla} onChange={(e) => setSla(e.target.value)} aria-label="SLA status">{['All', 'Breached', 'At risk', 'On track'].map((p) => <option key={p}>{p}</option>)}</select>
        <label className="check small"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Only mine</label>
        <span className="spacer" />
        <span className="muted small">Sorted by SLA time left · {rows.length} tickets</span>
      </div>
      <div className="tbl-wrap tbl-scroll">
        <table className="tbl">
          <thead><tr>
            <th>Ticket ID</th><th>Description</th><th>Priority</th><th>State</th><th className="r">Total age</th><th className="r">Age in queue</th><th>SLA status</th><th>Assigned at</th><th>Assigned to</th>
          </tr></thead>
          <tbody>
            {rows.map(({ t, s }) => (
              <tr key={t.id} className="click" onClick={() => onOpen(t.id)}>
                <td className="mono nowrap">{t.id}</td>
                <td className="desc">{t.desc}<div className="muted small">{t.businessApp}</div></td>
                <td><Prio p={t.priority} /></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select className="in sm" value={t.state} aria-label={`State of ${t.id}`} onChange={(e) => (e.target.value === 'Resolved' ? onResolve(t) : dispatch({ type: 'setState', id: t.id, state: e.target.value }))}>
                    {['New', 'In Progress', 'Awaiting Customer', 'On Hold', 'Resolved'].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </td>
                <td className="r nowrap">{fmtDur(state.now - t.openedAt)}</td>
                <td className="r nowrap">{fmtDur(state.now - t.queuedAt)}</td>
                <td className="nowrap"><SlaPill status={s.status} /><div className="muted small num">{s.remaining > 0 ? `${fmtDur(s.remaining)} left` : `${fmtDur(-s.remaining)} over`}</div></td>
                <td className="nowrap small">{t.assignedAt ? fmtDateTime(t.assignedAt) : '—'}</td>
                <td className="nowrap" title={t.assignReason}>{t.assignedTo ? <span className="row tight"><span className="avatar sm">{initials(byId[t.assignedTo].name)}</span>{byId[t.assignedTo].name}</span> : <span className="pill warn">Waiting</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">No tickets match these filters.</div>}
      </div>
    </div>
  )
}

function MyWork({ onResolve }) {
  const { state } = useStore()
  const me = currentUser(state)
  const mine = state.tickets
    .filter((t) => t.assignedTo === me.id)
    .map((t) => {
      const s = slaInfo(t, state.now)
      const score = PRIORITIES[t.priority].weight * 20 + (1 - s.pct) * 50 + (s.status === 'Breached' ? 30 : 0) - (t.state === 'Awaiting Customer' || t.state === 'On Hold' ? 25 : 0)
      return { t, s, score }
    })
    .sort((a, b) => b.score - a.score)
  const [sel, setSel] = useState(mine[0]?.t.id)
  const cur = state.tickets.find((t) => t.id === sel) || mine[0]?.t
  if (!mine.length) return <div className="empty">Nothing assigned to {me.name} right now. New tickets arrive automatically when you're online.</div>
  return (
    <div className="grid g-1-2" style={{ padding: 12, gap: 16 }}>
      <div className="stack">
        <div className="row"><span className="section-title">Prioritised for {me.name.split(' ')[0]}</span><span className="muted small">priority × SLA urgency</span></div>
        {mine.map(({ t, s, score }, i) => (
          <button key={t.id} onClick={() => setSel(t.id)} className="qa" style={{ borderColor: cur?.id === t.id ? 'var(--accent)' : undefined, background: cur?.id === t.id ? 'var(--accent-soft)' : undefined, flexDirection: 'column', gap: 6 }}>
            <div className="row" style={{ width: '100%' }}><span className="mono small muted">#{i + 1}</span><span className="mono">{t.id}</span><Prio p={t.priority} /><span className="spacer" /><SlaPill status={s.status} /></div>
            <div className="small" style={{ textAlign: 'left' }}>{t.desc}</div>
            <div className="row small muted" style={{ width: '100%' }}><span>{t.state}</span><span className="spacer" /><span className="num">{s.remaining > 0 ? `${fmtDur(s.remaining)} left` : `${fmtDur(-s.remaining)} over`}</span><span className="num" title="Priority score">· {Math.round(score)}</span></div>
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 16 }}>{cur && <TicketWorkspace ticket={cur} onResolve={onResolve} />}</div>
    </div>
  )
}

function Handover({ onOpenLog }) {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const shiftStart = state.now - 8 * HOUR
  const done = state.history.filter((h) => h.resolvedAt >= shiftStart)
  const crit = state.tickets.filter((t) => t.priority === 'P1' || t.priority === 'P2')
  const m = queueMetrics(state.tickets, state.analysts, state.now)
  const nextWeek = state.schedule.days.slice(7, 14)
  const [notes, setNotes] = useState('')
  const [to, setTo] = useState('a7')
  const byCode = {}
  done.forEach((h) => (byCode[h.code] = (byCode[h.code] || 0) + 1))
  const summary = [
    `Shift handover · ${fmtDateTime(state.now)} · ${me.name} → ${byId[to].name}`,
    `Completed: ${done.length} resolved (${Object.entries(byCode).map(([c, n]) => `${c} ×${n}`).join(', ') || 'none'})`,
    `Unresolved critical: ${crit.map((t) => `${t.id} ${t.priority} ${slaInfo(t, state.now).status}`).join('; ') || 'none'}`,
    `Queue: ${m.open.length} open, risk ${m.risk}/100, ${m.breached} breached`,
    notes && `Notes: ${notes}`,
  ].filter(Boolean).join('\n')
  return (
    <div className="stack lg" style={{ padding: 16 }}>
      <div className="row">
        <span className="small ink2">Covers the last 8 hours. Fields fill in from the queue; add context the next shift needs.</span>
        <span className="spacer" />
        <button className="btn ghost sm" onClick={onOpenLog}>Handover history <Icon name="arrowR" size={14} /></button>
      </div>
      {m.risk >= 60 && <div className="callout crit small"><Icon name="alert" size={16} />Queue risk is high ({m.risk}/100). Call out staffing needs in your notes.</div>}
      <div className="grid g-kpi" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="row"><span className="section-title">Completed this shift</span><span className="spacer" /><b className="kpi-v" style={{ fontSize: 22 }}>{done.length}</b></div>
          <div className="stack small" style={{ marginTop: 8 }}>
            {done.slice(0, 6).map((h) => <div key={h.id} className="row"><span className="mono">{h.id}</span><span className="code-chip">{h.code}</span><span className="muted">{byId[h.analyst]?.name.split(' ')[0]}</span></div>)}
            {!done.length && <span className="muted">Nothing resolved yet. Resolve a ticket from the queue and it shows up here.</span>}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="row"><span className="section-title">Unresolved critical incidents</span><span className="spacer" /><b className="kpi-v" style={{ fontSize: 22, color: crit.length ? 'var(--crit)' : undefined }}>{crit.length}</b></div>
          <div className="stack small" style={{ marginTop: 8 }}>
            {crit.map((t) => <div key={t.id} className="row" style={{ flexWrap: 'nowrap' }}><Prio p={t.priority} /><span className="mono">{t.id}</span><span className="ink2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.desc}</span><SlaPill status={slaInfo(t, state.now).status} /></div>)}
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="section-title">Coverage next week</div>
          <div className="stack small" style={{ marginTop: 8, gap: 4 }}>
            {nextWeek.map((d, i) => {
              const idx = i + 7
              const working = state.analysts.filter((a) => SHIFT_CODES[state.schedule.sched[a.id]?.[idx]]?.kind === 'shift').length
              const hol = state.analysts.some((a) => state.schedule.sched[a.id]?.[idx] === 'H')
              const min = i >= 5 ? 2 : 5
              return <div key={d} className="row"><b style={{ width: 64 }}>{fmtDay(d)}</b><span className="num">{working} on shift</span>{hol && <span className="pill warn">Holiday</span>}<span className="spacer" />{working < min ? <span className="pill crit">Below min {min}</span> : <span className="pill good">OK</span>}</div>
            })}
          </div>
        </div>
      </div>
      <div className="form-grid">
        <label className="field"><span>Hand over to</span>
          <select id="ho-to" className="in" value={to} onChange={(e) => setTo(e.target.value)}>{state.analysts.filter((a) => a.id !== me.id).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.shift}</option>)}</select>
        </label>
      </div>
      <label className="field"><span>Notes for the next shift</span><textarea id="ho-notes" className="in" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vendor cases open, callbacks owed, monitoring to watch" /></label>
      <div className="row">
        <button className="btn" onClick={() => copyText(summary, dispatch)}><Icon name="copy" size={15} />Copy summary</button>
        <span className="spacer" />
        <button className="btn primary" onClick={() => {
          dispatch({ type: 'submitHandover', handover: { at: Date.now(), shift: `${me.shift} → ${byId[to].shift}`, by: me.name, to: byId[to].name, resolved: done.length, openCritical: crit.length, notes: notes || 'No additional notes.', acknowledged: false } })
          setNotes('')
        }}><Icon name="clip" size={15} />Submit handover</button>
      </div>
    </div>
  )
}

function Approvals({ highlight }) {
  const { state, dispatch } = useStore()
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead><tr><th>Request</th><th>Ticket</th><th>Code</th><th>Proposed fix</th><th>Requested by</th><th>When</th><th>Decision</th></tr></thead>
        <tbody>
          {state.approvals.map((a) => (
            <tr key={a.id} className={a.id === highlight ? 'sel' : ''}>
              <td className="mono">{a.id}</td>
              <td className="mono">{a.ticket}</td>
              <td><span className="code-chip">{a.code}</span></td>
              <td>{a.fix}</td>
              <td className="nowrap">{a.by}</td>
              <td className="nowrap small">{fmtTime(a.at)}</td>
              <td className="nowrap">{a.status === 'Pending' ? (
                <span className="row tight">
                  <button className="btn primary sm" onClick={() => dispatch({ type: 'decideFix', id: a.id, status: 'Approved' })}>Approve & run</button>
                  <button className="btn sm" onClick={() => dispatch({ type: 'decideFix', id: a.id, status: 'Rejected' })}>Reject</button>
                </span>
              ) : <span className={`pill ${a.status === 'Approved' ? 'good' : 'crit'}`}>{a.status}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="small muted" style={{ padding: 12 }}>Automated fixes come from resolution codes marked automatable. Nothing runs until a team lead approves it.</div>
    </div>
  )
}
