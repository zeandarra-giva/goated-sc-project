import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { BarChart, HBars, Icon, Kpi, LineChart, Seg, Tabs, copyText } from '../components/ui.jsx'
import { ANALYSTS, ASSIGNMENT_GROUPS, DAY, RES_GOAL_H, ROOT_CAUSES, avg, byId, fmtDate, fmtH, initials } from '../data.js'

// ---------- Shared, deterministic analytics ----------
export const DIMENSIONS = {
  channel: { label: 'Channel', get: (h) => h.channel },
  businessApp: { label: 'Business app', get: (h) => h.businessApp },
  productGroup: { label: 'Product group', get: (h) => h.productGroup },
  assignmentGroup: { label: 'Assignment group', get: (h) => h.assignmentGroup },
  analyst: { label: 'Analyst', get: (h) => byId[h.analyst]?.name || '—' },
  cause: { label: 'Root cause', get: (h) => ROOT_CAUSES[h.code.split('-')[0]]?.label || 'Other' },
  code: { label: 'Resolution code', get: (h) => h.code },
  priority: { label: 'Priority', get: (h) => h.priority },
  week: { label: 'Week', get: (h) => fmtDate(weekOf(h.resolvedAt)), order: (h) => weekOf(h.resolvedAt) },
}
export const MEASURES = {
  count: { label: 'Ticket volume', fn: (r) => r.length, fmt: (v) => Math.round(v), better: 'none' },
  res: { label: 'Avg RES MTTR', fn: (r) => avg(r.map((x) => x.resH)), fmt: fmtH, better: 'low' },
  eze: { label: 'Avg EZE MTTR', fn: (r) => avg(r.map((x) => x.ezeH)), fmt: fmtH, better: 'low' },
  lost: { label: 'Avg lost time', fn: (r) => avg(r.map((x) => x.lostH)), fmt: fmtH, better: 'low' },
  sla: { label: 'SLA attainment', fn: (r) => r.filter((x) => x.slaMet).length / Math.max(1, r.length), fmt: (v) => `${Math.round(v * 100)}%`, better: 'high' },
  fcr: { label: 'FCR rate', fn: (r) => r.filter((x) => x.fcr).length / Math.max(1, r.length), fmt: (v) => `${Math.round(v * 100)}%`, better: 'high' },
  transfers: { label: 'Transfer rate', fn: (r) => r.filter((x) => x.transfers > 0).length / Math.max(1, r.length), fmt: (v) => `${Math.round(v * 100)}%`, better: 'low' },
  goal: { label: `Resolved < ${RES_GOAL_H}h`, fn: (r) => r.filter((x) => x.resH < RES_GOAL_H).length / Math.max(1, r.length), fmt: (v) => `${Math.round(v * 100)}%`, better: 'high' },
}
function weekOf(ts) {
  const d = new Date(ts); const day = (d.getDay() + 6) % 7
  d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return d.getTime()
}
export function aggregate(rows, dim, measure) {
  const groups = {}
  const order = {}
  rows.forEach((r) => {
    const k = DIMENSIONS[dim].get(r)
    ;(groups[k] = groups[k] || []).push(r)
    if (DIMENSIONS[dim].order) order[k] = DIMENSIONS[dim].order(r)
  })
  const out = Object.entries(groups).map(([label, rs]) => ({ label, value: MEASURES[measure].fn(rs), n: rs.length }))
  return DIMENSIONS[dim].order ? out.sort((a, b) => order[a.label] - order[b.label]) : out.sort((a, b) => b.value - a.value)
}
const inWindow = (rows, now, days, prio) => rows.filter((h) => h.resolvedAt >= now - days * DAY && (!prio || prio === 'All' || h.priority === prio))
const qaScore = (h) => (['documentation', 'contactLogged', 'correctCode', 'validated'].filter((k) => h.qa[k]).length + (h.slaMet ? 1 : 0)) * 20

