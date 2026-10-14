import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store.jsx'

const PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16l-4.3-4.3',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  team: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10a7 7 0 0 1 14 0m1-10a3 3 0 1 0 0-6m3 16a6 6 0 0 0-4-5.6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.3-1.3L14.4 3h-4l-.4 2.4a7 7 0 0 0-2.2 1.3l-2.3-.9-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.6l-2 1.5 2 3.4 2.3-.9c.7.6 1.4 1 2.2 1.3l.4 2.4h4l.4-2.4c.8-.3 1.6-.7 2.3-1.3l2.3.9 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9m4.3 13a2 2 0 0 0 3.4 0',
  plus: 'M12 5v14M5 12h14',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  swap: 'M7 4L3 8l4 4M3 8h14m0 12l4-4-4-4m4 4H7',
  clip: 'M9 4h6v3H9zM7 5H5v16h14V5h-2',
  pause: 'M8 5v14m8-14v14',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-11',
  alert: 'M12 3l10 18H2zm0 7v5m0 3v.5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2',
  key: 'M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
  spark: 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zm16 0h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  refresh: 'M20 11a8 8 0 0 0-14.7-4M4 4v4h4m-4 5a8 8 0 0 0 14.7 4M20 20v-4h-4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v5m8-5v5',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7m-7 4h5',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  arrowR: 'M5 12h14m-6-6l6 6-6 6',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  lock: 'M6 11h12v10H6zm2 0V8a4 4 0 0 1 8 0v3',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  chevUp: 'M6 15l6-6 6 6',
  chevDown: 'M6 9l6 6 6-6',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  logout: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h11',
  code: 'M8 6l-6 6 6 6M16 6l6 6-6 6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8.5v.5',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
}

// Solid versions for decorative use (KPI card backgrounds). Cut-outs use evenodd.
const FILLED = {
  alert: 'M12 2.2L23.2 21.6H.8zM10.8 9h2.4v6.2h-2.4zM10.8 16.8h2.4v2.4h-2.4z',
  bolt: 'M13.5 1L3 14h7.2L9 23l12-13.6h-7.4z',
  clock: 'M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22zM10.8 5h2.4v6.4l4.2 2.5-1.2 2-5.4-3.2z',
  team: 'M9 2.5a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6zM.8 21.5a8.2 8.2 0 0 1 16.4 0zM17.2 3.6a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2zM17.6 13.2a6.6 6.6 0 0 1 5.6 8.3h-4.4a10 10 0 0 0-2.9-7.6z',
  doc: 'M5 1h10.5L20 5.5V23H5zM8 11h9v2.2H8zM8 15.5h6.5v2.2H8z',
  pause: 'M4.5 2.5h5.5v19H4.5zM14 2.5h5.5v19H14z',
  check: 'M12 1a11 11 0 1 1 0 22 11 11 0 0 1 0-22zM6.3 12.4l1.7-1.7 2.7 2.7 5.4-5.4 1.7 1.7-7.1 7.1z',
  shield: 'M12 1l9.5 3.6v7c0 6.2-4.2 10.2-9.5 11.6C6.7 21.8 2.5 17.8 2.5 11.6v-7z',
  swap: 'M7.5 1.5L1 8l6.5 6.5V10H21V6H7.5zM16.5 9.5L23 16l-6.5 6.5V18H3v-4h13.5z',
  clip: 'M8 1h8v4H8zM4.5 3H7v3.5h10V3h2.5A1.5 1.5 0 0 1 21 4.5v17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 21.5v-17A1.5 1.5 0 0 1 4.5 3z',
  cal: 'M6 1h3v3H6zM15 1h3v3h-3zM2.5 4h19v18.5h-19zM5 9v11h14V9zM7 11h3.2v3.2H7zM11.4 11h3.2v3.2h-3.2zM7 15.4h3.2v3.2H7z',
  user: 'M12 1.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM2.5 22.5a9.5 9.5 0 0 1 19 0z',
  bell: 'M12 1a7 7 0 0 1 7 7c0 7 3.5 9.5 3.5 9.5h-21S5 15 5 8a7 7 0 0 1 7-7zM8.8 19.5h6.4a3.2 3.2 0 0 1-6.4 0z',
}

