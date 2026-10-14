import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import {
  ANALYSTS, DAY, HOUR, NOW, PRIORITIES, RESOLUTION_CODES, byId, codeInfo, makeQueueTicket, pickAssignee,
  dayIndex, dayKey, fmtDur, resolutionDetails, seedHandovers, seedHistory, seedQueue, seedSchedule, seedVault, slaInfo,
} from './data.js'

const Ctx = createContext(null)

function init() {
  const { tickets, stats } = seedQueue()
  return {
    role: 'lead',
    analysts: ANALYSTS.map((a) => ({ ...a })),
    tickets,
    stats,
    history: seedHistory(),
    handovers: seedHandovers(),
    schedule: seedSchedule(),
    vault: seedVault(),
    codes: RESOLUTION_CODES.map((c) => ({ ...c })),
    approvals: [
      { id: 'FX-031', ticket: tickets.find((t) => t.priority === 'P1')?.id, code: 'APP-INT-01', fix: codeInfo('APP-INT-01').fix, by: 'Carlo Dizon', at: NOW - 22 * 60e3, status: 'Pending' },
    ],
    events: [
      { id: 'e1', kind: 'handover', title: 'Shift handover from Rhea Castillo is waiting for your acknowledgement', at: NOW - 3 * HOUR, page: 'explorer', tab: 'handover' },
      { id: 'e2', kind: 'leave', title: 'Leave request LV-2291 for Trisha Aquino needs approval', at: NOW - 5 * HOUR, page: 'team', tab: 'schedule' },
      { id: 'e3', kind: 'coverage', title: 'Saturday weekend duty has only 1 analyst (minimum 2)', at: NOW - 8 * HOUR, page: 'team', tab: 'schedule' },
      { id: 'e4', kind: 'info', title: 'Resolution code NET-VPN-01 runbook was updated to v3', at: NOW - 26 * HOUR, page: 'explorer', tab: 'codes' },
    ],
    read: {},
    toasts: [],
    tour: false,
    snow: { lastSync: NOW, status: 'Live', latencyMs: 182, intakeLastHour: 7 },
    now: NOW,
  }
}

function assign(state, ticket) {
  const p = pickAssignee(state.tickets, state.analysts, state.stats)
  if (!p) return { ticket: { ...ticket, assignReason: 'No eligible analyst online; held in queue' }, stats: state.stats }
  const at = state.now
  return {
    ticket: { ...ticket, assignedTo: p.id, assignedAt: at, assignReason: p.reason },
    stats: { ...state.stats, [p.id]: { today: (state.stats[p.id]?.today || 0) + 1, lastAt: at } },
  }
}

let toastSeq = 0
function toast(state, text) {
  return { ...state, toasts: [...state.toasts, { id: ++toastSeq, text }] }
}

