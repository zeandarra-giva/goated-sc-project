import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Drawer, Icon, InfoTip, Kpi, KpiShell, Prio, Tabs } from '../components/ui.jsx'
import { DocText } from '../components/Doc.jsx'
import { useNav } from '../App.jsx'
import { chunksOf, pageForCode } from '../kb.js'
import { useAssist } from '../components/Workspace.jsx'
import { BREACH_REASONS, BUSINESS_APPS, CHANNELS, DAY, PRIORITIES, initials, PRODUCT_GROUPS, RES_GOAL_H, ROOT_CAUSES, avg, byId, fmtDate, fmtDateTime, fmtH, fmtTime } from '../data.js'

// Ticket Explorer works like a browser: the first tab is the explorer itself
// (resolved tickets, codes, handovers) and is always there. Tickets and
// resolution codes open in their own closable tabs beside it, and stay open
// while you move around Scope.
const tabKey = { ticket: (id) => 'tk:' + id, code: (c) => 'cd:' + c }

export default function Explorer({ route }) {
  const { state, dispatch } = useStore()
  const [section, setSection] = useState(route.tab || 'tickets')
  const [active, setActive] = useState('home')
  const unacked = state.handovers.filter((h) => !h.acknowledged).length
  const tabs = state.explorerTabs.map((k) => {
    if (k.startsWith('tk:')) { const h = state.history.find((x) => x.id === k.slice(3)); return h && { key: k, kind: 'ticket', h, label: h.desc, id: h.id } }
    const c = state.codes.find((x) => x.code === k.slice(3)); return c && { key: k, kind: 'code', c, label: c.title, id: c.code }
  }).filter(Boolean)
  const open = (key) => { dispatch({ type: 'explorerTabOpen', id: key }); setActive(key) }
  const openTicket = (id) => open(tabKey.ticket(id))
  const openCode = (code) => open(tabKey.code(code))
  const close = (key) => {
    const i = tabs.findIndex((t) => t.key === key)
    dispatch({ type: 'explorerTabClose', id: key })
    if (active === key) { const rest = tabs.filter((t) => t.key !== key); setActive(rest.length ? rest[Math.min(i, rest.length - 1)].key : 'home') }
  }
  const cur = tabs.find((t) => t.key === active)
  return (
    <>
      <div className="tabstrip" role="tablist" aria-label="Open tabs">
        <div className={`btab pinned ${!cur ? 'on' : ''}`} role="tab" aria-selected={!cur}>
          <button className="btab-open" onClick={() => setActive('home')}><Icon name="search" size={15} /><span className="btab-t">Ticket Explorer</span></button>
        </div>
        {tabs.map((t) => (
          <div key={t.key} className={`btab ${active === t.key ? 'on' : ''}`} role="tab" aria-selected={active === t.key} title={`${t.id} · ${t.label}`}>
            <button className="btab-open" onClick={() => setActive(t.key)}>
              <Icon name={t.kind === 'code' ? 'book' : 'doc'} size={15} /><span className="btab-t"><span className="mono">{t.id}</span> {t.label}</span>
            </button>
            <button className="btab-x" aria-label={`Close ${t.id}`} onClick={() => close(t.key)}><Icon name="x" size={13} /></button>
          </div>
        ))}
      </div>
      {!cur && (
        <>
          <Tabs value={section} onChange={setSection} tabs={[
            { id: 'tickets', label: 'Resolved tickets', count: state.history.length, icon: 'doc' },
            { id: 'codes', label: 'Resolution codes', count: state.codes.length, icon: 'book' },
            { id: 'handover', label: 'Handover log', count: unacked || undefined, icon: 'clip' },
          ]} />
          {section === 'tickets' && <Tickets onPopOut={openTicket} />}
          {section === 'codes' && <Codes onOpen={openCode} />}
          {section === 'handover' && <HandoverLog />}
        </>
      )}
      {cur?.kind === 'ticket' && <TicketPage key={cur.key} h={cur.h} onOpen={openTicket} onCode={openCode} onClose={() => close(cur.key)} />}
      {cur?.kind === 'code' && <CodePage key={cur.key} c={cur.c} onOpen={openTicket} onClose={() => close(cur.key)} />}
    </>
  )
}