export function Icon({ name, size = 18, stroke = 1.8, filled }) {
  if (filled && FILLED[name]) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={FILLED[name]} fillRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Modal({ title, sub, onClose, children, footer, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h">
          <div className="stack" style={{ gap: 2, flex: 1 }}>
            <h2>{title}</h2>
            {sub && <div className="muted small">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// Side panel. Its width can be dragged from the left edge (or changed with
// the arrow keys on the handle); each kind of drawer remembers its width.
const DRAWER_MIN = 360
const clampDrawer = (w) => Math.max(DRAWER_MIN, Math.min(window.innerWidth - 24, w))

export function Drawer({ title, sub, onClose, children, actions, className = '' }) {
  const key = `scope-drawer-w:${className || 'default'}`
  const [width, setWidth] = useState(() => { try { return +localStorage.getItem(key) || null } catch { return null } })
  const latest = useRef(width)
  latest.current = width
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const save = (w) => { try { w ? localStorage.setItem(key, String(Math.round(w))) : localStorage.removeItem(key) } catch { /* storage blocked */ } }
  const startDrag = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    document.body.classList.add('resizing')
    const move = (ev) => { latest.current = clampDrawer(window.innerWidth - 12 - ev.clientX); setWidth(latest.current) }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      document.body.classList.remove('resizing')
      save(latest.current)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const nudge = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const base = latest.current || e.currentTarget.parentElement.getBoundingClientRect().width || DRAWER_MIN
    const w = clampDrawer(base + (e.key === 'ArrowLeft' ? 40 : -40))
    latest.current = w
    setWidth(w); save(w)
  }
  const reset = () => { setWidth(null); save(null) }
  return createPortal(
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className={`drawer ${className}`} style={width ? { width: clampDrawer(width) } : undefined} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="drawer-resize" role="separator" aria-orientation="vertical" aria-label="Resize panel" title="Drag to resize · double-click to reset" tabIndex={0}
          onPointerDown={startDrag} onKeyDown={nudge} onDoubleClick={reset} />
        <div className="drawer-h">
          <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>{title}{sub}</div>
          {actions}
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        </div>
        <div className="drawer-b">{children}</div>
      </aside>
    </>,
    document.body,
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} className="tab" role="tab" data-tour={`tab-${t.id}`} aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.count != null && <span className="ct">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

// The "i" button in a card's top-right corner. Explains how a figure is
// calculated, so the card itself only carries the figure.
// The "i" button in a card's top-right corner. Opens a side panel that
// explains how the card's number is calculated.
export function InfoTip({ title, children }) {
  const [open, setOpen] = useState(false)
  const btn = useRef(null)
  const close = () => { setOpen(false); btn.current?.focus() }
  return (
    <span className="info">
      <button ref={btn} className="info-btn" aria-label={`How ${title} works`} aria-haspopup="dialog" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen(true) }}>
        <Icon name="info" size={16} />
      </button>
      {open && createPortal(
        // Portal events still bubble through the React tree; keep them away from clickable cards.
        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <Drawer className="info-drawer" onClose={close} title={<><span className="eyebrow">How it's calculated</span><h2>{title}</h2></>}>
            <div className="stack ink2" style={{ gap: 12 }}>{children}</div>
          </Drawer>
        </div>,
        document.body,
      )}
    </span>
  )
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

// KPI card: a tinted card with its icon, filled and oversized, as a decorative
// shape in the top-right corner. Tones are Citi blue variants;
// a semantic state (good / warn / crit) overrides the tone.
export function KpiShell({ label, icon, tone = 'sky', state, info, children, className = '', ...rest }) {
  return (
    <div className={`card kpi k-${state || tone} ${state ? 'state-' + state : ''} ${className}`} {...rest}>
      {icon && <span className="kpi-art" aria-hidden="true"><Icon name={icon} size={132} filled /></span>}
      {info && <InfoTip title={label}>{info}</InfoTip>}
      <div className="kpi-label">{label}</div>
      {children}
    </div>
  )
}

export function Kpi({ value, unit, foot, children, ...shell }) {
  return (
    <KpiShell {...shell}>
      <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <div className="kpi-v">{value}{unit && <small>{unit}</small>}</div>
        {children}
      </div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </KpiShell>
  )
}

export const SlaPill = ({ status }) => <span className={`pill ${status === 'Breached' ? 'crit' : status === 'At risk' ? 'warn' : 'good'}`}>{status}</span>
export const Prio = ({ p }) => <span className={`prio ${p}`}>{p}</span>

export function Toasts() {
  const { state, dispatch } = useStore()
  useEffect(() => {
    if (!state.toasts.length) return
    const t = setTimeout(() => dispatch({ type: 'dismissToast', id: state.toasts[0].id }), 3800)
    return () => clearTimeout(t)
  }, [state.toasts, dispatch])
  return (
    <div className="toasts" aria-live="polite">
      {state.toasts.map((t) => (
        <div className="toast" key={t.id}><Icon name="check" size={16} />{t.text}</div>
      ))}
    </div>
  )
}

export function Ring({ value, tone = 'good', label }) {
  const r = 38, c = 2 * Math.PI * r
  const color = tone === 'crit' ? 'var(--crit)' : tone === 'warn' ? 'var(--butter)' : 'var(--sage)'
  return (
    <div className="ring" aria-label={label}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} />
      </svg>
      <b>{Math.round(value * 100)}</b>
    </div>
  )
}

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

const niceMax = (v) => {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
const fmtTick = (v) => (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(1))

// Line chart: up to 3 series, one y-axis, crosshair tooltip, optional goal line.
export function LineChart({ labels, series, height = 220, goal, unit = '', fmt = (v) => fmtTick(v) + unit }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const pad = { l: 40, r: 16, t: 14, b: 26 }
  const iw = Math.max(50, w - pad.l - pad.r), ih = height - pad.t - pad.b
  const max = niceMax(Math.max(...series.flatMap((s) => s.values.filter((v) => v != null)), goal || 0) * 1.05)
  const x = (i) => pad.l + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw)
  const y = (v) => pad.t + ih - (v / max) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const every = Math.ceil(labels.length / Math.max(2, Math.floor(iw / 70)))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height} role="img" aria-label={series.map((s) => s.name).join(', ')}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const bx = e.currentTarget.getBoundingClientRect().left
          const i = Math.round(((e.clientX - bx - pad.l) / iw) * (labels.length - 1))
          setHover(Math.max(0, Math.min(labels.length - 1, i)))
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-l" x1={pad.l} x2={pad.l + iw} y1={y(t)} y2={y(t)} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">{fmtTick(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => i % every === 0 && <text key={i} x={x(i)} y={height - 6} textAnchor="middle">{l}</text>)}
        {goal != null && (
          <g>
            <line x1={pad.l} x2={pad.l + iw} y1={y(goal)} y2={y(goal)} stroke="var(--crit)" strokeDasharray="4 4" strokeWidth="1.5" />
            <text x={pad.l + iw} y={y(goal) - 5} textAnchor="end" style={{ fill: 'var(--crit)' }}>Goal {fmt(goal)}</text>
          </g>
        )}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean)
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join('')
          return (
            <g key={s.name}>
              {si === 0 && series.length === 1 && <path d={`${d}L${pts[pts.length - 1][0]},${y(0)}L${pts[0][0]},${y(0)}Z`} fill={s.color} opacity=".1" />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
            </g>
          )
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--line-strong)" />
            {series.map((s) => s.values[hover] != null && <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(x(hover) + 10, w - 150), top: 8 }}>
          <b>{labels[hover]}</b>
          {series.map((s) => (
            <div key={s.name} className="row tight"><i style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} /> {s.name}: <b className="num">{s.values[hover] == null ? '—' : fmt(s.values[hover])}</b></div>
          ))}
        </div>
      )}
      {series.length > 1 && (
        <div className="legend" style={{ marginTop: 4 }}>
          {series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
        </div>
      )}
    </div>
  )
}