function reducer(state, a) {
  switch (a.type) {
    case 'reset':
      return { ...init(), role: state.role, toasts: [{ id: ++toastSeq, text: 'Sample data reset' }] }
    case 'tourStart':
      return { ...state, tour: true }
    case 'tourEnd':
      return { ...state, tour: false }
    case 'tick':
      return { ...state, now: Date.now() }
    case 'role':
      return { ...state, role: a.role }
    case 'sync':
      return { ...state, snow: { ...state.snow, lastSync: Date.now(), latencyMs: 140 + Math.round(Math.random() * 120) } }
    case 'intake': {
      const t = makeQueueTicket({ openedAt: Date.now() - 3 * 60e3, state: 'New', priority: a.priority })
      t.queuedAt = Date.now()
      const r = assign(state, t)
      const who = r.ticket.assignedTo ? byId[r.ticket.assignedTo].name : 'nobody'
      const next = {
        ...state,
        tickets: [r.ticket, ...state.tickets],
        stats: r.stats,
        snow: { ...state.snow, lastSync: Date.now(), intakeLastHour: state.snow.intakeLastHour + 1 },
        events: r.ticket.priority === 'P1'
          ? [{ id: 'p1' + t.id, kind: 'p1', title: `New P1 ${t.id}: ${t.desc}`, at: Date.now(), page: 'home', ticket: t.id }, ...state.events]
          : state.events,
      }
      return toast(next, `${t.id} pulled from ServiceNow and assigned to ${who}`)
    }
    case 'rebalance': {
      // Return tickets held by analysts who are not online back to the pool,
      // then re-run the fair-share rule for each one, oldest first.
      let s = { ...state }
      const orphaned = s.tickets.filter((t) => t.state !== 'Resolved' && (!t.assignedTo || s.analysts.find((x) => x.id === t.assignedTo)?.status !== 'online'))
      s.tickets = s.tickets.map((t) => (orphaned.includes(t) ? { ...t, assignedTo: null } : t))
      for (const o of [...orphaned].sort((x, y) => x.queuedAt - y.queuedAt)) {
        const cur = s.tickets.find((t) => t.id === o.id)
        const r = assign(s, cur)
        s = { ...s, stats: r.stats, tickets: s.tickets.map((t) => (t.id === o.id ? r.ticket : t)) }
      }
      return toast(s, orphaned.length ? `Rebalanced ${orphaned.length} ticket${orphaned.length > 1 ? 's' : ''} across online analysts` : 'Queue is already balanced')
    }
    case 'analystStatus':
      return { ...state, analysts: state.analysts.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)) }
    case 'setState':
      return { ...state, tickets: state.tickets.map((t) => (t.id === a.id ? { ...t, state: a.state } : t)) }
    case 'toggleStep':
      return { ...state, tickets: state.tickets.map((t) => (t.id === a.id ? { ...t, steps: t.steps.map((s, i) => (i === a.i ? { ...s, done: !s.done } : s)) } : t)) }
    case 'addContact':
      return toast({ ...state, tickets: state.tickets.map((t) => (t.id === a.id ? { ...t, contacts: [...t.contacts, { ...a.entry, at: Date.now() }] } : t)) }, 'Contact logged')
    case 'resolve': {
      const t = state.tickets.find((x) => x.id === a.id)
      const now = Date.now()
      const ezeH = (now - t.openedAt) / HOUR
      const resH = Math.max(0.1, (now - (t.assignedAt || t.queuedAt)) / HOUR)
      let codes = state.codes
      if (!codes.find((c) => c.code === a.code.code)) codes = [...codes, a.code]
      const row = {
        id: t.id, desc: t.desc, priority: t.priority, productGroup: t.productGroup, channel: t.channel,
        businessApp: t.businessApp, assignmentGroup: byId[t.assignedTo]?.group || 'Service Desk L2', analyst: t.assignedTo,
        openedAt: t.openedAt, resolvedAt: now, ezeH, resH, lostH: Math.max(0, ezeH - resH), fcr: a.fcr, transfers: a.transfers,
        slaMet: slaInfo(t, now).status !== 'Breached', code: a.code.code,
        qa: { documentation: a.journey.every((j) => j.note.trim()), contactLogged: t.contacts.length > 0, correctCode: true, validated: a.validated },
        journey: a.journey, fresh: true,
        diagNote: a.diagNote, fixNote: a.fixNote, breachCode: a.breachCode, escalatedTo: a.escalatedTo, deflectFlag: a.deflectFlag,
      }
      Object.assign(row, resolutionDetails(row))
      return toast({
        ...state,
        codes,
        tickets: state.tickets.filter((x) => x.id !== a.id),
        history: [row, ...state.history],
      }, `${t.id} resolved with ${a.code.code}`)
    }
    case 'requestFix': {
      const id = `FX-0${32 + state.approvals.length}`
      return toast({
        ...state,
        approvals: [{ id, ticket: a.ticket, code: a.code, fix: a.fix, by: a.by, at: Date.now(), status: 'Pending' }, ...state.approvals],
      }, `Automated fix ${id} sent to the team lead for approval`)
    }
    case 'decideFix':
      return toast({ ...state, approvals: state.approvals.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)) }, `${a.id} ${a.status.toLowerCase()}`)
    case 'submitHandover':
      return toast({ ...state, handovers: [{ ...a.handover, id: `HO-0${240 + state.handovers.length - 9}` }, ...state.handovers] }, 'Handover submitted and shared with the next shift')
    case 'ackHandover':
      return { ...state, handovers: state.handovers.map((h) => (h.id === a.id ? { ...h, acknowledged: true } : h)), read: { ...state.read, e1: true } }
    case 'setShift': {
      // items: [{ aid, ts, code }]. Seeded days update sched; any other date is stored as an edit.
      const sched = { ...state.schedule.sched }
      const edits = { ...(state.schedule.edits || {}) }
      for (const { aid, ts, code } of a.items) {
        const idx = dayIndex(state.schedule, ts)
        if (idx >= 0 && idx < state.schedule.days.length) {
          sched[aid] = [...sched[aid]]
          sched[aid][idx] = code
        } else edits[aid] = { ...(edits[aid] || {}), [dayKey(ts)]: code }
      }
      return { ...state, schedule: { ...state.schedule, sched, edits } }
    }
    case 'vaultSave': {
      const exists = state.vault.some((v) => v.id === a.item.id)
      return toast({ ...state, vault: exists ? state.vault.map((v) => (v.id === a.item.id ? a.item : v)) : [a.item, ...state.vault] }, exists ? `${a.item.app} updated` : `${a.item.app} added to your vault`)
    }
    case 'vaultRotate':
      return toast({
        ...state,
        vault: state.vault.map((v) => (v.id === a.id ? { ...v, secret: a.secret, changedAt: Date.now(), expiresAt: v.expiresAt == null ? null : Date.now() + (a.cycleDays || 90) * DAY } : v)),
      }, 'Password rotated. Age reset to 0 days')
    case 'vaultDelete':
      return toast({ ...state, vault: state.vault.filter((v) => v.id !== a.id) }, 'Credential removed')
    case 'read':
      return { ...state, read: { ...state.read, [a.id]: true } }
    case 'readAll':
      return { ...state, read: { ...state.read, ...Object.fromEntries(a.ids.map((i) => [i, true])) } }
    case 'toast':
      return toast(state, a.text)
    case 'dismissToast':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== a.id) }
    case 'addMember': {
      const m = { ...a.member, id: 'a' + (state.analysts.length + 1) }
      byId[m.id] = m
      const sched = { ...state.schedule.sched, [m.id]: state.schedule.days.map((_, i) => (i % 7 >= 5 ? 'OFF' : m.shift === 'Late' ? 'L' : m.shift === 'Mid' ? 'M' : 'E')) }
      return toast({ ...state, analysts: [...state.analysts, m], schedule: { ...state.schedule, sched } }, `${m.name} added to the team`)
    }
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, init)
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'tick' }), 15e3)
    const s = setInterval(() => dispatch({ type: 'sync' }), 30e3)
    return () => { clearInterval(t); clearInterval(s) }
  }, [])
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

