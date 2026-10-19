import { useEffect, useRef, useState } from 'react'
import { currentUser, useStore } from '../store.jsx'
import { useNav } from '../App.jsx'
import { Icon, Kpi, Modal, Tabs } from '../components/ui.jsx'
import { DocText } from '../components/Doc.jsx'
import { DAY, fmtDate, fmtDateTime, fmtTime } from '../data.js'
import { ATTACH_TYPES, DATA_SOURCES, PAGE_KINDS, REVIEW_AFTER_DAYS, findConflicts, findGaps, isDirty, pageStatus, reviewDue } from '../kb.js'

let seq = 0
const newId = (p) => `${p}-${Date.now().toString(36)}${++seq}`
const INDEX_MS = 1400

// Reads an attached file into an editable text block. TXT and CSV are read
// for real; PDF, Word and image text extraction (OCR) is simulated here.
function readFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const type = { pdf: 'PDF', doc: 'DOC', docx: 'DOCX', txt: 'TXT', csv: 'CSV', png: 'Image', jpg: 'Image', jpeg: 'Image' }[ext] || ext.toUpperCase()
  const size = file.size < 1024 ? `${file.size} B` : file.size < 1048576 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / 1048576).toFixed(1)} MB`
  const base = { id: newId('att'), name: file.name, type, size }
  return new Promise((resolve) => {
    if (ext === 'txt' || ext === 'csv') {
      const r = new FileReader()
      r.onload = () => resolve({ ...base, text: String(r.result).slice(0, 6000) })
      r.onerror = () => resolve({ ...base, text: '' })
      r.readAsText(file)
    } else if (!file.size) resolve({ ...base, text: '' })
    else resolve({ ...base, text: type === 'Image' ? `Text read from ${file.name} with OCR (simulated in the prototype). Replace this with what the image shows.` : `Text extracted from ${file.name} (simulated in the prototype). Replace this with the document's content.` })
  })
}