function TicketHead({ h }) {
  return <><div className="row"><span className="mono">{h.id}</span><Prio p={h.priority} /><span className={`pill ${h.slaMet ? 'good' : 'crit'}`}>{h.slaMet ? 'SLA met' : 'SLA breached'}</span></div><h3 style={{ font: '600 17px/1.3 var(--f-cond)' }}>{h.desc}</h3></>
}
const ticketSub = (h) => <span className="small ink2">{h.businessApp} · {h.productGroup} · {h.channel} · {byId[h.analyst]?.name} ({h.assignmentGroup})</span>

// A popped-out ticket: the same journey as the drawer, as a full page.
function TicketPage({ h, onOpen, onCode, onClose }) {
  return (
    <section className="card ticket-page">
      <div className="card-h" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}><TicketHead h={h} />{ticketSub(h)}</div>
        <button className="btn sm" onClick={onClose}><Icon name="x" size={14} />Close tab</button>
      </div>
      <div className="card-b stack lg"><JourneyBody h={h} onOpen={onOpen} onCode={onCode} /></div>
    </section>
  )
}

function Tickets({ onPopOut }) {
  const { state } = useStore()
  const [f, setF] = useState({ q: '', pg: 'All', ch: 'All', app: 'All', fcr: 'All', flag: 'All', range: '30' })
  const [open, setOpen] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const rows = useMemo(() => state.history.filter((h) =>
    (f.range === 'all' || h.resolvedAt >= state.now - Number(f.range) * DAY) &&
    (f.pg === 'All' || h.productGroup === f.pg) && (f.ch === 'All' || h.channel === f.ch) && (f.app === 'All' || h.businessApp === f.app) &&
    (f.fcr === 'All' || (f.fcr === 'Yes') === h.fcr) &&
    (f.flag === 'All' || (f.flag === 'breached' && h.breachCode) || (f.flag === 'deflect' && h.deflect) || (f.flag === 'escalated' && h.escalatedTo)) &&
    (!f.q || `${h.id} ${h.desc} ${h.code} ${h.category} ${byId[h.analyst]?.name || ''} ${h.diagNote} ${h.fixNote}`.toLowerCase().includes(f.q.toLowerCase()))), [state.history, state.now, f])
  const count = (fn) => rows.filter(fn).length
  const k = {
    eze: avg(rows.map((r) => r.ezeH)), res: avg(rows.map((r) => r.resH)), lost: avg(rows.map((r) => r.lostH)),
    goal: rows.length ? rows.filter((r) => r.resH < RES_GOAL_H).length / rows.length : 0,
  }
  const cur = state.history.find((h) => h.id === open)
  return (
    <>
      <section className="grid g-kpi">
        <Kpi label="Total records" icon="doc" value={rows.length.toLocaleString()} foot={`${f.range === 'all' ? 'All time' : `Last ${f.range} days`}`} />
        <Kpi label="Avg EZE MTTR" icon="clock" tone="azure" value={fmtH(k.eze)} info={<><span><b>End-to-end MTTR</b>: from the moment the ticket is opened in ServiceNow to the moment it is resolved.</span><span>Average of (resolved − opened) across the filtered tickets.</span></>} />
        <Kpi label="Avg RES MTTR" icon="bolt" tone="ice" value={fmtH(k.res)} info={<><span><b>Resolver MTTR</b>: from assignment to an analyst until resolution. This is the time the resolver actually owned the ticket.</span><span>Average of (resolved − assigned).</span></>} />
        <Kpi label="Avg lost time" icon="pause" tone="navy" value={fmtH(k.lost)} info={<><span><b>Lost time</b> = EZE MTTR − RES MTTR.</span><span>Time a ticket spent waiting in the queue or bouncing between groups before the right resolver had it. Turns amber above 2h.</span></>} state={k.lost > 2 ? 'warn' : undefined} />
        <KpiShell label={`Goal: ≤${RES_GOAL_H} hours`} icon="check" state={k.goal >= 0.8 ? 'good' : k.goal >= 0.65 ? 'warn' : 'crit'} info={<>
          <span>Share of filtered tickets whose RES MTTR is under {RES_GOAL_H} hours.</span>
          <span>Team target is 80%. The marker on the bar shows the target; the card turns amber below 80% and red below 65%.</span>
        </>}>
          <div className="kpi-v">{Math.round(k.goal * 100)}<small>% met</small></div>
          <div className="hbar-track" style={{ height: 8 }}>
            <div className="hbar-fill" style={{ width: `${k.goal * 100}%`, background: k.goal >= 0.8 ? 'var(--good)' : 'var(--warn)' }} />
            <div className="hbar-mark" style={{ left: '80%' }} title="Target 80%" />
          </div>
        </KpiShell>
      </section>

      <section className="card">
        <div className="row" style={{ padding: 12 }}>
          <input id="ex-q" className="in" placeholder="Search ticket, description or code" value={f.q} onChange={set('q')} style={{ flex: 1, minWidth: 200, maxWidth: 320 }} />
          <select id="ex-range" className="in" value={f.range} onChange={set('range')} aria-label="Date range"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select>
          <select id="ex-pg" className="in" value={f.pg} onChange={set('pg')} aria-label="Product group"><option>All</option>{PRODUCT_GROUPS.map((x) => <option key={x}>{x}</option>)}</select>
          <select id="ex-ch" className="in" value={f.ch} onChange={set('ch')} aria-label="Channel"><option>All</option>{CHANNELS.map((x) => <option key={x}>{x}</option>)}</select>
          <select id="ex-app" className="in" value={f.app} onChange={set('app')} aria-label="Business app"><option>All</option>{BUSINESS_APPS.map((x) => <option key={x}>{x}</option>)}</select>
          <select id="ex-fcr" className="in" value={f.fcr} onChange={set('fcr')} aria-label="First contact resolution"><option value="All">FCR: all</option><option>Yes</option><option>No</option></select>
          <select id="ex-flag" className="in" value={f.flag} onChange={set('flag')} aria-label="Flags">
            <option value="All">All tickets</option><option value="breached">SLA breached</option><option value="deflect">Deflection candidates</option><option value="escalated">Escalated</option>
          </select>
          <span className="spacer" />
          <span className="row tight small ink2">
            <span className="pill crit">{count((h) => h.breachCode)} breached</span>
            <span className="pill accent">{count((h) => h.deflect)} deflectable</span>
            <span className="pill warn">{count((h) => h.escalatedTo)} escalated</span>
          </span>
        </div>
        <div className="tbl-wrap tbl-scroll">
          <table className="tbl">
            <thead><tr>
              <th>Ticket</th><th>Solved by</th><th>Problem category</th><th>Business app</th><th>Diagnosis note</th><th>Remedy / fix note</th><th>Code</th>
              <th>Date opened</th><th>Date resolved</th><th className="r">EZE MTTR</th><th className="r">RES MTTR</th><th className="r">Lost time</th><th>FCR</th>
              <th>Breach reason</th><th>Deflection</th><th>Escalated to</th>
            </tr></thead>
            <tbody>
              {rows.slice(0, 200).map((h) => (
                <tr key={h.id} className="click" onClick={() => setOpen(h.id)}>
                  <td className="nowrap"><span className="mono">{h.id}</span>{h.fresh && <span className="pill accent plain" style={{ marginLeft: 6 }}>New</span>}<div className="small muted" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.desc}</div></td>
                  <td className="nowrap"><span className="row tight"><span className="avatar sm">{initials(byId[h.analyst]?.name || '?')}</span>{byId[h.analyst]?.name || '—'}</span></td>
                  <td className="nowrap small">{h.category}</td>
                  <td className="nowrap">{h.businessApp}</td>
                  <td><div className="note-clip small ink2" title={h.diagNote}>{h.diagNote || '—'}</div></td>
                  <td><div className="note-clip small ink2" title={h.fixNote}>{h.fixNote || '—'}</div></td>
                  <td><span className="code-chip">{h.code}</span></td>
                  <td className="nowrap small">{fmtDateTime(h.openedAt)}</td>
                  <td className="nowrap small">{fmtDateTime(h.resolvedAt)}</td>
                  <td className="r">{fmtH(h.ezeH)}</td>
                  <td className="r" style={{ color: h.resH >= RES_GOAL_H ? 'var(--crit)' : undefined }}>{fmtH(h.resH)}</td>
                  <td className="r">{fmtH(h.lostH)}</td>
                  <td><span className={`pill ${h.fcr ? 'good' : 'plain'}`}>{h.fcr ? 'Yes' : 'No'}</span></td>
                  <td className="nowrap">{h.breachCode ? <span className="pill crit" title={`${BREACH_REASONS[h.breachCode]} · ${fmtH(h.overH)} over the ${PRIORITIES[h.priority].slaH}h SLA`}>{h.breachCode} · +{fmtH(h.overH)}</span> : <span className="muted">—</span>}</td>
                  <td className="nowrap">{h.deflect ? <span className="pill accent" title={h.deflect}><Icon name="spark" size={11} />Candidate</span> : <span className="muted">—</span>}</td>
                  <td className="nowrap small">{h.escalatedTo ? <span className="row tight"><Icon name="arrowR" size={12} />{h.escalatedTo}</span> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty">No resolved tickets match these filters.</div>}
        </div>
        {rows.length > 200 && <div className="small muted" style={{ padding: 10 }}>Showing the 200 most recent of {rows.length}. Narrow the filters to see more.</div>}
      </section>
      {cur && <TicketJourney h={cur} onClose={() => setOpen(null)} onOpen={setOpen} onPopOut={(id) => { setOpen(null); onPopOut(id) }} />}
    </>
  )
}

function TicketJourney({ h, onClose, onOpen, onPopOut }) {
  return (
    <Drawer onClose={onClose} title={<TicketHead h={h} />} sub={ticketSub(h)}
      actions={<button className="icon-btn" onClick={() => onPopOut(h.id)} aria-label="Open in a new tab" title="Open in a new tab"><Icon name="external" size={16} /></button>}>
      <JourneyBody h={h} onOpen={onOpen} />
    </Drawer>
  )
}

function JourneyBody({ h, onOpen, onCode }) {
  const { state } = useStore()
  const info = state.codes.find((c) => c.code === h.code)
  const a = useAssist(h.desc, h.code, h.id)
  const qaItems = [['Documentation complete', h.qa.documentation], ['Customer contact logged', h.qa.contactLogged], ['Correct resolution code', h.qa.correctCode], ['Fix validated with customer', h.qa.validated], ['SLA met', h.slaMet]]
  const score = Math.round((qaItems.filter((x) => x[1]).length / qaItems.length) * 100)
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
        {[['EZE MTTR', fmtH(h.ezeH)], ['RES MTTR', fmtH(h.resH)], ['Lost time', fmtH(h.lostH)], ['FCR', h.fcr ? 'Yes' : 'No'], ['Transfers', h.transfers]].map(([k, v]) => (
          <div key={k} className="stack" style={{ gap: 2 }}><span className="eyebrow">{k}</span><b className="num" style={{ fontSize: 18, fontFamily: 'var(--f-cond)' }}>{v}</b></div>
        ))}
      </div>
      <div className="callout accent" style={{ flexDirection: 'column', gap: 4 }}>
        <div className="row"><span className="eyebrow">Resolution code</span><span className="code-chip" style={{ fontSize: 14 }}>{h.code}</span>{onCode && <button className="btn ghost sm" onClick={() => onCode(h.code)}><Icon name="book" size={13} />Open code</button>}{info?.automatable && <span className="pill plain"><Icon name="bolt" size={11} />Automatable</span>}</div>
        <b>{info?.title}</b>
        {info && <span className="small ink2">{ROOT_CAUSES[info.cause].label} · {ROOT_CAUSES[info.cause].subs[info.sub]} · {info.runbook}</span>}
      </div>
      <div className="stack">
        <div className="section-title">Resolution details</div>
        <dl className="details">
          <dt>Solved by</dt><dd><span className="row tight"><span className="avatar sm">{initials(byId[h.analyst]?.name || '?')}</span>{byId[h.analyst]?.name} · {h.assignmentGroup}</span></dd>
          <dt>Problem category</dt><dd>{h.category}</dd>
          <dt>Business application</dt><dd>{h.businessApp}</dd>
          <dt>Diagnosis note</dt><dd>{h.diagNote || '—'}</dd>
          <dt>Remedy / fix note</dt><dd>{h.fixNote || '—'}</dd>
          <dt>Breach reason</dt><dd>{h.breachCode ? <><span className="pill crit">{h.breachCode}</span> {BREACH_REASONS[h.breachCode]} · {fmtH(h.overH)} over the {PRIORITIES[h.priority].slaH}h SLA</> : <span className="muted">SLA met</span>}</dd>
          <dt>Deflection candidate</dt><dd>{h.deflect ? <><span className="pill accent">Yes</span> {h.deflect}</> : <span className="muted">No</span>}</dd>
          <dt>Escalation target</dt><dd>{h.escalatedTo ? `${h.escalatedTo} (${h.transfers} transfer${h.transfers > 1 ? 's' : ''})` : <span className="muted">Not escalated</span>}</dd>
        </dl>
      </div>
      <div className="stack">
        <div className="section-title">Resolution journey</div>
        <ol className="timeline">
          {h.journey.map((j, i) => (
            <li key={i}>
              <span className="t">{fmtDate(j.at)}<br />{fmtTime(j.at)}</span>
              <span className={`rail-l ${j.stage === 'Transfer' ? 'warn' : j.stage === 'Validated' ? 'good' : ''}`} />
              <div className="c"><b>{j.stage}</b><span className="small ink2">{j.note}</span></div>
            </li>
          ))}
        </ol>
      </div>
      <div className="stack">
        <div className="row"><div className="section-title">QA score</div><span className="spacer" /><span className={`pill ${score >= 80 ? 'good' : score >= 60 ? 'warn' : 'crit'}`}>{score}/100</span></div>
        {qaItems.map(([l, ok]) => <div key={l} className="row small"><span style={{ color: ok ? 'var(--good)' : 'var(--crit)' }}><Icon name={ok ? 'check' : 'x'} size={15} /></span>{l}</div>)}
      </div>
      <div className="stack">
        <div className="row"><div className="section-title">Similar incidents</div><span className="muted small">keyword match, no AI</span></div>
        {a.similar.map((s) => (
          <button key={s.id} className="list-row small" style={{ background: 'none', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }} onClick={() => onOpen(s.id)}>
            <span className="mono">{s.id}</span>
            <span className="ink2" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.desc}</span>
            <span className="code-chip">{s.code}</span><span className="num muted">{fmtH(s.resH)}</span>
          </button>
        ))}
        {!a.similar.length && <span className="muted small">No close matches.</span>}
      </div>
    </>
  )
}

function Codes({ onOpen }) {
  const { state } = useStore()
  const [cat, setCat] = useState('All')
  const stats = useMemo(() => state.codes.map((c) => {
    const used = state.history.filter((h) => h.code === c.code)
    return { ...c, n: used.length, res: avg(used.map((u) => u.resH)), fcr: used.length ? used.filter((u) => u.fcr).length / used.length : NaN, last: Math.max(0, ...used.map((u) => u.resolvedAt)) }
  }).filter((c) => cat === 'All' || c.cause === cat).sort((a, b) => b.n - a.n), [state.codes, state.history, cat])
  return (
    <section className="card">
      <div className="row" style={{ padding: 12 }}>
        <select id="code-cat" className="in" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="All">All categories</option>{Object.entries(ROOT_CAUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <span className="spacer" />
        <InfoTip title="Resolution codes">
          <span>Format <span className="mono">CATEGORY-SUBCATEGORY-NN</span>, e.g. NET-VPN-01. The category and subcategory come from the root cause picked in the resolution journey.</span>
          <span>A new code is minted when an analyst marks a fix as new. <b>Auto-fix</b> codes can be proposed as automated fixes that a team lead approves.</span>
        </InfoTip>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Code</th><th>Resolution</th><th>Root cause</th><th>Runbook</th><th className="r">Uses</th><th className="r">Avg RES MTTR</th><th className="r">FCR rate</th><th>Last used</th><th>Automation</th></tr></thead>
          <tbody>
            {stats.map((c) => (
              <tr key={c.code} className="click" onClick={() => onOpen(c.code)} title="Open in a new tab">
                <td className="nowrap"><span className="code-chip">{c.code}</span> <Icon name="external" size={12} /></td>
                <td style={{ minWidth: 220 }}>{c.title}</td>
                <td className="nowrap small">{ROOT_CAUSES[c.cause].label} · {ROOT_CAUSES[c.cause].subs[c.sub]}</td>
                <td className="nowrap small">{c.runbook}</td>
                <td className="r">{c.n}</td>
                <td className="r" style={{ color: c.res >= RES_GOAL_H ? 'var(--crit)' : undefined }}>{fmtH(c.res)}</td>
                <td className="r">{isNaN(c.fcr) ? '—' : Math.round(c.fcr * 100) + '%'}</td>
                <td className="nowrap small">{c.last ? fmtDate(c.last) : '—'}</td>
                <td>{c.automatable ? <span className="pill accent" title={c.fix}>Auto-fix</span> : <span className="pill plain">Manual</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function HandoverLog() {
  const { state, dispatch } = useStore()
  return (
    <section className="card">
      <div className="card-h"><h2>Shift handover history</h2><span className="muted small">Submitted from Home → Shift handover. The next shift acknowledges each one.</span></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>ID</th><th>When</th><th>Shift</th><th>From → To</th><th className="r">Resolved</th><th className="r">Open critical</th><th>Notes</th><th>Status</th></tr></thead>
          <tbody>
            {state.handovers.map((h) => (
              <tr key={h.id}>
                <td className="mono">{h.id}</td>
                <td className="nowrap small">{fmtDateTime(h.at)}</td>
                <td className="nowrap">{h.shift}</td>
                <td className="nowrap">{h.by} → {h.to}</td>
                <td className="r">{h.resolved}</td>
                <td className="r" style={{ color: h.openCritical ? 'var(--crit)' : undefined }}>{h.openCritical}</td>
                <td style={{ minWidth: 260 }} className="small">{h.notes}</td>
                <td className="nowrap">{h.acknowledged ? <span className="pill good">Acknowledged</span> : <button className="btn sm" onClick={() => dispatch({ type: 'ackHandover', id: h.id })}>Acknowledge</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// A resolution code opened in its own tab: its runbook, how it performs and
// the tickets it closed.
function CodePage({ c, onOpen, onClose }) {
  const { state } = useStore()
  const { nav } = useNav()
  const used = state.history.filter((h) => h.code === c.code)
  const recent = used.filter((h) => h.resolvedAt >= state.now - 30 * DAY)
  const live = pageForCode(state.kb, state.kb.kbs.map((k) => k.id), c.code)
  const draft = !live && pageForCode(state.kb, state.kb.kbs.map((k) => k.id), c.code, { published: false })
  const steps = live && (chunksOf(live).find((x) => /steps|workaround/i.test(x.heading)) || chunksOf(live)[0])
  const apps = Object.entries(used.reduce((m, h) => ({ ...m, [h.businessApp]: (m[h.businessApp] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])
  const fcr = used.length ? used.filter((u) => u.fcr).length / used.length : NaN
  return (
    <>
      <section className="card">
        <div className="card-h" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
            <div className="row"><span className="code-chip" style={{ fontSize: 14 }}>{c.code}</span>{c.automatable ? <span className="pill accent"><Icon name="bolt" size={11} />Auto-fix</span> : <span className="pill plain">Manual</span>}</div>
            <h2>{c.title}</h2>
            <span className="small ink2">{ROOT_CAUSES[c.cause].label} › {ROOT_CAUSES[c.cause].subs[c.sub]} · {c.runbook}{c.automatable ? ` · ${c.fix}` : ''}</span>
          </div>
          <button className="btn sm" onClick={onClose}><Icon name="x" size={14} />Close tab</button>
        </div>
        <div className="card-b grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {[['Uses', used.length], ['Last 30 days', recent.length], ['Avg RES MTTR', fmtH(avg(used.map((u) => u.resH)))], ['FCR rate', isNaN(fcr) ? '—' : Math.round(fcr * 100) + '%'], ['Last used', used.length ? fmtDate(Math.max(...used.map((u) => u.resolvedAt))) : '—']].map(([k, v]) => (
            <div key={k} className="stack" style={{ gap: 2 }}><span className="eyebrow">{k}</span><b className="num" style={{ fontSize: 18 }}>{v}</b></div>
          ))}
        </div>
      </section>
      <section className="grid g-3-1">
        <div className="card">
          <div className="card-h"><h3>Runbook</h3>{live && <span className="muted small">{live.live.title} · v{live.live.version}</span>}<span className="spacer" />
            {(live || draft) && <button className="btn ghost sm" onClick={() => nav('kb', { page: (live || draft).id })}><Icon name="book" size={14} />Open in Knowledge Base</button>}
          </div>
          <div className="card-b">
            {steps ? <DocText text={steps.text} />
              : draft ? <div className="callout warn small"><Icon name="alert" size={15} /><span><b>{draft.draft.title}</b> is a draft only. Copilot and analysts can't rely on it until it's published.</span></div>
              : <div className="callout warn small"><Icon name="alert" size={15} /><span>No knowledge base page covers this code yet.</span><span className="spacer" /><button className="btn sm" onClick={() => nav('kb', { create: c.runbook, code: c.code })}><Icon name="plus" size={13} />Write it</button></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Business apps</h3></div>
          <div className="card-b stack">
            {apps.map(([a, n]) => <div key={a} className="row small"><span style={{ flex: 1 }}>{a}</span><b className="num">{n}</b></div>)}
            {!apps.length && <span className="muted small">Not used yet.</span>}
          </div>
        </div>
      </section>
      <section className="card">
        <div className="card-h"><h3>Tickets closed with this code</h3><span className="muted small">most recent first · click to open in a tab</span></div>
        <div className="tbl-wrap tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Ticket</th><th>Solved by</th><th>Business app</th><th>Resolved</th><th className="r">RES MTTR</th><th>SLA</th></tr></thead>
            <tbody>
              {used.slice(0, 50).map((h) => (
                <tr key={h.id} className="click" onClick={() => onOpen(h.id)}>
                  <td className="nowrap"><span className="mono">{h.id}</span><div className="small muted" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.desc}</div></td>
                  <td className="nowrap">{byId[h.analyst]?.name || '—'}</td>
                  <td className="nowrap">{h.businessApp}</td>
                  <td className="nowrap small">{fmtDateTime(h.resolvedAt)}</td>
                  <td className="r">{fmtH(h.resH)}</td>
                  <td><span className={`pill ${h.slaMet ? 'good' : 'crit'}`}>{h.slaMet ? 'Met' : 'Breached'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!used.length && <div className="empty">No tickets have used this code yet.</div>}
        </div>
      </section>
    </>
  )
}