export const currentUser = (state) => byId[state.role === 'lead' ? 'a1' : 'a2']

// Notifications are a mix of events (things that happened) and conditions
// derived live from the queue, approvals and vault (things that need action).
export function buildNotifications(state) {
  const me = currentUser(state)
  const out = []
  const open = state.tickets.filter((t) => t.state !== 'Resolved')
  const scoped = state.role === 'lead' ? open : open.filter((t) => t.assignedTo === me.id)
  scoped.forEach((t) => {
    const s = slaInfo(t, state.now)
    if (s.status === 'Breached' && (t.priority === 'P1' || t.priority === 'P2'))
      out.push({ id: 'br' + t.id, group: 'action', kind: 'sla', tone: 'crit', title: `${t.id} breached SLA (${t.priority})`, sub: t.desc, at: s.due, page: 'home', ticket: t.id })
    else if (s.status === 'At risk')
      out.push({ id: 'ar' + t.id, group: 'action', kind: 'sla', tone: 'warn', title: `${t.id} breaches SLA in ${fmtDur(s.remaining)}`, sub: t.desc, at: state.now, page: 'home', ticket: t.id })
  })
  if (state.role === 'lead') {
    state.approvals.filter((x) => x.status === 'Pending').forEach((x) =>
      out.push({ id: 'ap' + x.id, group: 'action', kind: 'approval', tone: 'accent', title: `Approve automated fix ${x.id} for ${x.ticket}`, sub: `${x.fix} · requested by ${x.by}`, at: x.at, page: 'home', approval: x.id }))
    state.events.forEach((e) => out.push({ ...e, group: e.kind === 'info' ? 'update' : 'action', tone: e.kind === 'p1' ? 'crit' : e.kind === 'coverage' ? 'warn' : 'accent' }))
  } else {
    open.filter((t) => t.assignedTo === me.id && state.now - t.assignedAt < 2 * HOUR).forEach((t) =>
      out.push({ id: 'as' + t.id, group: 'update', kind: 'assign', tone: 'accent', title: `${t.id} was assigned to you`, sub: t.assignReason, at: t.assignedAt, page: 'home', ticket: t.id }))
    state.approvals.filter((x) => x.status !== 'Pending').forEach((x) =>
      out.push({ id: 'ad' + x.id + x.status, group: 'update', kind: 'approval', tone: x.status === 'Approved' ? 'good' : 'warn', title: `Automated fix ${x.id} was ${x.status.toLowerCase()}`, sub: x.fix, at: x.at, page: 'home' }))
  }
  state.vault.forEach((v) => {
    if (v.expiresAt == null) return
    const days = Math.ceil((v.expiresAt - state.now) / DAY)
    if (days <= v.reminderDays)
      out.push({ id: 'pw' + v.id + days, group: 'action', kind: 'password', tone: days <= 0 ? 'crit' : 'warn', title: days <= 0 ? `${v.app} password has expired` : `${v.app} password expires in ${days} day${days > 1 ? 's' : ''}`, sub: 'Rotate it in your password vault', at: state.now - 60e3, page: 'team', tab: 'vault' })
  })
  return out.sort((a, b) => b.at - a.at)
}
