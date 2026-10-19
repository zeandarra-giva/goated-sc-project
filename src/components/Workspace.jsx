import { useMemo, useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { useNav } from '../App.jsx'
import { canUseCopilot } from '../pages/Copilot.jsx'
import { Icon, Modal, Prio, SlaPill } from './ui.jsx'
import { BREACH_REASONS, ESCALATION_TARGETS, HOUR, PRIORITIES, ROOT_CAUSES, computeAssist, deflection, initials, byId, codeInfo, fmtDateTime, fmtDur, fmtH, fmtTime, slaInfo } from '../data.js'

// ---------- Resolution Assist ----------
// Deterministic: keyword overlap against resolved history picks similar
// incidents; the resolution codes they used vote for the likely fix.
export function useAssist(desc, hintCode, excludeId) {
  const { state } = useStore()
  return useMemo(() => computeAssist(state.history, state.codes, desc, hintCode, excludeId), [state.history, state.codes, desc, hintCode, excludeId])
}

export function ResolutionAssist({ ticket, compact }) {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const a = useAssist(ticket.desc, ticket.hintCode, ticket.id)
  const pending = state.approvals.find((x) => x.ticket === ticket.id)
  if (!a.top) return <div className="callout">No similar resolved incidents yet. Use the runbook library in Ticket Explorer.</div>
  const info = a.top.info
  return (
    <div className="stack lg">
      <div className="row">
        <span className="pill accent plain"><Icon name="spark" size={12} />Resolution Assist</span>
        <span className="muted small">Rules-based match on {a.sample} similar resolved incidents. No AI, runs in your browser.</span>
      </div>
      <div className="callout accent" style={{ flexDirection: 'column', gap: 6 }}>
        <div className="row"><span className="eyebrow">Likely fix</span><span className="code-chip">{info.code}</span><span className="muted small">{Math.round(a.top.conf * 100)}% of matches</span></div>
        <b>{info.title}</b>
        <div className="small ink2">Typical resolution {fmtH(a.typicalRes)} · first-contact resolution {a.fcrRate == null ? '—' : Math.round(a.fcrRate * 100) + '%'}</div>
      </div>
      <div className="stack">
        <div className="section-title">Suggested next actions</div>
        <ol style={{ margin: 0, paddingLeft: 18 }} className="stack small">
          <li>Confirm scope: is anyone else on <b>{ticket.businessApp}</b> affected? Check for a parent major incident.</li>
          <li>Follow <b>{info.runbook}</b> for {ROOT_CAUSES[info.cause].subs[info.sub].toLowerCase()}.</li>
          <li>{info.title}.</li>
          <li>Ask {ticket.caller} to confirm service is restored, then log the contact.</li>
        </ol>
      </div>
      {!compact && a.ranked.length > 1 && (
        <div className="stack">
          <div className="section-title">Other candidate codes</div>
          {a.ranked.slice(1).map((r) => (
            <div key={r.code} className="row small"><span className="code-chip">{r.code}</span><span className="ink2">{r.info.title}</span><span className="spacer" /><span className="muted">{Math.round(r.conf * 100)}%</span></div>
          ))}
        </div>
      )}
      <div className="stack">
        <div className="section-title">Similar incidents</div>
        {a.similar.slice(0, compact ? 3 : 5).map((h) => (
          <div key={h.id} className="list-row small">
            <span className="mono">{h.id}</span>
            <span className="ink2" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.desc}</span>
            <span className="code-chip">{h.code}</span>
            <span className="num muted">{fmtH(h.resH)}</span>
          </div>
        ))}
      </div>
      <div className="stack">
        <div className="section-title">Runbooks</div>
        <div className="row">
          <span className="pill plain"><Icon name="book" size={12} />{info.runbook}</span>
          {a.ranked.slice(1).map((r) => <span key={r.code} className="pill plain"><Icon name="book" size={12} />{r.info.runbook}</span>)}
        </div>
      </div>
      {info.automatable && (
        <div className="callout" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Icon name="bolt" />
          <div className="stack" style={{ gap: 2, flex: 1, minWidth: 180 }}>
            <b>Automated fix available</b>
            <span className="small ink2">{info.fix}. Runs only after a team lead approves it.</span>
          </div>
          {pending ? (
            <span className={`pill ${pending.status === 'Approved' ? 'good' : pending.status === 'Rejected' ? 'crit' : 'warn'}`}>{pending.id} · {pending.status}</span>
          ) : state.role === 'lead' ? (
            <button className="btn primary sm" onClick={() => {
              dispatch({ type: 'requestFix', ticket: ticket.id, code: info.code, fix: info.fix, by: me.name })
            }}>Propose fix</button>
          ) : (
            <button className="btn primary sm" onClick={() => dispatch({ type: 'requestFix', ticket: ticket.id, code: info.code, fix: info.fix, by: me.name })}>Request approval</button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Ticket workspace (resolution steps, contact log, assist) ----------
export function TicketWorkspace({ ticket, onResolve }) {
  const { state, dispatch } = useStore()
  const { nav } = useNav()
  const [entry, setEntry] = useState({ channel: 'Phone', note: '' })
  const sla = slaInfo(ticket, state.now)
  const me = currentUser(state)
  const done = ticket.steps.filter((s) => s.done).length
  return (
    <div className="stack lg">
      <div className="stack" style={{ gap: 6 }}>
        <div className="row"><span className="mono">{ticket.id}</span><Prio p={ticket.priority} /><SlaPill status={sla.status} /><span className="pill plain">{ticket.state}</span></div>
        <h3 style={{ font: '600 17px/1.3 var(--f-cond)' }}>{ticket.desc}</h3>
        <div className="small ink2">{ticket.businessApp} · {ticket.productGroup} · via {ticket.channel} · caller {ticket.caller}</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {[
          ['SLA remaining', sla.remaining > 0 ? fmtDur(sla.remaining) : `Over by ${fmtDur(-sla.remaining)}`],
          ['Total age', fmtDur(state.now - ticket.openedAt)],
          ['In queue', fmtDur(state.now - ticket.queuedAt)],
          ['Assigned to', ticket.assignedTo ? byId[ticket.assignedTo].name : 'Unassigned'],
        ].map(([k, v]) => <div key={k} className="stack" style={{ gap: 2 }}><span className="eyebrow">{k}</span><b className="num">{v}</b></div>)}
      </div>
      {ticket.assignReason && <div className="small muted">Auto-assigned {ticket.assignedAt ? fmtTime(ticket.assignedAt) : ''} · {ticket.assignReason}</div>}

      <div className="stack">
        <div className="row"><div className="section-title">Resolution steps</div><span className="muted small">{done}/{ticket.steps.length} done</span></div>
        <div className="meter"><i style={{ width: `${(done / ticket.steps.length) * 100}%`, background: 'var(--good)' }} /></div>
        {ticket.steps.map((s, i) => (
          <label key={i} className="check small"><input type="checkbox" checked={s.done} onChange={() => dispatch({ type: 'toggleStep', id: ticket.id, i })} />{s.label}</label>
        ))}
      </div>

      <div className="stack">
        <div className="section-title">Customer contact log</div>
        {ticket.contacts.length === 0 && <div className="muted small">No contact logged yet. QA scoring expects at least one.</div>}
        {ticket.contacts.map((c, i) => (
          <div key={i} className="list-row small" style={{ alignItems: 'flex-start' }}>
            <span className="pill plain"><Icon name="phone" size={11} />{c.channel}</span>
            <span style={{ flex: 1 }}>{c.note}</span>
            <span className="muted nowrap">{fmtDateTime(c.at)}</span>
          </div>
        ))}
        <form className="row" onSubmit={(e) => {
          e.preventDefault()
          if (!entry.note.trim()) return
          dispatch({ type: 'addContact', id: ticket.id, entry: { ...entry, by: me.name } })
          setEntry({ ...entry, note: '' })
        }}>
          <select id={`ch-${ticket.id}`} className="in sm" value={entry.channel} onChange={(e) => setEntry({ ...entry, channel: e.target.value })} aria-label="Contact channel">
            {['Phone', 'Chat', 'Email', 'Teams call'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <input id={`note-${ticket.id}`} className="in" style={{ flex: 1, minWidth: 160 }} placeholder="What did you tell the customer?" value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} />
          <button className="btn sm" type="submit">Log contact</button>
        </form>
      </div>

      {canUseCopilot(state) && (
        <div className="callout accent" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Icon name="spark" />
          <div className="stack" style={{ gap: 2, flex: 1, minWidth: 180 }}>
            <b>Work this ticket with Copilot</b>
            <span className="small ink2">Steps from the published runbook, escalation contacts, similar incidents and a customer update draft.</span>
          </div>
          <button className="btn primary sm" onClick={() => nav('copilot', { ticket: ticket.id })}>Ask Copilot</button>
        </div>
      )}
      <hr className="sep" />
      <ResolutionAssist ticket={ticket} compact />
      <hr className="sep" />
      <div className="row">
        <select className="in" value={ticket.state} aria-label="Ticket state" onChange={(e) => (e.target.value === 'Resolved' ? onResolve(ticket) : dispatch({ type: 'setState', id: ticket.id, state: e.target.value }))}>
          {['New', 'In Progress', 'Awaiting Customer', 'On Hold', 'Resolved'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <span className="spacer" />
        <button className="btn primary" onClick={() => onResolve(ticket)}><Icon name="check" size={16} />Document & resolve</button>
      </div>
    </div>
  )
}

// ---------- Resolution journey modal ----------
const STEPS = [
  { id: 'detect', label: 'Detection', hint: 'What was reported' },
  { id: 'diag', label: 'Diagnosis', hint: 'Root cause' },
  { id: 'fix', label: 'Fix applied', hint: 'What you changed' },
  { id: 'valid', label: 'Validation', hint: 'Customer confirmed' },
  { id: 'close', label: 'Close', hint: 'Contact & code' },
]

export function ResolveModal({ ticket, onClose }) {
  const { state, dispatch } = useStore()
  const assist = useAssist(ticket.desc, ticket.hintCode, ticket.id)
  const guess = assist.top?.info || codeInfo(ticket.hintCode)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({
    symptom: ticket.desc,
    impact: 'Single user',
    cause: guess.cause,
    sub: guess.sub,
    diagNote: '',
    fix: guess.title,
    runbook: guess.runbook,
    newFix: false,
    validated: true,
    validNote: `${ticket.caller} confirmed service restored.`,
    fcr: ticket.channel === 'Phone' || ticket.channel === 'Chat',
    transfers: 0,
    escalatedTo: '',
    breachCode: '',
    deflectFlag: null,
    closeNote: '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const code = useMemo(() => {
    const prefix = `${f.cause}-${f.sub}-`
    const same = state.codes.filter((c) => c.code.startsWith(prefix))
    if (same.length && !f.newFix) {
      const exact = same.find((c) => c.title === f.fix) || same[0]
      return { ...exact, isNew: false }
    }
    const seq = String(same.length + 1).padStart(2, '0')
    return { code: prefix + seq, cause: f.cause, sub: f.sub, title: f.fix, runbook: f.runbook || 'Runbook pending', automatable: false, isNew: true }
  }, [f.cause, f.sub, f.newFix, f.fix, f.runbook, state.codes])

  const breached = slaInfo(ticket, Date.now()).status === 'Breached'
  const escalated = Number(f.transfers) > 0
  const solver = byId[ticket.assignedTo]
  const category = `${ROOT_CAUSES[f.cause].label} › ${ROOT_CAUSES[f.cause].subs[f.sub]}`
  const ageH = (Date.now() - ticket.openedAt) / HOUR
  const overH = Math.max(0, ageH - PRIORITIES[ticket.priority].slaH)
  const resNowH = (Date.now() - (ticket.assignedAt || ticket.queuedAt)) / HOUR
  // Deflection: the rule suggests, the analyst confirms (null = follow the rule).
  const autoDeflect = deflection({ priority: ticket.priority, resH: resNowH, code: `${f.cause}-${f.sub}-01` })
  const isDeflect = f.deflectFlag === null ? !!autoDeflect : f.deflectFlag
  const deflectReason = isDeflect ? autoDeflect || 'Flagged by the resolving analyst' : null
  const valid = [f.symptom.trim(), f.cause && f.sub, f.fix.trim(), !f.validated ? f.validNote.trim() : true, (!breached || f.breachCode) && (!escalated || f.escalatedTo)]
  const canFinish = valid.every(Boolean)

  const finish = () => {
    const start = ticket.assignedAt || ticket.queuedAt
    const now = Date.now()
    const span = Math.max(now - start, 10 * 60e3)
    const journey = [
      { stage: 'Detection', at: ticket.openedAt, note: `${f.symptom} Impact: ${f.impact}.` },
      { stage: 'Queued', at: ticket.queuedAt, note: `Auto-assigned to ${byId[ticket.assignedTo]?.name || 'analyst'}. ${ticket.assignReason}` },
      ...(Number(f.transfers) > 0 ? [{ stage: 'Transfer', at: start + span * 0.15, note: `Transferred ${f.transfers}× before resolution.` }] : []),
      { stage: 'Diagnosis', at: start + span * 0.4, note: `${ROOT_CAUSES[f.cause].label}: ${ROOT_CAUSES[f.cause].subs[f.sub]}. ${f.diagNote}`.trim() },
      { stage: 'Fix applied', at: start + span * 0.85, note: `${f.fix} (${f.runbook || 'no runbook'}).` },
      { stage: 'Validated', at: now, note: f.validated ? f.validNote : `Not confirmed by customer: ${f.validNote}` },
    ]
    dispatch({ type: 'resolve', id: ticket.id, code: { code: code.code, cause: code.cause, sub: code.sub, title: code.title, runbook: code.runbook, automatable: code.automatable }, journey, fcr: f.fcr, transfers: Number(f.transfers), validated: f.validated,
      diagNote: `${category}. ${f.diagNote}`.trim(),
      fixNote: `${f.fix} (${f.runbook || 'no runbook'}).`,
      breachCode: breached ? f.breachCode : null, escalatedTo: escalated ? f.escalatedTo : null, deflectFlag: f.deflectFlag })
    onClose()
  }

  return (
    <Modal title="Resolution journey" sub={`${ticket.id} · ${ticket.desc}`} onClose={onClose} wide
      footer={<>
        <span className="muted small" style={{ marginRight: 'auto', alignSelf: 'center' }}>Every resolved ticket gets a resolution code. It feeds Ticket Explorer, QA scoring and Resolution Assist.</span>
        <button className="btn" onClick={onClose}>Cancel</button>
        {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>Back</button>}
        {step < STEPS.length - 1 ? (
          <button className="btn primary" disabled={!valid[step]} onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1].label}</button>
        ) : (
          <button className="btn primary" disabled={!canFinish} onClick={finish}><Icon name="check" size={16} />Resolve with {code.code}</button>
        )}
      </>}>
      <div className="stepper">
        {STEPS.map((s, i) => (
          <button key={s.id} className={i < step ? 'done' : i === step ? 'cur' : ''} onClick={() => (i <= step || valid.slice(0, i).every(Boolean)) && setStep(i)}>
            <b>{i + 1}. {s.label}</b>{s.hint}
          </button>
        ))}
      </div>
      <div className="rj-context">
        <span><span className="eyebrow">Solved by</span><span className="row tight"><span className="avatar sm">{initials(solver?.name || '?')}</span>{solver?.name || 'Unassigned'}</span></span>
        <span><span className="eyebrow">Business application</span>{ticket.businessApp}</span>
        <span><span className="eyebrow">Problem category</span>{category}</span>
        <span><span className="eyebrow">SLA</span>{breached ? <span className="pill crit">Breached · +{fmtH(overH)}</span> : <span className="pill good">Within SLA</span>}</span>
      </div>

      {step === 0 && (
        <div className="stack lg">
          <label className="field"><span>Symptom as reported and verified</span><textarea id="rj-symptom" className="in" value={f.symptom} onChange={set('symptom')} /></label>
          <label className="field" style={{ maxWidth: 280 }}><span>Business impact</span>
            <select id="rj-impact" className="in" value={f.impact} onChange={set('impact')}>{['Single user', 'Team', 'Site', 'Enterprise-wide'].map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <div className="small muted">Opened {fmtDateTime(ticket.openedAt)} via {ticket.channel}. Total age {fmtDur(Date.now() - ticket.openedAt)}.</div>
        </div>
      )}
      {step === 1 && (
        <div className="stack lg">
          <div className="form-grid">
            <label className="field"><span>Root cause category</span>
              <select id="rj-cause" className="in" value={f.cause} onChange={(e) => setF({ ...f, cause: e.target.value, sub: Object.keys(ROOT_CAUSES[e.target.value].subs)[0] })}>
                {Object.entries(ROOT_CAUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="field"><span>Subcategory</span>
              <select id="rj-sub" className="in" value={f.sub} onChange={set('sub')}>
                {Object.entries(ROOT_CAUSES[f.cause].subs).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>Diagnosis note <span className="hint">(optional)</span></span><textarea id="rj-diag" className="in" value={f.diagNote} onChange={set('diagNote')} placeholder="Logs checked, recent changes, what ruled other causes out" /></label>
          {assist.top && <div className="callout accent small"><Icon name="spark" size={16} />Resolution Assist suggests <b>{ROOT_CAUSES[assist.top.info.cause].label} · {ROOT_CAUSES[assist.top.info.cause].subs[assist.top.info.sub]}</b> based on {assist.sample} similar incidents.</div>}
        </div>
      )}
      {step === 2 && (
        <div className="stack lg">
          <label className="field"><span>Remedy / fix note <span className="hint">(action taken)</span></span><textarea id="rj-fix" className="in" value={f.fix} onChange={set('fix')} /></label>
          <label className="field" style={{ maxWidth: 360 }}><span>Runbook followed</span><input id="rj-runbook" className="in" value={f.runbook} onChange={set('runbook')} /></label>
          <label className="check small"><input id="rj-new" type="checkbox" checked={f.newFix} onChange={set('newFix')} />This is a new fix that no existing resolution code covers. Mint a new code.</label>
        </div>
      )}
      {step === 3 && (
        <div className="stack lg">
          <label className="check"><input id="rj-valid" type="checkbox" checked={f.validated} onChange={set('validated')} />Customer confirmed the service is restored</label>
          <label className="field"><span>{f.validated ? 'Validation note' : 'Why was it not confirmed? (required)'}</span><textarea id="rj-validnote" className="in" value={f.validNote} onChange={set('validNote')} /></label>
        </div>
      )}
      {step === 4 && (
        <div className="stack lg">
          <div className="form-grid">
            <label className="field"><span>First contact resolution</span>
              <select id="rj-fcr" className="in" value={f.fcr ? 'yes' : 'no'} onChange={(e) => setF({ ...f, fcr: e.target.value === 'yes' })}><option value="yes">Yes, solved on first contact</option><option value="no">No</option></select>
            </label>
            <label className="field"><span>Transfers before reaching you</span><input id="rj-transfers" type="number" min="0" max="9" className="in" value={f.transfers} onChange={set('transfers')} /></label>
            <label className="field"><span>Escalation target resolver <span className="hint">{escalated ? '(required: ticket was transferred)' : '(only when transferred)'}</span></span>
              <select id="rj-esc" className="in" value={escalated ? f.escalatedTo : ''} onChange={set('escalatedTo')} disabled={!escalated}>
                <option value="">{escalated ? 'Choose a resolver group…' : 'Not escalated'}</option>
                {[...new Set(Object.values(ESCALATION_TARGETS))].map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label className="field"><span>Breach reason code <span className="hint">{breached ? `(required: ${fmtH(overH)} over the ${PRIORITIES[ticket.priority].slaH}h SLA)` : '(only when the SLA is breached)'}</span></span>
              <select id="rj-breach" className="in" value={breached ? f.breachCode : ''} onChange={set('breachCode')} disabled={!breached}>
                <option value="">{breached ? 'Why did it miss the SLA?' : 'SLA met: not needed'}</option>
                {Object.entries(BREACH_REASONS).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
              </select>
            </label>
            <label className="field"><span>Deflection candidate <span className="hint">(could the Solution Center have resolved it at first contact?)</span></span>
              <select id="rj-deflect" className="in" value={f.deflectFlag === null ? 'auto' : f.deflectFlag ? 'yes' : 'no'}
                onChange={(e) => setF({ ...f, deflectFlag: e.target.value === 'auto' ? null : e.target.value === 'yes' })}>
                <option value="auto">Suggested: {autoDeflect ? 'Yes' : 'No'}</option>
                <option value="yes">Yes, flag as deflection candidate</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>
          <label className="field"><span>Close notes for the customer <span className="hint">(optional)</span></span><textarea id="rj-close" className="in" value={f.closeNote} onChange={set('closeNote')} /></label>
          <div className="stack">
            <div className="row"><span className="section-title">Resolution details</span><span className="muted small">saved to Ticket Explorer</span></div>
            <dl className="details">
              <dt>Solved by</dt><dd>{solver?.name || 'Unassigned'} · {solver?.group || 'Service Desk L2'}</dd>
              <dt>Problem category</dt><dd>{category}</dd>
              <dt>Business application</dt><dd>{ticket.businessApp}</dd>
              <dt>Diagnosis note</dt><dd>{`${category}. ${f.diagNote}`.trim()}</dd>
              <dt>Remedy / fix note</dt><dd>{f.fix} ({f.runbook || 'no runbook'})</dd>
              <dt>Breach reason</dt><dd>{breached ? (f.breachCode ? <><span className="pill crit">{f.breachCode}</span> {BREACH_REASONS[f.breachCode]} · +{fmtH(overH)}</> : <span style={{ color: 'var(--crit)' }}>Required: choose a breach reason</span>) : <span className="muted">SLA met</span>}</dd>
              <dt>Deflection candidate</dt><dd>{isDeflect ? <><span className="pill accent">Yes</span> {deflectReason}</> : <span className="muted">No</span>}</dd>
              <dt>Escalation target</dt><dd>{escalated ? (f.escalatedTo ? `${f.escalatedTo} (${f.transfers} transfer${Number(f.transfers) > 1 ? 's' : ''})` : <span style={{ color: 'var(--crit)' }}>Required: choose a resolver group</span>) : <span className="muted">Not escalated</span>}</dd>
            </dl>
          </div>
          <div className="callout good" style={{ alignItems: 'center' }}>
            <Icon name="check" />
            <div className="stack" style={{ gap: 2, flex: 1 }}>
              <div className="row"><span className="eyebrow">Resolution code</span><span className="code-chip" style={{ fontSize: 14 }}>{code.code}</span>{code.isNew && <span className="pill warn">New code</span>}</div>
              <span className="small">{ROOT_CAUSES[f.cause].label} · {ROOT_CAUSES[f.cause].subs[f.sub]} — {code.title}</span>
            </div>
          </div>
          <div className="small muted">RES MTTR will be {fmtH((Date.now() - (ticket.assignedAt || ticket.queuedAt)) / HOUR)}, EZE MTTR {fmtH((Date.now() - ticket.openedAt) / HOUR)}.</div>
        </div>
      )}
    </Modal>
  )
}
