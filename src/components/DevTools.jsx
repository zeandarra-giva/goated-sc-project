import { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { Icon, Seg } from './ui.jsx'

// Prototype-only controls. Everything here simulates the outside world
// (ServiceNow intake, who is signed in) and is not part of the product UI.
export default function DevTools() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.shiftKey && e.altKey && e.code === 'KeyD') setOpen((o) => !o)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  const burst = () => { for (let i = 0; i < 5; i++) dispatch({ type: 'intake' }) }
  return (
    <div className="dev">
      {open && (
        <div className="dev-panel" role="dialog" aria-label="Prototype controls">
          <div className="row">
            <b>Prototype controls</b>
            <span className="spacer" />
            <span className="dash-chip">Dev only</span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Simulates ServiceNow and sign-in. These controls won't ship in the product.</p>
          <div className="stack">
            <span className="eyebrow">View as</span>
            <Seg value={state.role} onChange={(role) => dispatch({ type: 'role', role })} options={[{ id: 'lead', label: 'Team lead' }, { id: 'analyst', label: 'Analyst' }]} />
          </div>
          <div className="stack">
            <span className="eyebrow">Onboarding</span>
            <button className="btn sm primary" style={{ alignSelf: 'flex-start' }} onClick={() => { setOpen(false); dispatch({ type: 'tourStart' }) }}><Icon name="flag" size={14} />Start onboarding tour</button>
          </div>
          <div className="stack">
            <span className="eyebrow">ServiceNow intake</span>
            <div className="dev-actions">
              <button className="btn sm" onClick={() => dispatch({ type: 'intake' })}><Icon name="plus" size={14} />Pull incident</button>
              <button className="btn sm" onClick={() => dispatch({ type: 'intake', priority: 'P1' })}><Icon name="alert" size={14} />Pull P1</button>
              <button className="btn sm" onClick={burst}><Icon name="bolt" size={14} />Burst of 5</button>
              <button className="btn sm" onClick={() => dispatch({ type: 'sync' })}><Icon name="refresh" size={14} />Force sync</button>
            </div>
          </div>
          <div className="stack">
            <span className="eyebrow">Data</span>
            <div className="dev-actions">
              <button className="btn sm danger" onClick={() => dispatch({ type: 'reset' })}><Icon name="refresh" size={14} />Reset sample data</button>
            </div>
          </div>
          <span className="small muted">Shortcut: <span className="kbd">Shift</span> + <span className="kbd">Alt</span> + <span className="kbd">D</span></span>
        </div>
      )}
      <button className="dev-fab" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Prototype controls" title="Prototype controls">
        <Icon name={open ? 'x' : 'code'} size={18} />
        <span>Dev</span>
      </button>
    </div>
  )
}