export default function KnowledgeBase({ route }) {
  const { state } = useStore()
  const kb = state.kb
  const [tab, setTab] = useState(route.tab || 'library')
  const first = route.page && kb.pages.find((p) => p.id === route.page)
  const [kbId, setKbId] = useState(first?.kbId || kb.kbs.find((k) => k.isDefault)?.id || kb.kbs[0].id)
  const [pageId, setPageId] = useState(first?.id || null)
  const [creating, setCreating] = useState(route.create ? { title: route.create, codes: route.code ? [route.code] : [] } : null)
  const open = (p) => { setKbId(p.kbId); setPageId(p.id); setTab('library') }
  // Links from Copilot and other pages arrive while this page may already be open.
  useEffect(() => {
    const p = route.page && kb.pages.find((x) => x.id === route.page)
    if (p) open(p)
    if (route.create) setCreating({ title: route.create, codes: route.code ? [route.code] : [] })
    if (route.tab) setTab(route.tab)
  }, [route.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const conflicts = findConflicts(kb)
  const gaps = findGaps(kb, state.history, state.now).filter((g) => g.uses > 0)
  const stale = kb.pages.filter((p) => reviewDue(p, state.now))
  const failed = kb.pages.filter((p) => p.index === 'failed')
  const live = kb.pages.filter((p) => p.live)
  const dirty = kb.pages.filter((p) => p.live && isDirty(p))
  const issues = conflicts.length + gaps.length + stale.length + failed.length

  return (
    <>
      <section className="grid g-kpi">
        <Kpi label="Published pages" icon="doc" value={live.length} unit={`of ${kb.pages.length}`} foot={`${kb.pages.length - live.length} draft only · ${kb.kbs.length} knowledge bases`}
          info={<><span>Pages with at least one published, indexed version. Copilot searches only these.</span><span>A draft-only page is invisible to Copilot until a team lead publishes it.</span></>} />
        <Kpi label="Index health" icon="check" tone="azure" state={failed.length ? 'warn' : undefined} value={kb.pages.filter((p) => p.index === 'indexed').length} unit="indexed"
          foot={failed.length ? `${failed.length} failed · Copilot keeps the last good version` : 'Every published page is indexed'}
          info={<><span>Publishing splits a page into passages and indexes them for search.</span><span>If indexing fails, the page shows <b>Index failed</b> and Copilot keeps using the last version that indexed, so a bad edit can't break answers.</span></>} />
        <Kpi label="Unpublished changes" icon="clip" tone="ice" value={dirty.length} foot={`${kb.pages.filter((p) => p.review).length} waiting for review`}
          info={<span>Published pages with draft edits Copilot can't see yet. Analysts request a review; a team lead publishes.</span>} />
        <Kpi label="Needs attention" icon="alert" tone="navy" state={issues ? 'warn' : 'good'} value={issues} foot={`${conflicts.length} conflicts · ${gaps.length} gaps · ${stale.length} review due`}
          info={<><span>Sum of: conflicting SLA targets, resolution codes used in the last 30 days without a published runbook, pages not reviewed for {REVIEW_AFTER_DAYS} days, and failed indexes.</span></>} />
      </section>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'library', label: 'Library', icon: 'book', count: kb.pages.length },
        { id: 'health', label: 'Health', icon: 'shield', count: issues },
      ]} />
      {tab === 'library' && <Library kbId={kbId} setKbId={(id) => { setKbId(id); setPageId(null) }} pageId={pageId} setPageId={setPageId} onCreate={setCreating} />}
      {tab === 'health' && <Health conflicts={conflicts} gaps={gaps} stale={stale} failed={failed} onOpen={open} onCreate={setCreating} />}
      {creating && <NewPage seed={creating} kbId={kbId} onClose={() => setCreating(null)} onDone={(p) => { setCreating(null); open(p) }} />}
    </>
  )
}

// ---------- Library ----------
// A grid of page cards (or a list), filtered by chips and search. Opening a
// card shows the page; "Library" goes back to the grid.
const VIEW_KEY = 'scope-kb-view'
const readView = () => { try { return localStorage.getItem(VIEW_KEY) || 'grid' } catch { return 'grid' } }
const CHIPS = [['all', 'All'], ['recent', 'Recent'], ['folders', 'Folders'], ['data', 'Data tables'], ['attention', 'Needs attention']]
// First lines of a page with the markup stripped, for card previews.
const preview = (body) => body.split('\n').filter((l) => l.trim() && !l.startsWith('## ')).map((l) => l.replace(/^([-*]|\d+\.)\s+/, '').replace(/\*\*|`/g, '')).join(' · ')

function Library({ kbId, setKbId, pageId, setPageId, onCreate }) {
  const { state } = useStore()
  const kb = state.kb
  const lead = state.role === 'lead'
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('all')
  const [folderId, setFolderId] = useState(null)
  const [view, setViewRaw] = useState(readView)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(null)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menu) return
    const h = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menu])
  const setView = (v) => { setViewRaw(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* storage blocked */ } }

  const cur = kb.kbs.find((k) => k.id === kbId)
  const folders = kb.folders.filter((f) => f.kbId === kbId)
  const linked = state.copilot.config.kbIds.includes(kbId)
  const conflictIds = new Set(findConflicts(kb).flatMap((c) => c.off.map((o) => o.page.id)))
  const attention = (p) => p.index === 'failed' || !p.live || isDirty(p) || reviewDue(p, state.now) || conflictIds.has(p.id)
  const all = kb.pages.filter((p) => p.kbId === kbId)
  let pages = all.filter((p) => !q || `${p.draft.title} ${p.codes.join(' ')} ${p.kind} ${p.draft.body}`.toLowerCase().includes(q.toLowerCase()))
  if (folderId) pages = pages.filter((p) => p.folderId === folderId)
  if (chip === 'data') pages = pages.filter((p) => p.data)
  if (chip === 'attention') pages = pages.filter(attention)
  pages = chip === 'recent' ? [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12) : [...pages].sort((a, b) => a.draft.title.localeCompare(b.draft.title))
  const folder = folders.find((f) => f.id === folderId)
  const page = kb.pages.find((p) => p.id === pageId)
  const pickChip = (id) => { setChip(id); setFolderId(null) }
  const showFolders = chip === 'folders' && !folderId && !q

  if (page) {
    return (
      <>
        <div className="row">
          <button className="btn ghost sm" onClick={() => setPageId(null)}><Icon name="chevL" size={14} />Library</button>
          <span className="muted small">{kb.kbs.find((k) => k.id === page.kbId)?.name} / {kb.folders.find((f) => f.id === page.folderId)?.name}</span>
        </div>
        <PageView key={page.id} page={page} />
      </>
    )
  }
  return (
    <>
      <div className="kb-toolbar">
        <select id="kb-pick" className="in kb-select" value={kbId} onChange={(e) => { setKbId(e.target.value); setFolderId(null) }} aria-label="Knowledge base">
          {kb.kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <div className="kb-chips" role="group" aria-label="Show">
          {CHIPS.map(([id, label]) => <button key={id} aria-pressed={chip === id} onClick={() => pickChip(id)}>{label}</button>)}
        </div>
        <div className="kb-tools">
        <div className="view-toggle" role="group" aria-label="Layout">
          <button aria-pressed={view === 'grid'} aria-label="Grid view" title="Grid view" onClick={() => setView('grid')}><Icon name="grid" size={16} /></button>
          <button aria-pressed={view === 'list'} aria-label="List view" title="List view" onClick={() => setView('list')}><Icon name="list" size={16} /></button>
        </div>
        <label className="kb-search"><Icon name="search" size={16} /><input id="kb-filter" placeholder="Search library" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search library" /></label>
        <div className="pop-anchor" ref={menuRef}>
          <button className="btn primary" onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}><Icon name="plus" size={15} />New<Icon name="chevDown" size={14} /></button>
          {menu && (
            <div className="popover new-menu" role="menu">
              <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); onCreate({ title: '', folderId: folderId || undefined }) }}><Icon name="doc" size={16} />Page</button>
              {lead && <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); setModal('folder') }}><Icon name="folder" size={16} />Folder</button>}
              {lead && <button role="menuitem" className="menu-item" onClick={() => { setMenu(false); setModal('kb') }}><Icon name="book" size={16} />Knowledge base</button>}
            </div>
          )}
        </div>
        </div>
      </div>
      <div className="row small">
        {folder ? (
          <><button className="btn ghost sm" onClick={() => setFolderId(null)}><Icon name="chevL" size={14} />Folders</button><b>{folder.name}</b><span className="muted">{pages.length} pages</span></>
        ) : <span className="ink2">{cur.desc}</span>}
        <span className="spacer" />
        <span className={`pill ${linked ? 'accent' : 'plain'}`}><Icon name="spark" size={12} />{linked ? 'Linked to Copilot' : 'Not linked to Copilot'}</span>
      </div>

      {showFolders ? (
        <div className="kb-grid">
          {folders.map((f) => {
            const fp = all.filter((p) => p.folderId === f.id)
            const att = fp.filter(attention).length
            return (
              <button key={f.id} className="kb-card" onClick={() => setFolderId(f.id)}>
                <div className="kb-card-h"><Icon name="folder" size={16} /><span className="t">{f.name}</span></div>
                <div className="kb-card-b kb-card-folder">
                  <Icon name="folderOpen" size={44} stroke={1.4} />
                  <ul>{fp.slice(0, 3).map((p) => <li key={p.id}>{p.draft.title}</li>)}</ul>
                </div>
                <div className="kb-card-f"><span className="muted">{fp.length} page{fp.length === 1 ? '' : 's'}</span><span className="spacer" />{att > 0 && <span className="pill warn xs">{att} need attention</span>}</div>
              </button>
            )
          })}
          {lead && <button className="kb-card kb-card-new" onClick={() => setModal('folder')}><Icon name="plus" size={22} />New folder</button>}
        </div>
      ) : view === 'grid' ? (
        <div className="kb-grid">
          {pages.map((p) => <PageCard key={p.id} p={p} folder={folders.find((f) => f.id === p.folderId)} onOpen={() => setPageId(p.id)} conflict={conflictIds.has(p.id)} />)}
          {!q && chip === 'all' && <button className="kb-card kb-card-new" onClick={() => onCreate({ title: '', folderId: folderId || undefined })}><Icon name="plus" size={22} />New page</button>}
        </div>
      ) : (
        <section className="card">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Page</th><th>Folder</th><th>Type</th><th>Status</th><th>Copilot reads</th><th>Last edited</th></tr></thead>
              <tbody>
                {pages.map((p) => {
                  const st = pageStatus(p)
                  return (
                    <tr key={p.id} className="click" onClick={() => setPageId(p.id)}>
                      <td><span className="row tight" style={{ flexWrap: 'nowrap' }}><Icon name={p.data ? 'table' : 'doc'} size={14} /><b>{p.draft.title}</b></span></td>
                      <td className="nowrap small">{folders.find((f) => f.id === p.folderId)?.name}</td>
                      <td className="nowrap small">{p.kind}</td>
                      <td className="nowrap"><span className={`pill ${st.tone}`}>{st.label}</span>{p.live && isDirty(p) && st.id !== 'indexing' && <span className="pill plain" style={{ marginLeft: 4 }}>Edited</span>}</td>
                      <td className="nowrap small">{p.live ? `v${p.live.version} · ${fmtDate(p.live.at)}` : <span className="muted">Nothing yet</span>}</td>
                      <td className="nowrap small">{fmtDate(p.updatedAt)} · {p.updatedBy}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!showFolders && !pages.length && <div className="empty">{q ? `Nothing in ${cur.name} matches “${q}”.` : 'No pages here yet.'}</div>}
      {modal === 'kb' && <NewKb onClose={() => setModal(null)} onDone={(id) => { setModal(null); setKbId(id) }} />}
      {modal === 'folder' && <NewFolder kbId={kbId} onClose={() => setModal(null)} />}
    </>
  )
}

function PageCard({ p, folder, onOpen, conflict }) {
  const { state } = useStore()
  const st = pageStatus(p)
  return (
    <button className="kb-card" onClick={onOpen}>
      <div className="kb-card-h"><Icon name={p.data ? 'table' : 'doc'} size={16} /><span className="t">{p.draft.title}</span></div>
      <div className="kb-card-b">
        {p.data ? (
          <div className="kb-card-table">
            {p.data.rows.slice(0, 4).map((r) => <div key={r.id}><span>{r.cells[0]}</span><span className="muted">{r.cells[1]}</span></div>)}
            {p.data.rows.length > 4 && <span className="muted">+{p.data.rows.length - 4} more rows</span>}
          </div>
        ) : <p className="kb-card-prev">{preview(p.draft.body) || 'Empty page'}</p>}
        {p.codes.length > 0 && <div className="row tight">{p.codes.map((c) => <span key={c} className="code-chip">{c}</span>)}</div>}
      </div>
      <div className="kb-card-f">
        <span className={`pill ${st.tone} xs`}>{st.id === 'indexing' && <span className="dot live" style={{ background: 'var(--accent)' }} />}{st.label}</span>
        {p.live && isDirty(p) && st.id !== 'indexing' && <span className="pill plain xs">Edited</span>}
        {p.data && <span className="pill good xs">Live data</span>}
        {(conflict || reviewDue(p, state.now)) && <span className="pill warn xs">{conflict ? 'Conflict' : 'Review due'}</span>}
        <span className="spacer" />
        <span className="muted nowrap">{folder?.name}{p.live ? ` · v${p.live.version}` : ''}</span>
      </div>
    </button>
  )
}

function PageView({ page }) {
  const { state, dispatch } = useStore()
  const { nav } = useNav()
  const me = currentUser(state)
  const lead = state.role === 'lead'
  const [editing, setEditing] = useState(!page.live && !page.draft.body)
  const [view, setView] = useState('draft')
  const [confirmDel, setConfirmDel] = useState(false)
  const st = pageStatus(page)
  const dirty = isDirty(page)
  const folders = state.kb.folders.filter((f) => f.kbId === page.kbId)
  const linked = state.copilot.config.kbIds.includes(page.kbId)
  const shown = view === 'live' && page.live ? page.live : page.draft
  const draft = (patch) => dispatch({ type: 'kbDraft', id: page.id, patch, by: me.name })
  const publish = () => {
    dispatch({ type: 'kbPublish', id: page.id, by: me.name })
    setEditing(false); setView('draft')
    setTimeout(() => dispatch({ type: 'kbIndexed', id: page.id }), INDEX_MS)
  }
  const attach = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    const read = await Promise.all(files.map(readFile))
    draft({ attachments: [...page.draft.attachments, ...read] })
    setEditing(true)
  }
  const setAtt = (id, text) => draft({ attachments: page.draft.attachments.map((a) => (a.id === id ? { ...a, text } : a)) })

  return (
    <div className="card kb-page">
      <div className="card-h" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 6, flex: 1, minWidth: 220 }}>
          <div className="row tight">
            <span className={`pill ${st.tone}`}>{st.id === 'indexing' && <span className="dot live" style={{ background: 'var(--accent)' }} />}{st.label}</span>
            {page.live && dirty && st.id !== 'indexing' && <span className="pill accent">Unpublished changes</span>}
            {page.review && <span className="pill warn">Review requested by {page.review.by}</span>}
            {reviewDue(page, state.now) && <span className="pill warn">Review due</span>}
            <span className="pill plain">{page.kind}</span>
          </div>
          {editing ? <input id="kb-title" className="in kb-title-in" value={page.draft.title} onChange={(e) => draft({ title: e.target.value })} aria-label="Page title" />
            : <h2>{shown.title}</h2>}
        </div>
        <div className="row">
          {page.live && dirty && !editing && <SegView view={view} setView={setView} />}
          <button className="btn sm" onClick={() => { setEditing(!editing); setView('draft') }}><Icon name={editing ? 'check' : 'edit'} size={14} />{editing ? 'Done' : 'Edit'}</button>
          {lead
            ? <button className="btn sm primary" disabled={st.id === 'indexing' || (!dirty && st.id !== 'failed')} onClick={publish}><Icon name="upload" size={14} />{st.id === 'failed' ? 'Retry publish' : 'Publish'}</button>
            : <button className="btn sm primary" disabled={!dirty || !!page.review} onClick={() => dispatch({ type: 'kbReview', id: page.id, by: me.name })}><Icon name="send" size={14} />{page.review ? 'Review requested' : 'Request review'}</button>}
        </div>
      </div>
      <div className="card-b stack lg">
        <div className="small ink2">
          {page.live
            ? <>Copilot reads <b>v{page.live.version}</b>, published {fmtDate(page.live.at)} by {page.live.by}{linked ? '' : ', but this knowledge base is not linked to Copilot'}. Last edited {fmtDateTime(page.updatedAt)} by {page.updatedBy}.</>
            : <>Copilot can't see this page until it's published. Last edited {fmtDateTime(page.updatedAt)} by {page.updatedBy}.</>}
        </div>
        {st.id === 'indexing' && <div className="callout accent small"><Icon name="refresh" size={15} /><span>Indexing… {page.live ? `Copilot keeps using v${page.live.version} until this finishes.` : 'The page becomes searchable when this finishes.'}</span></div>}
        {st.id === 'failed' && <div className="callout crit small"><Icon name="alert" size={15} /><span><b>Index failed:</b> {page.indexError} {page.live && `Copilot keeps using v${page.live.version}, the last version that indexed.`}</span></div>}
        {page.review && lead && dirty && <div className="callout warn small"><Icon name="user" size={15} /><span>{page.review.by} asked you to review these changes. Compare the draft with the published version, then publish.</span></div>}

        {editing && (
          <div className="form-grid">
            <label className="field"><span>Type</span><select id="kb-kind" className="in" value={page.kind} onChange={(e) => dispatch({ type: 'kbMeta', id: page.id, patch: { kind: e.target.value } })}>{PAGE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="field"><span>Folder</span><select id="kb-folder" className="in" value={page.folderId} onChange={(e) => dispatch({ type: 'kbMeta', id: page.id, patch: { folderId: e.target.value } })}>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <label className="field"><span>Add a resolution code</span>
              <select id="kb-code" className="in" value="" onChange={(e) => e.target.value && dispatch({ type: 'kbMeta', id: page.id, patch: { codes: [...page.codes, e.target.value] } })}>
                <option value="">Choose a code…</option>
                {state.codes.filter((c) => !page.codes.includes(c.code)).map((c) => <option key={c.code} value={c.code}>{c.code} · {c.title}</option>)}
              </select>
            </label>
          </div>
        )}
        {page.codes.length > 0 && (
          <div className="row tight">
            <span className="muted small">Resolution codes</span>
            {page.codes.map((c) => <span key={c} className="code-chip">{c}{editing && <button className="pill-x" aria-label={`Remove ${c}`} onClick={() => dispatch({ type: 'kbMeta', id: page.id, patch: { codes: page.codes.filter((x) => x !== c) } })}><Icon name="x" size={10} /></button>}</span>)}
          </div>
        )}

        {editing ? (
          <label className="field"><span>Content <span className="hint">## heading · - bullet · 1. step · **bold**</span></span>
            <textarea id="kb-body" className="in kb-body-in" value={page.draft.body} onChange={(e) => draft({ body: e.target.value })} placeholder="What happens, how to fix it, when to escalate." />
          </label>
        ) : <DocText text={shown.body || 'This page is empty.'} className="kb-doc" />}

        <div className="stack">
          <div className="row"><span className="section-title">Files</span><span className="muted small">PDF, Word, TXT, CSV or images. The text read from a file is what Copilot searches, so check it.</span><span className="spacer" />
            <label className="btn sm file-btn"><Icon name="upload" size={14} />Attach file<input type="file" accept={ATTACH_TYPES} multiple onChange={attach} /></label>
          </div>
          {!shown.attachments.length && <span className="muted small">No files attached.</span>}
          {shown.attachments.map((a) => (
            <div key={a.id} className="kb-attach">
              <div className="row tight"><Icon name="doc" size={14} /><b className="small">{a.name}</b><span className="muted small">{a.type} · {a.size}</span>
                {!a.text.trim() && <span className="pill crit">No text read</span>}
                <span className="spacer" />
                {editing && view === 'draft' && <button className="btn ghost sm" onClick={() => draft({ attachments: page.draft.attachments.filter((x) => x.id !== a.id) })}><Icon name="trash" size={13} />Remove</button>}
              </div>
              {editing && view === 'draft'
                ? <textarea className="in" aria-label={`Text from ${a.name}`} value={a.text} onChange={(e) => setAtt(a.id, e.target.value)} placeholder="No text could be read from this file. Type the content here." />
                : <pre className="kb-extract">{a.text || 'No text could be read from this file.'}</pre>}
            </div>
          ))}
        </div>

        {page.data ? <DataTable page={page} /> : editing && (
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => dispatch({ type: 'kbData', id: page.id, by: me.name, data: { columns: ['Item', 'Details', 'Owner'], source: 'Manual', syncedAt: Date.now(), rows: [{ id: newId('r'), cells: ['', '', ''] }] } })}>
            <Icon name="table" size={14} />Add a data table
          </button>
        )}

        <div className="stack">
          <div className="row"><span className="section-title">Internal notes</span><span className="pill plain"><Icon name="lock" size={11} />Never shown to Copilot or indexed</span></div>
          <textarea id="kb-note" className="in" value={page.note} placeholder="Context for the team: why a step exists, who to ask, history." onChange={(e) => dispatch({ type: 'kbNote', id: page.id, note: e.target.value })} />
        </div>

        <hr className="sep" />
        <div className="row small">
          {page.codes.length > 0 && <button className="btn ghost sm" onClick={() => nav('explorer', { tab: 'codes' })}><Icon name="book" size={14} />Resolution codes</button>}
          <button className="btn ghost sm" onClick={() => nav('copilot', {})}><Icon name="spark" size={14} />Ask Copilot</button>
          <span className="spacer" />
          {page.live && dirty && lead && <button className="btn ghost sm" onClick={() => dispatch({ type: 'kbDiscard', id: page.id })}>Discard draft</button>}
          {lead && !page.live && (confirmDel
            ? <><span className="muted">Delete this draft?</span><button className="btn sm danger" onClick={() => dispatch({ type: 'kbDelete', id: page.id })}>Delete</button><button className="btn ghost sm" onClick={() => setConfirmDel(false)}>Keep</button></>
            : <button className="btn ghost sm danger" onClick={() => setConfirmDel(true)}><Icon name="trash" size={13} />Delete draft</button>)}
        </div>
      </div>
    </div>
  )
}

function SegView({ view, setView }) {
  return (
    <div className="seg" role="group" aria-label="Version">
      <button aria-pressed={view === 'draft'} onClick={() => setView('draft')}>Draft</button>
      <button aria-pressed={view === 'live'} onClick={() => setView('live')}>Published</button>
    </div>
  )
}

// Structured, exact data (owners, on-call, contacts). Copilot queries it
// with query_data instead of text search, and edits apply immediately.
function DataTable({ page }) {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const [edit, setEdit] = useState(false)
  const d = page.data
  const save = (patch) => dispatch({ type: 'kbData', id: page.id, by: me.name, data: { ...d, ...patch } })
  const setCell = (rid, i, v) => save({ rows: d.rows.map((r) => (r.id === rid ? { ...r, cells: r.cells.map((c, j) => (j === i ? v : c)) } : r)) })
  return (
    <div className="stack">
      <div className="row">
        <span className="section-title">Data table</span>
        <span className="pill good"><span className="dot live" />Live</span>
        <span className="muted small">Copilot reads current values with <span className="mono">query_data</span>. No publish needed.</span>
        <span className="spacer" />
        <select className="in sm" aria-label="Data source" value={d.source} onChange={(e) => save({ source: e.target.value })}>{DATA_SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
        {d.source !== 'Manual' && <button className="btn sm" onClick={() => dispatch({ type: 'kbDataSync', id: page.id, source: d.source })}><Icon name="refresh" size={14} />Sync now</button>}
        <button className="btn sm" onClick={() => setEdit(!edit)}><Icon name={edit ? 'check' : 'edit'} size={14} />{edit ? 'Done' : 'Edit rows'}</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>
            {d.columns.map((c, i) => <th key={i}>{edit ? <input className="cell-in th" aria-label={`Column ${i + 1} name`} value={c} onChange={(e) => save({ columns: d.columns.map((x, j) => (j === i ? e.target.value : x)) })} /> : c}</th>)}
            {edit && <th />}
          </tr></thead>
          <tbody>
            {d.rows.map((r) => (
              <tr key={r.id}>
                {r.cells.map((c, i) => <td key={i} className={i === 0 ? 'nowrap' : ''}>{edit ? <input className="cell-in" aria-label={`${d.columns[i]}`} value={c} onChange={(e) => setCell(r.id, i, e.target.value)} /> : c === 'Degraded' || c === 'Known error' ? <span className="pill warn">{c}</span> : c === 'Operational' ? <span className="pill good">{c}</span> : c}</td>)}
                {edit && <td><button className="icon-mini" aria-label="Delete row" onClick={() => save({ rows: d.rows.filter((x) => x.id !== r.id) })}><Icon name="trash" size={13} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row small muted">
        {edit && <button className="btn sm" onClick={() => save({ rows: [...d.rows, { id: newId('r'), cells: d.columns.map(() => '') }] })}><Icon name="plus" size={14} />Add row</button>}
        {edit && <button className="btn sm" onClick={() => save({ columns: [...d.columns, 'New column'], rows: d.rows.map((r) => ({ ...r, cells: [...r.cells, ''] })) })}><Icon name="plus" size={14} />Add column</button>}
        <span>{d.rows.length} rows · {d.source === 'Manual' ? 'entered by hand' : `synced from ${d.source} at ${fmtTime(d.syncedAt)}`}</span>
      </div>
    </div>
  )
}

// ---------- Health ----------
function Health({ conflicts, gaps, stale, failed, onOpen, onCreate }) {
  const { state } = useStore()
  const { nav } = useNav()
  const review = state.kb.pages.filter((p) => p.review && isDirty(p))
  const misses = state.copilot.misses
  const Open = ({ p, label = 'Open' }) => <button className="btn sm" onClick={() => onOpen(p)}>{label}</button>
  return (
    <>
      <section className="card">
        <div className="card-h"><h3>Conflicting information</h3><span className="muted small">SLA targets in published pages, checked against each other and the live SLA rule</span></div>
        <div className="card-b stack">
          {!conflicts.length && <div className="muted small">No conflicts found.</div>}
          {conflicts.map((c) => (
            <div key={c.id} className="stack">
              <div className="callout warn small"><Icon name="alert" size={15} /><span><b>{c.prio} resolution target.</b> The queue runs on {c.rule}h, but {c.off.map((o) => `${o.page.live.title} says ${o.hours}h`).join('; ')}.</span></div>
              {c.claims.map((x) => (
                <div key={x.page.id} className="list-row small">
                  <span className={`pill ${x.hours === c.rule ? 'good' : 'crit'}`}>{x.hours}h</span>
                  <b>{x.page.live.title}</b><span className="muted" style={{ flex: 1, minWidth: 0 }}>“{x.line}”</span>
                  <Open p={x.page} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="card-h"><h3>Resolution codes without a published runbook</h3><span className="muted small">used in the last 30 days · Copilot can't guide analysts on these</span></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Code</th><th>Fix</th><th className="r">Uses (30d)</th><th>Runbook</th><th /></tr></thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.code.code}>
                  <td><span className="code-chip">{g.code.code}</span></td>
                  <td>{g.code.title}</td>
                  <td className="r">{g.uses}</td>
                  <td className="nowrap">{g.draft ? <span className="pill plain">Draft only</span> : <span className="muted">{g.code.runbook}</span>}</td>
                  <td className="r">{g.draft ? <Open p={g.draft} label="Open draft" /> : <button className="btn sm" onClick={() => onCreate({ title: g.code.runbook, codes: [g.code.code], kind: 'Runbook' })}><Icon name="plus" size={13} />Write it</button>}</td>
                </tr>
              ))}
              {!gaps.length && <tr><td colSpan={5} className="muted">Every code in use has a published runbook.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid g-2">
        <div className="card">
          <div className="card-h"><h3>Index problems</h3></div>
          <div className="card-b">
            {!failed.length && <div className="muted small">Every published page indexed.</div>}
            {failed.map((p) => <div key={p.id} className="list-row small"><span className="pill crit">Index failed</span><span style={{ flex: 1, minWidth: 0 }}><b>{p.draft.title}</b><br /><span className="muted">{p.indexError}</span></span><Open p={p} /></div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Review due</h3><span className="muted small">not published for {REVIEW_AFTER_DAYS} days</span></div>
          <div className="card-b">
            {!stale.length && <div className="muted small">Nothing is overdue.</div>}
            {stale.map((p) => <div key={p.id} className="list-row small"><span style={{ flex: 1, minWidth: 0 }}><b>{p.live.title}</b><br /><span className="muted">v{p.live.version} · {Math.round((state.now - p.live.at) / DAY)} days old · {p.live.by}</span></span><Open p={p} /></div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Waiting for review</h3></div>
          <div className="card-b">
            {!review.length && <div className="muted small">No review requests.</div>}
            {review.map((p) => <div key={p.id} className="list-row small"><span style={{ flex: 1, minWidth: 0 }}><b>{p.draft.title}</b><br /><span className="muted">{p.review.by} · {fmtDateTime(p.review.at)}</span></span><Open p={p} label="Review" /></div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Questions Copilot couldn't answer</h3><span className="spacer" /><button className="btn ghost sm" onClick={() => nav('copilot', { tab: 'insights' })}>Copilot</button></div>
          <div className="card-b">
            {!misses.length && <div className="muted small">None yet. Searches that find nothing show up here.</div>}
            {misses.slice(0, 6).map((m) => <div key={m.q} className="list-row small"><Icon name="search" size={14} /><span style={{ flex: 1, minWidth: 0 }}>{m.q}</span><button className="btn sm" onClick={() => onCreate({ title: m.q })}><Icon name="plus" size={13} />Write a page</button></div>)}
          </div>
        </div>
      </section>
    </>
  )
}

// ---------- Create ----------
function NewPage({ seed, kbId, onClose, onDone }) {
  const { state, dispatch } = useStore()
  const me = currentUser(state)
  const folders = state.kb.folders
  const def = seed.folderId ? folders.find((f) => f.id === seed.folderId) : folders.find((f) => f.kbId === kbId && /runbook/i.test(f.name)) || folders.find((f) => f.kbId === kbId)
  const [f, setF] = useState({ title: seed.title || '', kind: seed.kind || (seed.codes?.length ? 'Runbook' : 'How-to'), folderId: def?.id || folders[0].id })
  useEffect(() => { document.getElementById('np-title')?.focus() }, [])
  const create = () => {
    const folder = folders.find((x) => x.id === f.folderId)
    const page = {
      id: newId('p'), kbId: folder.kbId, folderId: folder.id, kind: f.kind, codes: seed.codes || [],
      draft: { title: f.title.trim(), body: '', attachments: [] }, live: null, index: 'draft', indexError: null,
      data: null, note: '', updatedAt: Date.now(), updatedBy: me.name, review: null,
    }
    dispatch({ type: 'kbPageAdd', page })
    onDone(page)
  }
  return (
    <Modal title="New page" sub="It starts as a draft. Copilot can see it once a team lead publishes it." onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.title.trim()} onClick={create}><Icon name="plus" size={15} />Create draft</button></>}>
      <label className="field"><span>Title</span><input id="np-title" className="in" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. RB-410 Profile rebuild" /></label>
      <div className="form-grid">
        <label className="field"><span>Type</span><select id="np-kind" className="in" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{PAGE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="field"><span>Folder</span><select id="np-folder" className="in" value={f.folderId} onChange={(e) => setF({ ...f, folderId: e.target.value })}>
          {state.kb.kbs.map((k) => <optgroup key={k.id} label={k.name}>{folders.filter((x) => x.kbId === k.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
        </select></label>
      </div>
      {seed.codes?.length > 0 && <div className="row tight small"><span className="muted">Linked code</span>{seed.codes.map((c) => <span key={c} className="code-chip">{c}</span>)}</div>}
    </Modal>
  )
}

function NewFolder({ kbId, onClose }) {
  const { dispatch } = useStore()
  const [name, setName] = useState('')
  return (
    <Modal title="New folder" sub="Folders hold pages. There's one level of folders." onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!name.trim()} onClick={() => { dispatch({ type: 'kbFolderAdd', folder: { id: newId('f'), kbId, name: name.trim() } }); onClose() }}>Create folder</button></>}>
      <label className="field"><span>Name</span><input id="nf-name" className="in" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
    </Modal>
  )
}

function NewKb({ onClose, onDone }) {
  const { state, dispatch } = useStore()
  const [f, setF] = useState({ name: '', desc: '', link: true })
  const create = () => {
    const id = newId('kb')
    dispatch({ type: 'kbAdd', kb: { id, name: f.name.trim(), desc: f.desc.trim() || 'No description yet.' } })
    dispatch({ type: 'kbFolderAdd', folder: { id: newId('f'), kbId: id, name: 'General' } })
    if (f.link) dispatch({ type: 'copilotConfig', patch: { kbIds: [...state.copilot.config.kbIds, id] } })
    onDone(id)
  }
  return (
    <Modal title="New knowledge base" sub="For a group or service with its own content. It starts with one folder." onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!f.name.trim()} onClick={create}>Create</button></>}>
      <label className="field"><span>Name</span><input id="nkb-name" className="in" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Infra Ops runbooks" autoFocus /></label>
      <label className="field"><span>Description</span><input id="nkb-desc" className="in" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
      <label className="check small"><input type="checkbox" checked={f.link} onChange={(e) => setF({ ...f, link: e.target.checked })} />Link it to Copilot so its published pages are searched</label>
    </Modal>
  )
}
