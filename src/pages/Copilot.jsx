import { useEffect, useRef, useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { useNav } from '../App.jsx'
import { Drawer, Icon, InfoTip, Tabs, copyText } from '../components/ui.jsx'
import { DocText, Inline } from '../components/Doc.jsx'
import { GUARDRAILS, INSIGHT_TYPES, MODELS, SUGGESTIONS, TOOLS, answer, computeInsights, toneRank } from '../copilot.js'
import { byId, fmtDateTime, fmtTime, slaInfo } from '../data.js'

let seq = 0
const newId = (p) => `${p}-${Date.now().toString(36)}-${++seq}`
// Route-driven conversations (a ticket or insight handed over from another
// page) start once, even when effects run twice.
const started = new Set()

const modelLabel = (id) => MODELS.find((m) => m.id === id)?.label || id
export const canUseCopilot = (state) => state.role === 'lead' || state.copilot.config.access.analysts

// Ask a question in a thread. The answer is computed now and revealed after
// its tool calls have "run", so the steps show as they happen.
export function useCopilotAsk() {
  const { state, dispatch } = useStore()
  const ref = useRef(state)
  ref.current = state
  return (threadId, text, ctx) => {
    const st = ref.current
    let c = ctx || st.copilot.threads.find((t) => t.id === threadId)?.ctx || {}
    // Naming an open ticket makes it the conversation's context for follow-ups.
    const named = text.toUpperCase().match(/INC\d{6,}/)?.[0]
    if (named && named !== c.ticketId && st.tickets.some((t) => t.id === named)) {
      c = { ticketId: named }
      dispatch({ type: 'copilotCtx', id: threadId, ctx: c })
    }
    const ans = answer(st, text, c)
    const mid = newId('m')
    dispatch({ type: 'copilotAsk', id: threadId, mid, text, answer: ans, title: c.insight?.title })
    setTimeout(() => dispatch({ type: 'copilotDone', id: threadId, mid, q: text }), 450 + ans.steps.length * 260)
  }
}

// Creates a thread for a ticket or an insight and asks its first question.
function useStartThread() {
  const { dispatch } = useStore()
  const ask = useCopilotAsk()
  return (id, { ticketId, insight }) => {
    if (started.has(id)) return
    started.add(id)
    const ctx = ticketId ? { ticketId } : { insight }
    dispatch({ type: 'copilotThread', thread: { id, title: insight ? insight.title : ticketId, ctx, at: Date.now() } })
    ask(id, insight ? insight.prompt : `How do I resolve ${ticketId}?`, ctx)
  }
}

export default function Copilot({ route }) {
  const { state, dispatch } = useStore()
  const cfg = state.copilot.config
  const [tab, setTab] = useState(route.tab || 'ask')
  const [active, setActive] = useState(route.thread || state.copilot.threads[0]?.id || null)
  const start = useStartThread()
  const ask = useCopilotAsk()
  const insights = computeInsights(state)

  useEffect(() => {
    if (route.ticket || route.insight) {
      const id = 'th-' + route.key
      start(id, { ticketId: route.ticket, insight: route.insight })
      setActive(id)
      setTab('ask')
    } else if (route.thread) { setActive(route.thread); setTab('ask') } else if (route.tab) setTab(route.tab)
  }, [route.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const newThread = (ctx = {}) => {
    const id = newId('th')
    dispatch({ type: 'copilotThread', thread: { id, title: 'New conversation', ctx, at: Date.now() } })
    setActive(id)
    return id
  }
  const askInsight = (ins) => {
    const id = newId('th')
    start(id, { insight: ins })
    setActive(id)
    setTab('ask')
  }

  if (!canUseCopilot(state)) {
    return <div className="callout warn"><Icon name="lock" size={16} /><span><b>Copilot is turned off for analysts.</b> Your team lead controls this in Copilot settings.</span></div>
  }

  return (
    <>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'ask', label: 'Ask', icon: 'spark' },
        { id: 'insights', label: 'Insights', icon: 'bolt', count: cfg.insights.enabled ? insights.length : null },
        { id: 'settings', label: 'Configure', icon: 'gear' },
      ]} />
      {tab === 'ask' && (
        <section className="grid g-3-1">
          <div className="card cp-card">
            <div className="card-h">
              <h3>{cfg.name}</h3>
              <span className="pill accent"><Icon name="spark" size={12} />{modelLabel(cfg.model)}</span>
              <span className="spacer" />
              <button className="btn sm" onClick={() => newThread()}><Icon name="plus" size={14} />New chat</button>
              <HowItWorks />
            </div>
            <CopilotChat threadId={active} onNeedThread={newThread} onAsk={ask} />
          </div>
          <div className="stack lg">
            <ContextCard threadId={active} onNeedThread={newThread} />
            <ThreadList active={active} onPick={setActive} />
            {cfg.insights.enabled && insights.length > 0 && (
              <div className="card">
                <div className="card-h"><h3>Top insights</h3><span className="spacer" /><button className="btn ghost sm" onClick={() => setTab('insights')}>See all</button></div>
                <div className="card-b stack">
                  {[...insights].sort((a, b) => toneRank[a.tone] - toneRank[b.tone]).slice(0, 3).map((ins) => (
                    <button key={ins.id} className="cp-thread" onClick={() => askInsight(ins)}>
                      <span className={`ins-ic sm ${ins.tone}`}><Icon name={ins.icon} size={14} /></span>
                      <span className="stack" style={{ gap: 0, minWidth: 0 }}><b className="small">{ins.title}</b><span className="muted small">Ask about this</span></span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      {tab === 'insights' && <InsightsTab insights={insights} onAsk={askInsight} />}
      {tab === 'settings' && <Configure />}
    </>
  )
}

// ---------- Chat ----------
export function CopilotChat({ threadId, onNeedThread, onAsk }) {
  const { state, dispatch } = useStore()
  const cfg = state.copilot.config
  const thread = state.copilot.threads.find((t) => t.id === threadId)
  const [text, setText] = useState('')
  const log = useRef(null)
  const n = thread?.messages.length || 0
  const busy = thread?.messages.some((m) => m.pending)
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }) }, [n, busy, threadId])

  const send = (q) => {
    const v = (q ?? text).trim()
    if (!v || busy) return
    const id = threadId && thread ? threadId : onNeedThread()
    onAsk(id, v)
    setText('')
  }
  const ctx = thread?.ctx || {}
  const ticket = ctx.ticketId && (state.tickets.find((t) => t.id === ctx.ticketId) || state.history.find((h) => h.id === ctx.ticketId))
  const suggestions = ctx.ticketId ? [`How do I resolve ${ctx.ticketId}?`, 'Draft a customer update', 'What if the fix doesn\'t work?', 'Show similar incidents'] : SUGGESTIONS[state.role]

  return (
    <div className="cp-wrap">
      <div className="cp-log" ref={log} aria-live="polite">
        {!n && (
          <div className="cp-empty">
            <span className="cp-av lg"><Icon name="spark" size={22} /></span>
            <h3>What are you working on?</h3>
            <p className="muted small">Ask about a ticket, a runbook, the queue or a report. Answers come from published knowledge base pages and live Scope data, with sources.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              {suggestions.map((s) => <button key={s} className="btn sm" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {thread?.messages.map((m) => m.role === 'user'
          ? <div key={m.id} className="cp-user">{m.text}</div>
          : <AnswerView key={m.id} msg={m} onAsk={send} last={m.id === thread.messages[thread.messages.length - 1].id} />)}
      </div>
      <form className="cp-compose" onSubmit={(e) => { e.preventDefault(); send() }}>
        {(ticket || ctx.insight) && (
          <div className="row tight">
            <span className="muted small">Context</span>
            <span className="pill plain">
              <Icon name={ticket ? 'clip' : 'bolt'} size={12} />
              {ticket ? `${ticket.id} · ${ticket.desc.slice(0, 40)}${ticket.desc.length > 40 ? '…' : ''}` : ctx.insight.title}
              <button type="button" className="pill-x" aria-label="Remove context" onClick={() => dispatch({ type: 'copilotCtx', id: threadId, ctx: {} })}><Icon name="x" size={11} /></button>
            </span>
          </div>
        )}
        <div className="cp-input">
          <label className="sr-only" htmlFor={`cp-q-${threadId || 'new'}`}>Ask Copilot</label>
          <textarea id={`cp-q-${threadId || 'new'}`} className="in" rows={1} value={text} placeholder={ticket ? `Ask about ${ticket.id}…` : 'Ask about a ticket, runbook, the queue or a metric…'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          <button className="icon-btn cp-send" type="submit" disabled={!text.trim() || busy} aria-label="Send"><Icon name="send" size={17} /></button>
        </div>
        <span className="muted small">{modelLabel(cfg.model)} · searches {cfg.kbIds.length} knowledge base{cfg.kbIds.length === 1 ? '' : 's'} · proposes, never acts. Prototype: answers are composed in your browser.</span>
      </form>
    </div>
  )
}

function PendingSteps({ steps }) {
  const [k, setK] = useState(0)
  useEffect(() => { const t = setInterval(() => setK((x) => Math.min(steps.length, x + 1)), 260); return () => clearInterval(t) }, [steps.length])
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="row tight muted small"><span className="dot live" style={{ background: 'var(--accent)' }} />Working…</span>
      {steps.slice(0, k + 1).map((s, i) => <span key={i} className="cp-step"><span className="mono">{s.tool}</span> <span className="muted">{s.args}</span></span>)}
    </div>
  )
}

function AnswerView({ msg, onAsk, last }) {
  const { state, dispatch } = useStore()
  const { nav } = useNav()
  const [done, setDone] = useState({})
  const a = msg.answer
  const openSource = (s) => {
    if (s.kind === 'kb' || s.kind === 'data') nav('kb', { page: s.id })
    else if (s.kind === 'ticket') state.tickets.some((t) => t.id === s.id) ? nav('home', { ticket: s.id }) : nav('explorer')
    else if (s.kind === 'metric') nav('reports')
    else nav('home')
  }
  const run = (x, i) => {
    if (x.kind === 'nav') nav(x.page, x.opts || {})
    else if (x.kind === 'copy') copyText(x.text, dispatch)
    else if (x.kind === 'ask') onAsk(x.text)
    else { dispatch(x.action); setDone({ ...done, [i]: true }) }
  }
  return (
    <div className="cp-msg">
      <span className="cp-av"><Icon name="spark" size={15} /></span>
      <div className="cp-body">
        {msg.pending ? <PendingSteps steps={a.steps} /> : (
          <>
            {a.parts.map((p, i) => <Part key={i} p={p} />)}
            {a.sources.length > 0 && (
              <div className="row tight">
                <span className="muted small" style={{ marginRight: 4 }}>Sources</span>
                {a.sources.map((s) => (
                  <button key={s.kind + s.id} className="cp-src" onClick={() => openSource(s)} title={s.sub}>
                    <Icon name={{ kb: 'doc', data: 'table', ticket: 'clip', metric: 'chart', queue: 'refresh' }[s.kind]} size={12} />{s.label}<span className="muted">· {s.sub}</span>
                  </button>
                ))}
              </div>
            )}
            {a.actions.length > 0 && (
              <div className="row">
                {a.actions.map((x, i) => (
                  <button key={i} className={`btn sm ${x.primary ? 'primary' : ''}`} disabled={done[i]} onClick={() => run(x, i)}>
                    <Icon name={done[i] ? 'check' : x.icon} size={14} />{done[i] ? 'Sent for approval' : x.label}
                  </button>
                ))}
              </div>
            )}
            <details className="cp-steps">
              <summary>{a.steps.length} tool call{a.steps.length === 1 ? '' : 's'} · {modelLabel(a.model)} · {fmtTime(a.at)}</summary>
              <div className="stack" style={{ gap: 4, marginTop: 6 }}>
                {a.steps.map((s, i) => (
                  <span key={i} className="cp-step">
                    <Icon name={s.ok ? 'check' : 'alert'} size={12} />
                    <span><span className="mono">{s.tool}</span>(<span className="muted">{s.args}</span>) → <span style={{ color: s.ok ? undefined : 'var(--crit)' }}>{s.result}</span></span>
                  </span>
                ))}
              </div>
            </details>
            {last && a.followups.length > 0 && (
              <div className="row">{a.followups.map((f) => <button key={f} className="btn ghost sm cp-follow" onClick={() => onAsk(f)}><Icon name="arrowR" size={13} />{f}</button>)}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Part({ p }) {
  if (p.t === 'p') return <p><Inline text={p.text} /></p>
  if (p.t === 'h') return <h4>{p.text}</h4>
  if (p.t === 'ul') return <ul>{p.items.map((x, i) => <li key={i}><Inline text={x} /></li>)}</ul>
  if (p.t === 'ol') return <ol>{p.items.map((x, i) => <li key={i}><Inline text={x} /></li>)}</ol>
  if (p.t === 'note') return <div className={`callout small ${p.tone}`}><Icon name={p.tone === 'crit' ? 'alert' : p.tone === 'good' ? 'check' : 'info'} size={15} /><span><Inline text={p.text} /></span></div>
  if (p.t === 'quote') return <div className="cp-quote"><span className="cp-quote-h"><Icon name="doc" size={12} />{p.title} › {p.heading}</span><DocText text={p.text} /></div>
  if (p.t === 'draft') return <pre className="cp-draft">{p.text}</pre>
  if (p.t === 'table') return (
    <div className="tbl-wrap cp-table">
      <table className="tbl"><thead><tr>{p.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{p.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? 'nowrap' : ''}>{/^(INC|[A-Z]{3}-[A-Z]{2,4}-\d{2}$)/.test(c) ? <span className="mono">{c}</span> : c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
  return null
}

function HowItWorks() {
  const { state } = useStore()
  const cfg = state.copilot.config
  return (
    <InfoTip title="How Copilot answers">
      <span>Copilot looks things up; it isn't trained on your data.</span>
      <ol style={{ margin: 0, paddingLeft: 18 }} className="stack">
        <li><b>Scope gathers the context:</b> your role, the ticket you attached, and the settings on the Configure tab.</li>
        <li><b>The model</b> ({modelLabel(cfg.model)}, through the approved AI gateway) reads the question and decides which tools to call: <span className="mono">search_knowledge_base</span>, <span className="mono">query_data</span>, <span className="mono">get_queue</span>, <span className="mono">get_metrics</span>.</li>
        <li><b>Every tool call goes through Scope's API</b> with your permissions. Copilot never writes to ServiceNow. Fixes go to a team lead and drafts are copied by you.</li>
        <li><b>Search is retrieval:</b> when a page is published it's split into chunks and indexed. Only the matching passages from linked, published pages reach the model.</li>
        <li><b>Before the answer is shown,</b> Scope applies the guardrails: sources attached, failed lookups reported as failures, numbers taken from live tools.</li>
      </ol>
      <div className="callout small"><Icon name="shield" size={16} /><span><b>Prototype:</b> answers are composed in your browser by rules that follow the same steps. No data leaves the machine.</span></div>
    </InfoTip>
  )
}

function ContextCard({ threadId, onNeedThread }) {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const thread = state.copilot.threads.find((t) => t.id === threadId)
  const cur = thread?.ctx?.ticketId || ''
  const open = state.tickets.filter((t) => t.state !== 'Resolved')
  const mine = open.filter((t) => t.assignedTo === me.id)
  const others = open.filter((t) => t.assignedTo !== me.id)
  const set = (id) => {
    const tid = thread ? threadId : onNeedThread()
    dispatch({ type: 'copilotCtx', id: tid, ctx: id ? { ticketId: id } : {} })
  }
  const t = open.find((x) => x.id === cur)
  const sla = t && slaInfo(t, state.now)
  return (
    <div className="card">
      <div className="card-h"><h3>Ticket context</h3></div>
      <div className="card-b stack">
        <label className="field"><span>Attach a ticket to this conversation</span>
          <select id="cp-ctx" className="in" value={cur} onChange={(e) => set(e.target.value)}>
            <option value="">No ticket</option>
            {mine.length > 0 && <optgroup label="My work queue">{mine.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.priority} · {x.desc.slice(0, 38)}</option>)}</optgroup>}
            {state.role === 'lead' && <optgroup label="Team queue">{others.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.priority} · {x.desc.slice(0, 38)}</option>)}</optgroup>}
          </select>
        </label>
        {t ? (
          <div className="small ink2">{t.businessApp} · {t.priority} · {sla.status} · {t.assignedTo ? byId[t.assignedTo].name : 'Unassigned'}</div>
        ) : <span className="muted small">With a ticket attached, Copilot reads its SLA, history and runbook for every question.</span>}
      </div>
    </div>
  )
}

function ThreadList({ active, onPick }) {
  const { state } = useStore()
  const threads = state.copilot.threads
  return (
    <div className="card">
      <div className="card-h"><h3>Conversations</h3><span className="muted small">this session</span></div>
      <div className="card-b stack" style={{ gap: 2 }}>
        {!threads.length && <span className="muted small">Your conversations appear here.</span>}
        {threads.slice(0, 8).map((t) => (
          <button key={t.id} className="cp-thread" aria-current={t.id === active ? 'true' : undefined} onClick={() => onPick(t.id)}>
            <Icon name={t.ctx?.ticketId ? 'clip' : t.ctx?.insight ? 'bolt' : 'spark'} size={14} />
            <span className="stack" style={{ gap: 0, minWidth: 0, flex: 1 }}>
              <span className="cp-thread-t">{t.title}</span>
              <span className="muted small">{t.messages.filter((m) => m.role === 'user').length} questions · {fmtTime(t.at)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- Insights ----------
const TONE_LABEL = { crit: 'Act now', warn: 'Watch', good: 'On track', accent: 'Info' }

export function InsightCard({ ins, onAsk }) {
  return (
    <div className="ins">
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className={`ins-ic ${ins.tone}`}><Icon name={ins.icon} size={16} /></span>
        <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
          <span className="row tight"><span className={`pill ${ins.tone === 'accent' ? 'accent' : ins.tone}`}>{TONE_LABEL[ins.tone]}</span><span className="muted small">{ins.source}</span></span>
          <h4>{ins.title}</h4>
        </span>
        <span className="ins-stat num" title={ins.statLabel}>{ins.stat}<small>{ins.statLabel}</small></span>
      </div>
      <p className="small ink2">{ins.detail}</p>
      {onAsk && (
        <div className="ins-foot">
          <button className="btn sm" onClick={() => onAsk(ins)}><Icon name="spark" size={14} />Ask Copilot</button>
          <span className="muted small ins-q">“{ins.prompt}”</span>
        </div>
      )}
    </div>
  )
}

function InsightsTab({ insights, onAsk }) {
  const { state, dispatch } = useStore()
  const { nav } = useNav()
  const cfg = state.copilot.config
  const misses = state.copilot.misses
  if (!cfg.insights.enabled) return <div className="callout"><Icon name="info" size={16} /><span>Automated insights are turned off. A team lead can turn them on in the Configure tab.</span></div>
  return (
    <>
      <section className="card">
        <div className="card-h"><h3>Automated insights</h3><span className="muted small">from ticket history, the live queue and the knowledge base · refreshed every sync</span></div>
        <div className="card-b">
          <div className="ins-grid">{[...insights].sort((a, b) => toneRank[a.tone] - toneRank[b.tone]).map((ins) => <InsightCard key={ins.id} ins={ins} onAsk={onAsk} />)}</div>
          {!insights.length && <div className="empty">No insights right now.</div>}
        </div>
      </section>
      <section className="card">
        <div className="card-h"><h3>Questions Copilot couldn't answer</h3><span className="muted small">nothing in the knowledge base matched</span></div>
        <div className="card-b">
          {!misses.length && <div className="muted small">None yet. When a search finds nothing, the question lands here so someone can write the missing page.</div>}
          {misses.map((m) => (
            <div key={m.q} className="list-row small">
              <Icon name="search" size={14} />
              <span style={{ flex: 1, minWidth: 0 }}>{m.q}</span>
              <span className="muted nowrap">{fmtDateTime(m.at)}</span>
              <button className="btn sm" onClick={() => nav('kb', { create: m.q })}><Icon name="plus" size={13} />Write a page</button>
              <button className="btn ghost sm" onClick={() => dispatch({ type: 'copilotMissClear', q: m.q })}>Dismiss</button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

// Reports: the insight strip, with "Ask Copilot" opening a side panel.
export function InsightsPanel() {
  const { state } = useStore()
  const { nav } = useNav()
  const [open, setOpen] = useState(null)
  const cfg = state.copilot.config
  if (!cfg.insights.enabled) return null
  const insights = [...computeInsights(state)].sort((a, b) => toneRank[a.tone] - toneRank[b.tone])
  const can = canUseCopilot(state)
  return (
    <section className="card">
      <div className="card-h">
        <h3>Insights</h3>
        <span className="muted small">generated from your data · ask Copilot to explain any of them</span>
        <span className="spacer" />
        {state.role === 'lead' && <button className="btn ghost sm" onClick={() => nav('copilot', { tab: 'settings' })}><Icon name="gear" size={14} />Configure</button>}
      </div>
      <div className="card-b"><div className="ins-grid">{insights.map((ins) => <InsightCard key={ins.id} ins={ins} onAsk={can ? setOpen : null} />)}</div></div>
      {open && <CopilotDrawer insight={open} onClose={() => setOpen(null)} />}
    </section>
  )
}

export function CopilotDrawer({ insight, ticketId, onClose }) {
  const { nav } = useNav()
  const [id] = useState(() => newId('th'))
  const start = useStartThread()
  const ask = useCopilotAsk()
  useEffect(() => { start(id, { insight, ticketId }) }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Drawer className="copilot-drawer" onClose={onClose}
      title={<><span className="eyebrow row tight"><Icon name="spark" size={14} />Copilot</span><h2 className="drawer-title">{insight ? insight.title : ticketId}</h2></>}
      actions={<button className="btn sm" onClick={() => nav('copilot', { thread: id })}>Open in Copilot</button>}>
      <CopilotChat threadId={id} onNeedThread={() => id} onAsk={ask} />
    </Drawer>
  )
}

// ---------- Configure ----------
function Configure() {
  const { state, dispatch } = useStore()
  const { nav } = useNav()
  const cfg = state.copilot.config
  const lead = state.role === 'lead'
  const set = (patch) => dispatch({ type: 'copilotConfig', patch })
  const flip = (group, id) => set({ [group]: { ...cfg[group], [id]: !cfg[group][id] } })
  const model = MODELS.find((m) => m.id === cfg.model)
  return (
    <>
      {!lead && <div className="callout"><Icon name="lock" size={16} /><span>Only team leads can change Copilot settings. You can see how it's set up.</span></div>}
      {lead && <div className="callout small"><Icon name="check" size={16} /><span>Changes save as you make them and apply to the next answer.</span></div>}
      <fieldset className="grid g-2 cfg" disabled={!lead}>
        <div className="card">
          <div className="card-h"><h3>Assistant</h3></div>
          <div className="card-b stack lg">
            <label className="field"><span>Name</span><input id="cfg-name" className="in" value={cfg.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <label className="field"><span>Model <span className="hint">(through the approved AI gateway)</span></span>
              <select id="cfg-model" className="in" value={cfg.model} onChange={(e) => set({ model: e.target.value })}>{MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
              <span className="muted small">{model?.note}</span>
            </label>
            <label className="field"><span>Instructions <span className="hint">(followed on every answer)</span></span>
              <textarea id="cfg-instr" className="in" rows={5} value={cfg.instructions} onChange={(e) => set({ instructions: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Knowledge</h3><span className="spacer" /><button type="button" className="btn ghost sm" onClick={() => nav('kb')}>Open knowledge base</button></div>
          <div className="card-b stack lg">
            <span className="small ink2">Copilot searches every linked knowledge base at once. It reads published, indexed pages only, and data tables live.</span>
            {state.kb.kbs.map((k) => {
              const pages = state.kb.pages.filter((p) => p.kbId === k.id)
              const on = cfg.kbIds.includes(k.id)
              return (
                <label key={k.id} className="check">
                  <input type="checkbox" checked={on} onChange={() => set({ kbIds: on ? cfg.kbIds.filter((x) => x !== k.id) : [...cfg.kbIds, k.id] })} />
                  <span className="stack" style={{ gap: 0 }}><b>{k.name}</b><span className="muted small">{pages.filter((p) => p.live).length} published pages · {pages.filter((p) => p.data).length} data tables · {pages.filter((p) => !p.live).length} draft{pages.filter((p) => !p.live).length === 1 ? '' : 's'} not visible</span></span>
                </label>
              )
            })}
            {!cfg.kbIds.length && <div className="callout warn small"><Icon name="alert" size={15} />No knowledge base is linked. Copilot will report every search as a failed lookup.</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Tools</h3><span className="muted small">what Copilot may look up or propose</span></div>
          <div className="card-b stack lg">
            {TOOLS.map((t) => (
              <label key={t.id} className="check">
                <input type="checkbox" checked={cfg.tools[t.id]} onChange={() => flip('tools', t.id)} />
                <span className="stack" style={{ gap: 0 }}><b>{t.label} <span className="mono muted">{t.fn}</span></b><span className="muted small">{t.desc}</span></span>
              </label>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Guardrails</h3></div>
          <div className="card-b stack lg">
            {GUARDRAILS.map((g) => (
              <label key={g.id} className="check">
                <input type="checkbox" checked={g.locked || cfg.guardrails[g.id]} disabled={g.locked} onChange={() => flip('guardrails', g.id)} />
                <span className="stack" style={{ gap: 0 }}><b>{g.label}</b><span className="muted small">{g.desc}</span></span>
              </label>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Automated insights</h3></div>
          <div className="card-b stack lg">
            <label className="check"><input type="checkbox" checked={cfg.insights.enabled} onChange={() => set({ insights: { ...cfg.insights, enabled: !cfg.insights.enabled } })} />
              <span className="stack" style={{ gap: 0 }}><b>Generate insights</b><span className="muted small">Shown on Reports › Performance and Copilot › Insights. Recomputed on every ServiceNow sync.</span></span>
            </label>
            <div className="form-grid">
              {INSIGHT_TYPES.map((t) => (
                <label key={t.id} className="check small"><input type="checkbox" disabled={!cfg.insights.enabled} checked={cfg.insights.types[t.id]} onChange={() => set({ insights: { ...cfg.insights, types: { ...cfg.insights.types, [t.id]: !cfg.insights.types[t.id] } } })} />{t.label}</label>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Access</h3></div>
          <div className="card-b stack lg">
            <label className="check"><input type="checkbox" checked={cfg.access.analysts} onChange={() => set({ access: { ...cfg.access, analysts: !cfg.access.analysts } })} />
              <span className="stack" style={{ gap: 0 }}><b>Analysts can use Copilot</b><span className="muted small">Team leads always can. Only team leads change these settings.</span></span>
            </label>
            <span className="small ink2">Copilot sees what the person asking can see: analysts get their own queue, team leads the whole team.</span>
          </div>
        </div>
      </fieldset>
    </>
  )
}
