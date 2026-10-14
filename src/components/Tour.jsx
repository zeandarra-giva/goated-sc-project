import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { useNav } from '../App.jsx'
import { Icon } from './ui.jsx'

// Onboarding tour. Each step spotlights an element tagged with data-tour.
// Steps that used to be Home quick actions carry a "Try it" action.
function steps(lead, first) {
  return [
    { id: 'welcome', title: `Welcome to Scope, ${first}`, body: lead
      ? 'A quick tour of how you run the incident queue: live intake, fair assignment, approvals and handovers. Takes about a minute.'
      : 'A quick tour of how you work the queue: your prioritised tickets, resolution steps and handovers. Takes about a minute.' },
    { target: 'snow', title: 'Live from ServiceNow', body: 'Incidents sync from ServiceNow every 30 seconds. The chips show what is open, how many P1s there are and how many tickets are still waiting for an analyst. Click it for sync details.' },
    { target: 'kpis', title: 'Queue health at a glance', body: 'Active incidents, queue risk, SLA health and staffing. Every card has an i button in the top-right corner that explains how the number is calculated.' },
    { target: 'assign', title: 'Fair-share assignment', body: 'Tickets are assigned automatically to the online analyst with the lowest weighted load. This card shows how evenly work is spread right now.' },
    ...(lead ? [{ target: 'rebalance', title: 'Rebalance the queue', body: 'When someone goes offline, rebalance hands their open tickets to the rest of the shift using the same fair-share rule.', action: 'Rebalance now' }] : []),
    { target: 'tab-mine', title: 'Your prioritised work queue', body: 'Your tickets, ordered by priority and SLA urgency. Open one to work through resolution steps, log customer contact and get suggested fixes.', action: 'Open my work queue' },
    ...(lead ? [{ target: 'tab-approvals', title: 'Review fix approvals', body: 'Analysts can propose automated fixes from a resolution code. Nothing runs until you approve it here.', action: 'Open approvals' }] : []),
    { target: 'tab-handover', title: 'Start a shift handover', body: 'Summarises what was resolved, which critical incidents are still open and next week\'s coverage, ready for the next shift to acknowledge.', action: 'Open handover' },
    { target: 'notif', title: 'Notifications', body: 'Split into Needs action and Updates: SLA risk, new P1s, approvals, handovers, leave and password expiry reminders.' },
    { target: 'rail', title: 'Everything else', body: 'Ticket Explorer for how incidents were solved, Reports for performance and coaching, and Team Management for schedules and your password vault.' },
    { target: 'profile', title: 'Your account', body: 'Open your account profile or log out from here. That\'s the tour.' },
  ]
}

const PAD = 8

export default function Tour() {
  const { state, dispatch } = useStore()
  const { route, nav } = useNav()
  const me = currentUser(state)
  const lead = state.role === 'lead'
  const first = me.name.split(' ')[0]
  const list = useMemo(() => steps(lead, first), [lead, first])
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const step = list[i]
  const end = useCallback(() => dispatch({ type: 'tourEnd' }), [dispatch])

  useEffect(() => { if (route.page !== 'home') nav('home') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const measure = useCallback(() => {
    if (!step.target) return setRect(null)
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (!el) return setRect(null)
    const r = el.getBoundingClientRect()
    const next = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
    setRect((prev) => (prev && ['top', 'left', 'width', 'height'].every((k) => Math.abs(prev[k] - next[k]) < 0.5) ? prev : next))
  }, [step])

  useLayoutEffect(() => {
    const el = step.target && document.querySelector(`[data-tour="${step.target}"]`)
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.top < 80 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: 'center' })
    }
    measure()
    const t = setTimeout(measure, 120)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [measure, step, route.page])

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') end()
      if (e.key === 'ArrowRight') setI((x) => Math.min(list.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [end, list.length])

  const tryIt = () => document.querySelector(`[data-tour="${step.target}"]`)?.click()
  const last = i === list.length - 1

  // Place the card below the spotlight when there is room, otherwise above,
  // otherwise beside it; centred when there is no target.
  const W = Math.min(360, window.innerWidth - 32)
  let pos = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  if (rect) {
    const below = rect.top + rect.height + 12
    const roomBelow = window.innerHeight - below > 230
    const roomAbove = rect.top > 250
    const left = Math.max(16, Math.min(window.innerWidth - W - 16, rect.left))
    if (roomBelow) pos = { top: below, left }
    else if (roomAbove) pos = { top: rect.top - 12, left, transform: 'translateY(-100%)' }
    else pos = { top: Math.max(16, Math.min(window.innerHeight - 260, rect.top)), left: Math.min(window.innerWidth - W - 16, rect.left + rect.width + 12) }
  }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Onboarding tour">
      {rect ? <div className="tour-spot" style={rect} /> : <div className="tour-dim" />}
      <div className="tour-card" style={{ ...pos, width: W }}>
        <div className="row">
          <span className="tour-step">{i + 1} / {list.length}</span>
          <span className="spacer" />
          <button className="btn ghost sm" onClick={end}>Skip tour</button>
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-dots" aria-hidden="true">{list.map((_, j) => <i key={j} className={j === i ? 'on' : j < i ? 'done' : ''} />)}</div>
        <div className="row">
          {step.action && <button className="btn sm" onClick={tryIt}><Icon name="arrowR" size={14} />{step.action}</button>}
          <span className="spacer" />
          {i > 0 && <button className="btn sm" onClick={() => setI(i - 1)}>Back</button>}
          <button className="btn primary sm" onClick={() => (last ? end() : setI(i + 1))}>{i === 0 ? 'Start tour' : last ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    </div>
  )
}
