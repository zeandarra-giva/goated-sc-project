import { useEffect, useMemo, useRef, useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { Icon, Modal, Seg } from '../components/ui.jsx'
import { SHIFT_CODES, addDays, codeAt, dayIndex, dayKey, initials, locationOn, startOfDay, weekStart } from '../data.js'

export const MIN = { weekday: { total: 5, E: 2, L: 1 }, weekend: { W: 2 }, holiday: { total: 3 } }
const EVENTS = ['PL', 'SL', 'W']
const ORDER = ['E', 'M', 'L', 'W', 'PL', 'SL', 'H', 'OFF']
const MAX_LANES = 3
const H0 = 6, H1 = 23
const isWeekend = (ts) => [0, 6].includes(new Date(ts).getDay())
const first = (name) => name.split(' ')[0]
const span = (time) => time.split('–').map((s) => { const [h, m] = s.split(':').map(Number); return h + m / 60 })
const sameDay = (a, b) => dayKey(a) === dayKey(b)

export function coverage(codes, weekend) {
  const n = (c) => codes.filter((x) => x === c).length
  if (weekend) return { ok: n('W') >= MIN.weekend.W, label: `${n('W')} W`, title: `Minimum ${MIN.weekend.W} on weekend duty` }
  const tot = n('E') + n('M') + n('L')
  const label = `${n('E')}E ${n('M')}M ${n('L')}L`
  if (n('H') > codes.length / 2) return { ok: tot >= MIN.holiday.total, label, title: `Public holiday: skeleton crew of ${MIN.holiday.total}` }
  return { ok: tot >= MIN.weekday.total && n('E') >= MIN.weekday.E && n('L') >= MIN.weekday.L, label, title: `Minimum ${MIN.weekday.total} on shift, ${MIN.weekday.E} early, ${MIN.weekday.L} late` }
}

function Avatar({ name }) {
  return <span className="ev-av" aria-hidden="true">{initials(name)}</span>
}

export default function ShiftCalendar({ initial = {} }) {
  const { state } = useStore()
  const lead = state.role === 'lead'
  const me = currentUser(state)
  const people = state.analysts
  const today = startOfDay(state.now)
  const [view, setView] = useState(initial.view || 'month')
  const [cursor, setCursor] = useState(initial.date ? startOfDay(initial.date) : today)
  const [edit, setEdit] = useState(null)
  const code = (aid, ts) => codeAt(state.schedule, people, aid, ts)
  const covOn = (ts) => coverage(people.map((a) => code(a.id, ts)), isWeekend(ts))

  const step = (dir) => {
    const d = new Date(cursor)
    if (view === 'month') { d.setDate(1); d.setMonth(d.getMonth() + dir) }
    else d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1))
    setCursor(startOfDay(d.getTime()))
  }
  const openDay = (ts) => { setCursor(ts); setView('day') }

  // Visible range, used for the title and the coverage status.
  const range = useMemo(() => {
    if (view === 'day') return [cursor]
    if (view === 'week') { const s = weekStart(cursor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)) }
    const d = new Date(cursor); d.setDate(1)
    const s = weekStart(d.getTime())
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime()
    const weeks = Math.ceil((Math.round((last - s) / 86400000) + 1) / 7)
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(s, i))
  }, [view, cursor])
  const month = new Date(cursor).getMonth()
  const inScope = view === 'month' ? range.filter((d) => new Date(d).getMonth() === month) : range
  const short = inScope.filter((d) => !covOn(d).ok).length

  const title = view === 'month'
    ? new Date(cursor).toLocaleDateString([], { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${new Date(range[0]).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(range[6]).toLocaleDateString([], { month: new Date(range[0]).getMonth() === new Date(range[6]).getMonth() ? undefined : 'short', day: 'numeric' })}, ${new Date(range[6]).getFullYear()}`
      : new Date(cursor).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  const ctx = { people, me, lead, today, code, covOn, setEdit, openDay }
  return (
    <section className="card cal">
      <div className="cal-top">
        <Seg value={view} onChange={setView} options={[{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }]} />
        <span className="spacer" />
        <div className={`cal-status ${short ? 'low' : 'ok'}`} role="status">
          <span className="cal-status-ic"><Icon name={short ? 'alert' : 'check'} size={15} stroke={2.4} /></span>
          <div className="stack" style={{ gap: 0 }}>
            <b>{short ? 'Coverage gaps' : 'Fully covered'}</b>
            <span className="small muted">{short ? `${short} day${short > 1 ? 's' : ''} below minimum` : `Every ${view === 'day' ? 'shift' : 'day'} meets minimums`}</span>
          </div>
        </div>
      </div>
      <div className="cal-head">
        <h2>{title}</h2>
        <span className="spacer" />
        {!range.some((d) => sameDay(d, today)) || view === 'month' && month !== new Date(today).getMonth()
          ? <button className="btn sm" onClick={() => setCursor(today)}>Today</button> : null}
        <button className="cal-nav" onClick={() => step(-1)} aria-label={`Previous ${view}`}><Icon name="chevL" size={16} /></button>
        <button className="cal-nav" onClick={() => step(1)} aria-label={`Next ${view}`}><Icon name="chevR" size={16} /></button>
      </div>
      <div className="cal-legend">
        {Object.entries(SHIFT_CODES).filter(([k]) => k !== 'OFF').map(([k, v]) => <span key={k}><i className={`ev-sw ${k}`} />{v.label}{v.time && <span className="muted"> {v.time}</span>}</span>)}
      </div>
      {view === 'month' && <MonthView days={range} month={month} {...ctx} />}
      {view === 'week' && <WeekView days={range} {...ctx} />}
      {view === 'day' && <DayView day={cursor} {...ctx} />}
      <div className="small muted cal-foot">
        {lead
          ? view === 'month' ? 'Month shows leave, weekend duty and holidays; regular shifts are summarised as coverage. Click a bar to change it, or a date to open that day.' : 'Click anyone to change their shift, leave or weekend duty. Coverage turns red when a day drops below minimums.'
          : 'Read-only for analysts. Ask your team lead to swap shifts.'}
      </div>
      {edit && <ShiftEditor edit={edit} onClose={() => setEdit(null)} code={code} />}
    </section>
  )
}

// ---------- Month ----------
function weekBars(days, people, code) {
  const bars = []
  people.forEach((a) => {
    let i = 0
    while (i < 7) {
      const c = code(a.id, days[i])
      if (!EVENTS.includes(c)) { i++; continue }
      let j = i
      while (j + 1 < 7 && code(a.id, days[j + 1]) === c) j++
      bars.push({ key: `${a.id}-${i}`, aid: a.id, name: a.name, code: c, start: i, span: j - i + 1 })
      i = j + 1
    }
  })
  // Holidays are one bar for the whole team rather than one per person.
  const off = days.map((d) => people.filter((a) => code(a.id, d) === 'H').length)
  for (let i = 0; i < 7; i++) {
    if (!off[i]) continue
    let j = i
    while (j + 1 < 7 && off[j + 1]) j++
    bars.push({ key: `h-${i}`, code: 'H', start: i, span: j - i + 1, count: Math.max(...off.slice(i, j + 1)) })
    i = j
  }
  // Holidays first, then longer bars, then by start; greedy lane packing.
  bars.sort((a, b) => (a.code === 'H' ? -1 : 0) - (b.code === 'H' ? -1 : 0) || a.start - b.start || b.span - a.span)
  const lanes = []
  bars.forEach((b) => {
    let l = lanes.findIndex((end) => end < b.start)
    if (l === -1) { l = lanes.length; lanes.push(-1) }
    lanes[l] = b.start + b.span - 1
    b.lane = l
  })
  return bars
}

function MonthView({ days, month, people, me, lead, today, code, covOn, setEdit, openDay }) {
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7))
  return (
    <div className="cal-month" role="grid" aria-label="Month">
      <div className="cal-dow" role="row">{weeks[0].map((d) => <span key={d} role="columnheader">{new Date(d).toLocaleDateString([], { weekday: 'short' }).slice(0, 2)}</span>)}</div>
      {weeks.map((wd) => {
        const bars = weekBars(wd, people, code)
        const shown = bars.filter((b) => b.lane < MAX_LANES)
        const lanes = Math.min(MAX_LANES, Math.max(0, ...bars.map((b) => b.lane + 1)))
        const hidden = wd.map((_, i) => bars.filter((b) => b.lane >= MAX_LANES && i >= b.start && i < b.start + b.span).length)
        return (
          <div key={wd[0]} className="cal-week" role="row" style={{ gridTemplateRows: `34px repeat(${lanes}, 32px) minmax(30px, 1fr)` }}>
            {wd.map((d, i) => {
              const cov = covOn(d)
              const out = new Date(d).getMonth() !== month
              return (
                <button key={d} className={`cal-day ${out ? 'out' : ''} ${isWeekend(d) ? 'we' : ''}`} style={{ gridColumn: i + 1, gridRow: '1 / -1' }}
                  onClick={() => openDay(d)} aria-label={`${new Date(d).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}, coverage ${cov.label}${cov.ok ? '' : ', below minimum'}`}>
                  <span className={`cal-num ${sameDay(d, today) ? 'today' : ''}`}>{new Date(d).getDate()}</span>
                  <span className="cal-cell-foot">
                    {hidden[i] > 0 && <span className="cal-more">+{hidden[i]} more</span>}
                    <span className={`cov ${cov.ok ? 'ok' : 'low'}`} title={cov.title}>{cov.label}{!cov.ok && ' ⚠'}</span>
                  </span>
                </button>
              )
            })}
            {shown.map((b) => {
              const label = b.code === 'H' ? `Public holiday · ${b.count} off` : `${first(b.name)} · ${SHIFT_CODES[b.code].label}`
              const body = (
                <>
                  {b.code === 'H' ? <span className="ev-av"><Icon name="flag" size={13} /></span> : <Avatar name={b.name} />}
                  <span className="ev-t">{label}</span>
                </>
              )
              const style = { gridColumn: `${b.start + 1} / span ${b.span}`, gridRow: b.lane + 2 }
              const cls = `ev ${b.code} ${b.aid === me.id ? 'mine' : ''}`
              return lead && b.code !== 'H'
                ? <button key={b.key} className={cls} style={style} title={label} onClick={() => setEdit({ aid: b.aid, from: wd[b.start], days: b.span })}>{body}</button>
                : <button key={b.key} className={cls} style={style} title={label} onClick={() => openDay(wd[b.start])}>{body}</button>
            })}
          </div>
        )
      })}
    </div>
  )
}

// ---------- Week ----------
function Chip({ a, c, ts, me, lead, setEdit, sub }) {
  const label = `${a.name} · ${SHIFT_CODES[c].label}`
  const inner = <><Avatar name={a.name} /><span className="ev-t">{first(a.name)}{a.id === me.id && ' (you)'}</span><span className="ev-c">{sub ?? c}</span></>
  return lead
    ? <button className={`ev ${c} ${a.id === me.id ? 'mine' : ''}`} title={label} onClick={() => setEdit({ aid: a.id, from: ts, days: 1 })}>{inner}</button>
    : <div className={`ev ${c} ${a.id === me.id ? 'mine' : ''}`} title={label}>{inner}</div>
}

function WeekView({ days, people, me, lead, today, code, covOn, setEdit, openDay }) {
  return (
    <div className="cal-wk">
      {days.map((d) => {
        const list = people.map((a) => ({ a, c: code(a.id, d) })).sort((x, y) => ORDER.indexOf(x.c) - ORDER.indexOf(y.c))
        const on = list.filter((x) => x.c !== 'OFF')
        const rest = list.length - on.length
        const cov = covOn(d)
        return (
          <div key={d} className={`cal-wk-col ${isWeekend(d) ? 'we' : ''}`}>
            <button className="cal-wk-h" onClick={() => openDay(d)}>
              <span className="muted small">{new Date(d).toLocaleDateString([], { weekday: 'short' })}</span>
              <span className={`cal-num ${sameDay(d, today) ? 'today' : ''}`}>{new Date(d).getDate()}</span>
            </button>
            <div className="stack" style={{ gap: 6 }}>
              {on.map(({ a, c }) => <Chip key={a.id} a={a} c={c} ts={d} me={me} lead={lead} setEdit={setEdit} />)}
              {rest > 0 && <span className="small muted" style={{ padding: '2px 4px' }}>{rest} on rest day</span>}
            </div>
            <span className={`cov ${cov.ok ? 'ok' : 'low'}`} title={cov.title} style={{ marginTop: 'auto' }}>{cov.label}{!cov.ok && ' ⚠'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Day ----------
function DayView({ day, people, me, lead, today, code, covOn, setEdit }) {
  const list = people.map((a) => ({ a, c: code(a.id, day) })).sort((x, y) => ORDER.indexOf(x.c) - ORDER.indexOf(y.c))
  const on = list.filter((x) => SHIFT_CODES[x.c].kind === 'shift')
  const off = list.filter((x) => SHIFT_CODES[x.c].kind !== 'shift')
  const cov = covOn(day)
  const pct = (h) => `${((h - H0) / (H1 - H0)) * 100}%`
  const nowH = new Date().getHours() + new Date().getMinutes() / 60
  const isToday = sameDay(day, today)
  // locationOn uses the rota day index; the pattern only depends on weekday.
  const loc = (a) => locationOn(a, (new Date(day).getDay() + 6) % 7)
  return (
    <div className="stack lg">
      <div className="row">
        <span className={`cov ${cov.ok ? 'ok' : 'low'}`} title={cov.title}>Coverage {cov.label}{!cov.ok && ' ⚠ below minimum'}</span>
        <span className="small muted">{on.length} on shift · {off.length} off</span>
      </div>
      <div className="cal-day-tl">
        <div className="cal-tl-axis">
          <span />
          <div className="cal-tl-track">
            {Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i).filter((h) => h % 2 === 0).map((h) => <span key={h} style={{ left: pct(h) }}>{String(h).padStart(2, '0')}:00</span>)}
          </div>
        </div>
        {on.length === 0 && <div className="muted small" style={{ padding: 12 }}>Nobody is scheduled on shift.</div>}
        {on.map(({ a, c }) => {
          const [s, e] = span(SHIFT_CODES[c].time)
          return (
            <div key={a.id} className="cal-tl-row">
              <span className="cal-tl-name">{a.name}{a.id === me.id && <span className="muted"> (you)</span>}</span>
              <div className="cal-tl-track">
                {isToday && nowH >= H0 && nowH <= H1 && <i className="cal-now" style={{ left: pct(nowH) }} />}
                {(() => {
                  const inner = <><Avatar name={a.name} /><span className="ev-t">{SHIFT_CODES[c].label} {SHIFT_CODES[c].time}</span><span className="ev-c">{loc(a)}</span></>
                  const style = { left: pct(s), width: `calc(${pct(e)} - ${pct(s)})` }
                  return lead
                    ? <button className={`ev ${c} ${a.id === me.id ? 'mine' : ''}`} style={style} onClick={() => setEdit({ aid: a.id, from: day, days: 1 })}>{inner}</button>
                    : <div className={`ev ${c} ${a.id === me.id ? 'mine' : ''}`} style={style}>{inner}</div>
                })()}
              </div>
            </div>
          )
        })}
      </div>
      {off.length > 0 && (
        <div className="stack">
          <span className="section-title">Not on shift</span>
          <div className="row">{off.map(({ a, c }) => <Chip key={a.id} a={a} c={c} ts={day} me={me} lead={lead} setEdit={setEdit} sub={SHIFT_CODES[c].label} />)}</div>
        </div>
      )}
    </div>
  )
}

// ---------- Editor ----------
function ShiftEditor({ edit, onClose, code }) {
  const { state, dispatch } = useStore()
  const a = state.analysts.find((x) => x.id === edit.aid)
  const days = Array.from({ length: edit.days }, (_, i) => addDays(edit.from, i))
  const [pick, setPick] = useState(code(edit.aid, edit.from))
  const fmt = (ts) => new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  const seeded = dayIndex(state.schedule, edit.from)
  const save = () => {
    dispatch({ type: 'setShift', items: days.map((ts) => ({ aid: a.id, ts, code: pick })) })
    dispatch({ type: 'toast', text: `${first(a.name)}: ${SHIFT_CODES[pick].label} on ${days.length > 1 ? `${days.length} days` : fmt(edit.from)}` })
    onClose()
  }
  return (
    <Modal title={a.name} sub={days.length > 1 ? `${fmt(days[0])} – ${fmt(days[days.length - 1])} · ${days.length} days` : fmt(edit.from)} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      <div className="code-grid" role="radiogroup" aria-label="Shift">
        {Object.entries(SHIFT_CODES).map(([k, v]) => (
          <button key={k} role="radio" aria-checked={pick === k} className={`code-opt ${pick === k ? 'on' : ''}`} onClick={() => setPick(k)}>
            <i className={`ev-sw ${k}`} />
            <span className="stack" style={{ gap: 0 }}><b>{v.label}</b><span className="small muted">{v.time || (v.kind === 'off' ? 'Not working' : 'Full day')}</span></span>
          </button>
        ))}
      </div>
      {seeded < 0 || seeded > 13
        ? <span className="small muted">Outside the published two-week rota, so this saves as a planned change.</span>
        : <span className="small muted">Updates the published rota, Home schedule and coverage straight away.</span>}
    </Modal>
  )
}

// ---------- Home preview ----------
// A read-only, one-week slice of the calendar. Clicking a day or bar opens
// the full calendar on that day.
const PREVIEW_LANES = 2

// Who is working today, collapsed to one line. Opens a dropdown with names.
function TodayDropdown({ groups, detail }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const k = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', h)
    window.addEventListener('keydown', k)
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('keydown', k) }
  }, [open])
  return (
    <div className="today-dd" ref={ref}>
      <button className="today-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <b>Today</b>
        {groups.map(([l, list, tone]) => <span key={l} className="today-chip"><i className={`ev-sw ${tone}`} />{l} <b className="num">{list.length}</b></span>)}
        <span className="spacer" />
        <Icon name={open ? 'chevUp' : 'chevDown'} size={16} />
      </button>
      {open && (
        <div className="today-pop" role="dialog" aria-label="Who is working today">
          {groups.map(([l, list, tone]) => (
            <div key={l} className="today-g">
              <span className="eyebrow"><i className={`ev-sw ${tone}`} />{l} · {list.length}</span>
              {list.length ? list.map((a) => (
                <div key={a.id} className="today-row"><span className="ev-av">{initials(a.name)}</span><span className="ev-t">{a.name}</span><span className="small muted">{detail(a)}</span></div>
              )) : <span className="small muted">Nobody</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WeekPreview({ onOpen }) {
  const { state } = useStore()
  const me = currentUser(state)
  const people = state.analysts
  const today = startOfDay(state.now)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i))
  const code = (aid, ts) => codeAt(state.schedule, people, aid, ts)
  const covOn = (ts) => coverage(people.map((a) => code(a.id, ts)), isWeekend(ts))
  const short = days.filter((d) => !covOn(d).ok).length
  const dow = (new Date(today).getDay() + 6) % 7
  const onShift = (a) => SHIFT_CODES[code(a.id, today)].kind === 'shift'
  const groups = [
    ['Online now', people.filter((a) => a.status === 'online'), 'E'],
    ['Onsite', people.filter((a) => onShift(a) && locationOn(a, dow) === 'Onsite'), 'M'],
    ['WFH', people.filter((a) => onShift(a) && locationOn(a, dow) === 'WFH'), 'ice'],
    ['On leave', people.filter((a) => ['PL', 'SL'].includes(code(a.id, today))), 'PL'],
  ]
  const bars = weekBars(days, people, code)
  const lanes = Math.min(PREVIEW_LANES, Math.max(0, ...bars.map((b) => b.lane + 1)))
  const hidden = days.map((_, i) => bars.filter((b) => b.lane >= PREVIEW_LANES && i >= b.start && i < b.start + b.span).length)
  return (
    <div className="card cal cal-preview" data-tour="schedule">
      <div className="cal-head">
        <div className="stack" style={{ gap: 2 }}>
          <h2>Schedule this week</h2>
          <span className="muted small">{new Date(days[0]).toLocaleDateString([], { month: 'short', day: 'numeric' })} – {new Date(days[6]).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        </div>
        <span className="spacer" />
        <span className={`pill ${short ? 'crit' : 'good'}`}><Icon name={short ? 'alert' : 'check'} size={12} stroke={2.4} />{short ? `${short} day${short > 1 ? 's' : ''} short` : 'Fully covered'}</span>
        <button className="btn ghost sm" onClick={() => onOpen()}>Open schedule <Icon name="arrowR" size={14} /></button>
      </div>
      <TodayDropdown groups={groups} detail={(a) => {
        const c = code(a.id, today)
        return SHIFT_CODES[c].kind === 'shift' ? `${SHIFT_CODES[c].label} · ${locationOn(a, dow)}` : SHIFT_CODES[c].label
      }} />
      <div className="cal-month">
        <div className="cal-dow">{days.map((d) => <span key={d}>{new Date(d).toLocaleDateString([], { weekday: 'short' }).slice(0, 2)}</span>)}</div>
        <div className="cal-week" style={{ gridTemplateRows: `32px repeat(${lanes}, 30px) minmax(44px, 1fr)` }}>
          {days.map((d, i) => {
            const cov = covOn(d)
            const working = people.filter((a) => SHIFT_CODES[code(a.id, d)].kind === 'shift').length
            return (
              <button key={d} className={`cal-day ${isWeekend(d) ? 'we' : ''}`} style={{ gridColumn: i + 1, gridRow: '1 / -1' }} onClick={() => onOpen({ view: 'day', date: d })}
                aria-label={`${new Date(d).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}: ${working} working, coverage ${cov.label}${cov.ok ? '' : ', below minimum'}`}>
                <span className={`cal-num ${sameDay(d, today) ? 'today' : ''}`}>{new Date(d).getDate()}</span>
                <span className="cal-cell-foot">
                  {hidden[i] > 0 && <span className="cal-more">+{hidden[i]}</span>}
                  <span className="cal-working"><b className="num">{working}</b> on</span>
                  <span className={`cov ${cov.ok ? 'ok' : 'low'}`} title={cov.title}>{cov.label}{!cov.ok && ' ⚠'}</span>
                </span>
              </button>
            )
          })}
          {bars.filter((b) => b.lane < PREVIEW_LANES).map((b) => {
            const label = b.code === 'H' ? `Holiday · ${b.count} off` : `${first(b.name)} · ${b.code}`
            return (
              <button key={b.key} className={`ev ${b.code} ${b.aid === me.id ? 'mine' : ''}`} style={{ gridColumn: `${b.start + 1} / span ${b.span}`, gridRow: b.lane + 2 }}
                title={b.code === 'H' ? label : `${b.name} · ${SHIFT_CODES[b.code].label}`} onClick={() => onOpen({ view: 'day', date: days[b.start] })}>
                {b.code === 'H' ? <span className="ev-av"><Icon name="flag" size={12} /></span> : <Avatar name={b.name} />}
                <span className="ev-t">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