// Vertical bars, single series, per-bar hover.
export function BarChart({ labels, values, height = 200, color = 'var(--s2)', fmt = fmtTick, highlight }) {
  const [ref, w] = useWidth()
  const [hover, setHover] = useState(null)
  const pad = { l: 36, r: 8, t: 12, b: 26 }
  const iw = Math.max(50, w - pad.l - pad.r), ih = height - pad.t - pad.b
  const max = niceMax(Math.max(...values, 0) * 1.05)
  const bw = iw / labels.length
  const gap = Math.min(8, bw * 0.25)
  const y = (v) => pad.t + ih - (v / max) * ih
  const every = Math.ceil(labels.length / Math.max(2, Math.floor(iw / 56)))
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height} role="img">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line className="grid-l" x1={pad.l} x2={pad.l + iw} y1={y(f * max)} y2={y(f * max)} />
            <text x={pad.l - 6} y={y(f * max) + 4} textAnchor="end">{fmtTick(f * max)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const bx = pad.l + i * bw + gap / 2, bh = Math.max(0, (v / max) * ih)
          const r = Math.min(4, bh, (bw - gap) / 2)
          const top = y(v), bot = pad.t + ih, x2 = bx + bw - gap
          const d = `M${bx},${bot}V${top + r}Q${bx},${top} ${bx + r},${top}H${x2 - r}Q${x2},${top} ${x2},${top + r}V${bot}Z`
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
              <path d={d} fill={highlight === i ? 'var(--s1)' : color} opacity={hover == null || hover === i ? 1 : 0.55} />
            </g>
          )
        })}
        {labels.map((l, i) => i % every === 0 && <text key={i} x={pad.l + i * bw + bw / 2} y={height - 6} textAnchor="middle">{l}</text>)}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: Math.min(pad.l + hover * bw + bw / 2, w - 120), top: Math.max(0, y(values[hover]) - 40) }}>
          <b>{labels[hover]}</b>: <span className="num">{fmt(values[hover])}</span>
        </div>
      )}
    </div>
  )
}

// Ranked horizontal bars rendered in HTML; optional target marker.
export function HBars({ rows, max, fmt = (v) => v, color = 'var(--s7)', target, onClick }) {
  const m = max || Math.max(...rows.map((r) => r.value), target || 0, 1)
  return (
    <div className="stack" style={{ gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} className="hbar" title={`${r.label}: ${fmt(r.value)}`} style={{ cursor: onClick ? 'pointer' : undefined }} onClick={() => onClick?.(r)}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(r.value / m) * 100}%`, background: r.color || color }} />
            {target != null && <div className="hbar-mark" style={{ left: `${(target / m) * 100}%` }} />}
          </div>
          <b className="num" style={{ textAlign: 'right' }}>{fmt(r.value)}</b>
        </div>
      ))}
    </div>
  )
}

export async function copyText(text, dispatch) {
  try {
    await navigator.clipboard.writeText(text)
    dispatch({ type: 'toast', text: 'Copied to clipboard' })
  } catch {
    dispatch({ type: 'toast', text: 'Copy is blocked here. Select the text and copy it manually.' })
  }
}