export default function Reports() {
  const [mode, setMode] = useState('insight')
  const [tab, setTab] = useState('perf')
  return (
    <>
      <div className="row">
        <Seg value={mode} onChange={setMode} options={[{ id: 'insight', label: 'Insights' }, { id: 'compare', label: 'Compare & generate' }]} />
        <span className="spacer" />
        <span className="pill plain"><Icon name="shield" size={12} />All analysis runs in your browser. No AI, no data leaves the machine.</span>
      </div>
      {mode === 'insight' ? (
        <>
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: 'perf', label: 'Performance', icon: 'chart' },
            { id: 'qa', label: 'Quality & coaching', icon: 'check' },
            { id: 'explore', label: 'Explorer', icon: 'filter' },
            { id: 'search', label: 'Template search', icon: 'search' },
          ]} />
          {tab === 'perf' && <Performance />}
          {tab === 'qa' && <Quality />}
          {tab === 'explore' && <SelfServe />}
          {tab === 'search' && <TemplateSearch />}
        </>
      ) : <CompareGenerate />}
    </>
  )
}

function Performance() {
  const { state } = useStore()
  const [days, setDays] = useState(60)
  const rows = inWindow(state.history, state.now, days)
  const prev = state.history.filter((h) => h.resolvedAt < state.now - days * DAY && h.resolvedAt >= state.now - 2 * days * DAY)
  const weeks = aggregate(rows, 'week', 'count')
  const weekRes = aggregate(rows, 'week', 'res')
  const weekEze = aggregate(rows, 'week', 'eze')
  const delta = (m) => {
    const a = MEASURES[m].fn(rows), b = MEASURES[m].fn(prev)
    if (!prev.length || isNaN(b)) return null
    const d = a - b
    const good = MEASURES[m].better === 'low' ? d < 0 : d > 0
    const txt = m === 'res' || m === 'eze' ? `${d > 0 ? '+' : ''}${d.toFixed(1)}h` : m === 'count' ? `${d > 0 ? '+' : ''}${Math.round(d)}` : `${d > 0 ? '+' : ''}${Math.round(d * 100)} pts`
    return <span style={{ color: MEASURES[m].better === 'none' ? 'var(--ink-2)' : good ? 'var(--good)' : 'var(--crit)' }}>{txt} vs prior {days}d</span>
  }
  const causes = aggregate(rows, 'cause', 'count')
  const groups = ASSIGNMENT_GROUPS.map((g) => {
    const r = rows.filter((h) => h.assignmentGroup === g)
    return { g, n: r.length, res: MEASURES.res.fn(r), sla: MEASURES.sla.fn(r), tr: MEASURES.transfers.fn(r), fcr: MEASURES.fcr.fn(r), goal: MEASURES.goal.fn(r) }
  })
  const handovers = state.handovers.filter((h) => h.at >= state.now - days * DAY)
  const topCodes = aggregate(rows, 'code', 'count').slice(0, 6)
  return (
    <>
      <div className="row">
        <span className="section-title">Window</span>
        <Seg value={days} onChange={setDays} options={[{ id: 30, label: '30 days' }, { id: 60, label: '60 days' }, { id: 90, label: '90 days' }]} />
      </div>
      <section className="grid g-kpi">
        <Kpi label="Avg EZE MTTR" icon="clock" value={fmtH(MEASURES.eze.fn(rows))} foot={delta('eze')} />
        <Kpi label="Avg RES MTTR" icon="bolt" tone="azure" value={fmtH(MEASURES.res.fn(rows))} foot={delta('res')} />
        <Kpi label="SLA attainment" icon="shield" value={MEASURES.sla.fmt(MEASURES.sla.fn(rows))} foot={delta('sla')} state={MEASURES.sla.fn(rows) < 0.85 ? 'warn' : 'good'} />
        <Kpi label="Ticket volume" icon="doc" tone="ice" value={rows.length} foot={delta('count')} />
        <Kpi label="Transfer rate" icon="swap" tone="navy" value={MEASURES.transfers.fmt(MEASURES.transfers.fn(rows))} foot={delta('transfers')} />
      </section>
      <section className="grid g-2">
        <div className="card">
          <div className="card-h"><h3>MTTR by week</h3><span className="muted small">hours, one axis</span></div>
          <div className="card-b">
            <LineChart labels={weekRes.map((w) => w.label)} goal={RES_GOAL_H} unit="h" fmt={(v) => `${v.toFixed(1)}h`}
              series={[{ name: 'EZE MTTR', color: 'var(--s2)', values: weekEze.map((w) => w.value) }, { name: 'RES MTTR', color: 'var(--s1)', values: weekRes.map((w) => w.value) }]} />
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Ticket volume by week</h3><span className="muted small">resolved tickets</span></div>
          <div className="card-b"><BarChart labels={weeks.map((w) => w.label)} values={weeks.map((w) => w.value)} fmt={(v) => `${Math.round(v)} tickets`} /></div>
        </div>
      </section>
      <section className="grid g-2">
        <div className="card">
          <div className="card-h"><h3>Root causes</h3><span className="muted small">from resolution codes</span></div>
          <div className="card-b"><HBars rows={causes} fmt={(v) => v} /></div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Most used resolution codes</h3></div>
          <div className="card-b"><HBars rows={topCodes} color="var(--s3)" /></div>
        </div>
      </section>
      <section className="card">
        <div className="card-h"><h3>Assignment group performance</h3></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Group</th><th className="r">Volume</th><th className="r">Avg RES MTTR</th><th className="r">SLA attainment</th><th className="r">Resolved &lt; {RES_GOAL_H}h</th><th className="r">Transfer rate</th><th className="r">FCR</th></tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.g}>
                  <td><b>{g.g}</b></td><td className="r">{g.n}</td>
                  <td className="r" style={{ color: g.res >= RES_GOAL_H ? 'var(--crit)' : undefined }}>{fmtH(g.res)}</td>
                  <td className="r">{MEASURES.sla.fmt(g.sla)}</td><td className="r">{MEASURES.goal.fmt(g.goal)}</td>
                  <td className="r">{MEASURES.transfers.fmt(g.tr)}</td><td className="r">{MEASURES.fcr.fmt(g.fcr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="card-h"><h3>Shift handover signal</h3><span className="muted small">handover logs in this window, tied to the queue</span></div>
        <div className="card-b grid g-kpi">
          <Kpi label="Handovers logged" icon="clip" value={handovers.length} />
          <Kpi label="Handed over with open criticals" icon="alert" value={handovers.filter((h) => h.openCritical > 0).length} foot={`${Math.round((handovers.filter((h) => h.openCritical > 0).length / Math.max(1, handovers.length)) * 100)}% of shifts`} state="warn" />
          <Kpi label="Avg resolved per shift" icon="check" tone="azure" value={Math.round(avg(handovers.map((h) => h.resolved)) || 0)} />
          <Kpi label="Not yet acknowledged" icon="bell" tone="ice" value={handovers.filter((h) => !h.acknowledged).length} />
        </div>
      </section>
    </>
  )
}

function Quality() {
  const { state } = useStore()
  const [sel, setSel] = useState(null)
  const rows = inWindow(state.history, state.now, 30)
  const crit = [['documentation', 'Documentation'], ['contactLogged', 'Contact logged'], ['correctCode', 'Correct code'], ['validated', 'Validated']]
  const cards = ANALYSTS.filter((a) => a.role === 'Analyst').map((a) => {
    const r = rows.filter((h) => h.analyst === a.id)
    const rates = Object.fromEntries(crit.map(([k]) => [k, r.filter((h) => h.qa[k]).length / Math.max(1, r.length)]))
    rates.sla = MEASURES.sla.fn(r)
    const weakest = [...crit, ['sla', 'SLA met']].sort((x, y) => rates[x[0]] - rates[y[0]])[0]
    const score = Math.round(avg(r.map(qaScore)) || 0)
    return { a, r, score, rates, weakest, fcr: MEASURES.fcr.fn(r), tr: MEASURES.transfers.fn(r), res: MEASURES.res.fn(r) }
  }).sort((x, y) => x.score - y.score)
  const cur = cards.find((c) => c.a.id === sel)
  const COACH = {
    documentation: 'Walk through the resolution journey form together; aim for a note on every stage.',
    contactLogged: 'Log every customer touchpoint in the contact log, including voicemails.',
    correctCode: 'Review the resolution code library; pair on 3 tickets where the code was changed in QA.',
    validated: 'Confirm with the customer before resolving; use the validation step instead of closing on silence.',
    sla: 'Look at queue habits: pick up P1/P2 within 15 minutes and use At-risk alerts in notifications.',
  }
  return (
    <>
      <section className="card">
        <div className="card-h"><h3>QA rubric</h3><span className="muted small">Scored automatically on every resolved ticket · 20 points each</span></div>
        <div className="card-b row">
          {[...crit.map((c) => c[1]), 'SLA met'].map((c) => <span key={c} className="pill plain">{c}</span>)}
        </div>
      </section>
      <section className="grid g-3-1">
        <div className="card">
          <div className="card-h"><h3>Analyst scorecards</h3><span className="muted small">last 30 days · lowest first</span></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Analyst</th><th className="r">Tickets</th><th className="r">QA score</th><th className="r">SLA</th><th className="r">FCR</th><th className="r">Transfers</th><th className="r">RES MTTR</th><th>Coaching focus</th></tr></thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.a.id} className={`click ${sel === c.a.id ? 'sel' : ''}`} onClick={() => setSel(c.a.id)}>
                    <td className="nowrap"><span className="row tight"><span className="avatar sm">{initials(c.a.name)}</span>{c.a.name}</span></td>
                    <td className="r">{c.r.length}</td>
                    <td className="r"><span className={`pill ${c.score >= 85 ? 'good' : c.score >= 75 ? 'warn' : 'crit'}`}>{c.score}</span></td>
                    <td className="r">{MEASURES.sla.fmt(c.rates.sla)}</td>
                    <td className="r">{MEASURES.fcr.fmt(c.fcr)}</td>
                    <td className="r">{MEASURES.transfers.fmt(c.tr)}</td>
                    <td className="r">{fmtH(c.res)}</td>
                    <td className="nowrap small">{c.weakest[1]} ({Math.round(c.rates[c.weakest[0]] * 100)}%)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Coaching plan</h3></div>
          <div className="card-b stack lg">
            {!cur && <div className="muted small">Select an analyst to see where their score is lost and what to coach.</div>}
            {cur && (
              <>
                <div className="row"><span className="avatar">{initials(cur.a.name)}</span><div><b>{cur.a.name}</b><div className="muted small">{cur.a.group} · {cur.r.length} tickets</div></div></div>
                <HBars rows={[...crit, ['sla', 'SLA met']].map(([k, l]) => ({ label: l, value: cur.rates[k] * 100 }))} max={100} target={90} fmt={(v) => `${Math.round(v)}%`} />
                <div className="small muted">Marker shows the 90% team standard.</div>
                <div className="callout accent small"><Icon name="user" size={16} /><span><b>Focus: {cur.weakest[1]}.</b> {COACH[cur.weakest[0]]}</span></div>
                <div className="stack">
                  <div className="section-title">Tickets to review together</div>
                  {cur.r.slice().sort((a, b) => qaScore(a) - qaScore(b)).slice(0, 4).map((h) => (
                    <div key={h.id} className="list-row small"><span className="mono">{h.id}</span><span className="code-chip">{h.code}</span><span className="spacer" /><span className={`pill ${qaScore(h) >= 80 ? 'good' : 'warn'}`}>{qaScore(h)}</span></div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function ResultView({ rows, dim, measure, title }) {
  const data = aggregate(rows, dim, measure)
  const M = MEASURES[measure]
  return (
    <div className="grid g-2">
      <div className="card">
        <div className="card-h"><h3>{title || `${M.label} by ${DIMENSIONS[dim].label.toLowerCase()}`}</h3><span className="muted small">{rows.length} tickets</span></div>
        <div className="card-b">
          {dim === 'week'
            ? <LineChart labels={data.map((d) => d.label)} series={[{ name: M.label, color: 'var(--s1)', values: data.map((d) => d.value) }]} fmt={M.fmt} />
            : <HBars rows={data.slice(0, 12)} fmt={M.fmt} />}
          {!data.length && <div className="empty">No tickets match.</div>}
        </div>
      </div>
      <div className="card">
        <div className="card-h"><h3>Table view</h3></div>
        <div className="tbl-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>{DIMENSIONS[dim].label}</th><th className="r">{M.label}</th><th className="r">Tickets</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td className="r">{M.fmt(d.value)}</td><td className="r">{d.n}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SelfServe() {
  const { state } = useStore()
  const [q, setQ] = useState({ dim: 'businessApp', measure: 'res', days: '30', prio: 'All', channel: 'All', fcr: 'All' })
  const set = (k) => (e) => setQ({ ...q, [k]: e.target.value })
  const rows = inWindow(state.history, state.now, Number(q.days), q.prio).filter((h) => (q.channel === 'All' || h.channel === q.channel) && (q.fcr === 'All' || (q.fcr === 'Yes') === h.fcr))
  return (
    <>
      <div className="callout small"><Icon name="filter" size={16} /><span><b>Explorer · Tier 1.</b> Pick a dimension, a measure and filters to answer a question nobody pre-built. Computed in the browser from Ticket Explorer records.</span></div>
      <section className="card"><div className="card-b form-grid" style={{ paddingTop: 16 }}>
        <label className="field"><span>Dimension</span><select id="ss-dim" className="in" value={q.dim} onChange={set('dim')}>{Object.entries(DIMENSIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <label className="field"><span>Measure</span><select id="ss-measure" className="in" value={q.measure} onChange={set('measure')}>{Object.entries(MEASURES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <label className="field"><span>Window</span><select id="ss-days" className="in" value={q.days} onChange={set('days')}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
        <label className="field"><span>Priority</span><select id="ss-prio" className="in" value={q.prio} onChange={set('prio')}>{['All', 'P1', 'P2', 'P3', 'P4'].map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="field"><span>Channel</span><select id="ss-ch" className="in" value={q.channel} onChange={set('channel')}><option>All</option>{['Phone', 'Chat', 'Email', 'Self-service portal', 'Monitoring alert'].map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="field"><span>FCR</span><select id="ss-fcr" className="in" value={q.fcr} onChange={set('fcr')}><option>All</option><option>Yes</option><option>No</option></select></label>
      </div></section>
      <ResultView rows={rows} dim={q.dim} measure={q.measure} />
    </>
  )
}

// ---------- Template Search (Tier 2): keyword → deterministic query template ----------
const DIM_WORDS = [
  [/channel|phone|chat|email|portal/, 'channel'], [/\bapps?\b|application|system/, 'businessApp'], [/product/, 'productGroup'],
  [/group|team|queue/, 'assignmentGroup'], [/analyst|who|person|people|agent/, 'analyst'], [/root cause|cause|why/, 'cause'],
  [/code|fix|resolution/, 'code'], [/priority|severity/, 'priority'], [/trend|week|over time|weekly/, 'week'],
]
const MEASURE_WORDS = [
  [/lost|waiting|wait/, 'lost'], [/eze|end.to.end/, 'eze'], [/mttr|slow|fast|resolution time|time to resolve|duration/, 'res'],
  [/fcr|first contact/, 'fcr'], [/sla|breach|attainment/, 'sla'], [/transfer|bounce|reassign/, 'transfers'],
  [/goal|under 4|<\s*4/, 'goal'], [/volume|count|how many|most|number/, 'count'],
]
const TEMPLATES = {
  trend: { id: 'T-01', name: 'Trend over time', test: /trend|over time|weekly|by week/ },
  rank: { id: 'T-02', name: 'Top / bottom ranking', test: /top|worst|slowest|best|highest|lowest|most|least/ },
  breakdown: { id: 'T-03', name: 'Breakdown by dimension', test: /./ },
}
export function parseQuery(text) {
  const s = text.toLowerCase()
  const tpl = Object.entries(TEMPLATES).find(([, t]) => t.test.test(s))[0]
  let measure = MEASURE_WORDS.find(([re]) => re.test(s))?.[1] || 'count'
  let dim = DIM_WORDS.find(([re, d]) => re.test(s) && !(d === 'code' && /resolution time/.test(s)))?.[1] || 'businessApp'
  if (tpl === 'trend') dim = 'week'
  const nDays = s.match(/last (\d+) ?(day|week|month)/)
  let days = 30
  if (nDays) days = Number(nDays[1]) * (nDays[2] === 'week' ? 7 : nDays[2] === 'month' ? 30 : 1)
  else if (/this week|past week|7 ?d/.test(s)) days = 7
  else if (/quarter|90/.test(s)) days = 90
  const prio = s.match(/\bp([1-4])\b/)?.[1]
  const topN = Number(s.match(/top (\d+)/)?.[1] || (tpl === 'rank' ? 5 : 0))
  const asc = /\b(best|fastest|lowest|least)\b/.test(s) && MEASURES[measure].better !== 'high'
  return { tpl, measure, dim, days: Math.min(90, days), prio: prio ? `P${prio}` : 'All', topN, asc }
}

function TemplateSearch() {
  const { state } = useStore()
  const [text, setText] = useState('slowest business apps by MTTR last 30 days')
  const [run, setRun] = useState(text)
  const p = useMemo(() => parseQuery(run), [run])
  let rows = inWindow(state.history, state.now, p.days, p.prio)
  const tplInfo = TEMPLATES[p.tpl]
  const examples = ['slowest business apps by MTTR last 30 days', 'top 5 root causes this quarter', 'FCR by channel', 'SLA attainment trend for P1', 'which analyst has the most transfers', 'lost time by assignment group last 2 weeks', 'most used resolution codes last 7 days']
  let data = aggregate(rows, p.dim, p.measure)
  if (p.tpl === 'rank') data = (p.asc ? data.slice().reverse() : data).slice(0, p.topN || 5)
  return (
    <>
      <div className="callout small"><Icon name="search" size={16} /><span><b>Template Search · Tier 2.</b> Type a question. Keywords map to a fixed query template, so the same words always give the same answer. Rules only until an approved AI gateway exists.</span></div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setRun(text) }}>
        <input id="ts-q" className="in" style={{ flex: 1, minWidth: 220, fontSize: 15, padding: '10px 12px' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. slowest apps by MTTR last 30 days" />
        <button className="btn primary" type="submit"><Icon name="search" size={15} />Run</button>
      </form>
      <div className="row">{examples.map((x) => <button key={x} className="btn sm" onClick={() => { setText(x); setRun(x) }}>{x}</button>)}</div>
      <section className="card" style={{ padding: 14 }}>
        <div className="row small">
          <span className="eyebrow">Matched</span>
          <span className="code-chip">{tplInfo.id}</span><b>{tplInfo.name}</b>
          <span className="pill plain">dimension: {DIMENSIONS[p.dim].label}</span>
          <span className="pill plain">measure: {MEASURES[p.measure].label}</span>
          <span className="pill plain">window: {p.days}d</span>
          {p.prio !== 'All' && <span className="pill plain">priority: {p.prio}</span>}
          {p.tpl === 'rank' && <span className="pill plain">{p.asc ? 'bottom' : 'top'} {p.topN || 5}</span>}
        </div>
      </section>
      {p.tpl === 'rank' ? (
        <div className="card">
          <div className="card-h"><h3>{p.asc ? 'Bottom' : 'Top'} {p.topN || 5} · {DIMENSIONS[p.dim].label} by {MEASURES[p.measure].label}</h3><span className="muted small">{rows.length} tickets</span></div>
          <div className="card-b"><HBars rows={data} fmt={MEASURES[p.measure].fmt} /></div>
        </div>
      ) : <ResultView rows={rows} dim={p.dim} measure={p.measure} />}
    </>
  )
}

// ---------- Compare & generate ----------
function CompareGenerate() {
  const { state, dispatch } = useStore()
  const [by, setBy] = useState('period')
  const [a, setA] = useState('Service Desk L2')
  const [b, setB] = useState('Apps Support')
  const [tpl, setTpl] = useState('weekly')
  const [sections, setSections] = useState({ kpis: true, causes: true, groups: true, qa: true, handover: true })
  const now = state.now
  const setsFor = () => {
    if (by === 'period') return [
      { name: 'Last 30 days', rows: state.history.filter((h) => h.resolvedAt >= now - 30 * DAY) },
      { name: 'Prior 30 days', rows: state.history.filter((h) => h.resolvedAt < now - 30 * DAY && h.resolvedAt >= now - 60 * DAY) },
    ]
    const key = by === 'group' ? 'assignmentGroup' : 'channel'
    return [{ name: a, rows: state.history.filter((h) => h[key] === a) }, { name: b, rows: state.history.filter((h) => h[key] === b) }]
  }
  const [A, B] = setsFor()
  const opts = by === 'group' ? ASSIGNMENT_GROUPS : ['Phone', 'Chat', 'Email', 'Self-service portal', 'Monitoring alert']
  const metrics = ['count', 'res', 'eze', 'lost', 'sla', 'fcr', 'transfers', 'goal']

  const days = tpl === 'weekly' ? 7 : tpl === 'monthly' ? 30 : 30
  const R = state.history.filter((h) => h.resolvedAt >= now - days * DAY)
  const tplName = { weekly: 'Weekly service operations report', monthly: 'Monthly SLA review', coaching: 'Team coaching pack' }[tpl]
  const lines = [
    `${tplName}`,
    `Period: ${fmtDate(now - days * DAY)} – ${fmtDate(now)} · ${R.length} resolved tickets`,
    sections.kpis && `\nHeadline\n- Avg EZE MTTR ${fmtH(MEASURES.eze.fn(R))}, RES MTTR ${fmtH(MEASURES.res.fn(R))}\n- SLA attainment ${MEASURES.sla.fmt(MEASURES.sla.fn(R))}, resolved under ${RES_GOAL_H}h ${MEASURES.goal.fmt(MEASURES.goal.fn(R))}\n- FCR ${MEASURES.fcr.fmt(MEASURES.fcr.fn(R))}, transfer rate ${MEASURES.transfers.fmt(MEASURES.transfers.fn(R))}`,
    sections.causes && `\nTop root causes\n${aggregate(R, 'cause', 'count').slice(0, 4).map((c) => `- ${c.label}: ${c.value}`).join('\n')}`,
    sections.groups && `\nAssignment groups\n${ASSIGNMENT_GROUPS.map((g) => { const r = R.filter((h) => h.assignmentGroup === g); return `- ${g}: ${r.length} tickets, RES ${fmtH(MEASURES.res.fn(r))}, SLA ${MEASURES.sla.fmt(MEASURES.sla.fn(r))}` }).join('\n')}`,
    sections.qa && `\nQuality\n- Average QA score ${Math.round(avg(R.map(qaScore)) || 0)}/100\n- Lowest criterion: ${['documentation', 'contactLogged', 'correctCode', 'validated'].map((k) => [k, R.filter((h) => h.qa[k]).length / Math.max(1, R.length)]).sort((x, y) => x[1] - y[1])[0][0]}`,
    sections.handover && `\nShift handovers\n- ${state.handovers.filter((h) => h.at >= now - days * DAY).length} handovers, ${state.handovers.filter((h) => h.at >= now - days * DAY && h.openCritical).length} with open critical incidents`,
  ].filter(Boolean).join('\n')

  return (
    <>
      <section className="card">
        <div className="card-h"><h3>Compare</h3>
          <span className="spacer" />
          <Seg value={by} onChange={(v) => { setBy(v); if (v === 'group') { setA('Service Desk L2'); setB('Apps Support') } if (v === 'channel') { setA('Phone'); setB('Chat') } }} options={[{ id: 'period', label: 'Period' }, { id: 'group', label: 'Assignment group' }, { id: 'channel', label: 'Channel' }]} />
        </div>
        <div className="card-b stack lg">
          {by !== 'period' && (
            <div className="row">
              <select id="cmp-a" className="in" value={a} onChange={(e) => setA(e.target.value)} aria-label="Compare A">{opts.map((o) => <option key={o}>{o}</option>)}</select>
              <span className="muted">vs</span>
              <select id="cmp-b" className="in" value={b} onChange={(e) => setB(e.target.value)} aria-label="Compare B">{opts.map((o) => <option key={o}>{o}</option>)}</select>
            </div>
          )}
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Measure</th><th className="r">{A.name}</th><th className="r">{B.name}</th><th className="r">Difference</th></tr></thead>
              <tbody>
                {metrics.map((m) => {
                  const va = MEASURES[m].fn(A.rows), vb = MEASURES[m].fn(B.rows)
                  const d = va - vb
                  const better = MEASURES[m].better === 'none' ? null : MEASURES[m].better === 'low' ? d < 0 : d > 0
                  const dtxt = ['res', 'eze', 'lost'].includes(m) ? `${d > 0 ? '+' : ''}${d.toFixed(1)}h` : m === 'count' ? `${d > 0 ? '+' : ''}${Math.round(d)}` : `${d > 0 ? '+' : ''}${Math.round(d * 100)} pts`
                  return (
                    <tr key={m}>
                      <td>{MEASURES[m].label}</td>
                      <td className="r">{MEASURES[m].fmt(va)}</td>
                      <td className="r">{MEASURES[m].fmt(vb)}</td>
                      <td className="r"><span className={`pill ${better == null || Math.abs(d) < 1e-9 ? 'plain' : better ? 'good' : 'crit'}`}>{dtxt}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="small muted">Green means {A.name} is better on that measure.</div>
        </div>
      </section>
      <section className="grid g-1-2">
        <div className="card">
          <div className="card-h"><h3>Generate a report</h3></div>
          <div className="card-b stack lg">
            <label className="field"><span>Template</span>
              <select id="gen-tpl" className="in" value={tpl} onChange={(e) => setTpl(e.target.value)}>
                <option value="weekly">Weekly service operations report</option><option value="monthly">Monthly SLA review</option><option value="coaching">Team coaching pack</option>
              </select>
            </label>
            <div className="stack">
              <span className="section-title">Sections</span>
              {[['kpis', 'Headline KPIs'], ['causes', 'Root causes'], ['groups', 'Assignment groups'], ['qa', 'Quality & coaching'], ['handover', 'Shift handovers']].map(([k, l]) => (
                <label key={k} className="check small"><input type="checkbox" checked={sections[k]} onChange={(e) => setSections({ ...sections, [k]: e.target.checked })} />{l}</label>
              ))}
            </div>
            <button className="btn primary" onClick={() => copyText(lines, dispatch)}><Icon name="copy" size={15} />Copy report text</button>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Preview</h3><span className="muted small">built from Ticket Explorer records</span></div>
          <div className="card-b"><pre className="mono" style={{ whiteSpace: 'pre-wrap', margin: 0, background: 'var(--surface-2)', padding: 14, borderRadius: 8, fontSize: 12.5, lineHeight: 1.6 }}>{lines}</pre></div>
        </div>
      </section>
    </>
  )
}
