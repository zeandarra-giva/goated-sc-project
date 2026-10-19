// Renders the light markup used in knowledge base pages and Copilot answers:
// "## " headings, "- " bullets, "1. " steps, blank-line paragraphs,
// **bold** and `code` inline.
export function Inline({ text }) {
  const out = []
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g
  let last = 0, m, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(m[1] ? <b key={i++}>{m[1]}</b> : <span key={i++} className="code-chip">{m[2]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

export function DocText({ text, className = '' }) {
  const blocks = []
  let list = null
  const flush = () => { if (list) blocks.push(list); list = null }
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (line.startsWith('## ')) { flush(); blocks.push({ t: 'h', text: line.slice(3) }) }
    else if (/^[-*] /.test(line)) { if (list?.t !== 'ul') { flush(); list = { t: 'ul', items: [] } } list.items.push(line.slice(2)) }
    else if (/^\d+\. /.test(line)) { if (list?.t !== 'ol') { flush(); list = { t: 'ol', items: [] } } list.items.push(line.replace(/^\d+\. /, '')) }
    else if (!line.trim()) flush()
    else { flush(); const prev = blocks[blocks.length - 1]; if (prev?.t === 'p' && !prev.end) prev.text += ' ' + line; else blocks.push({ t: 'p', text: line }) }
    if (!line.trim() && blocks.length && blocks[blocks.length - 1].t === 'p') blocks[blocks.length - 1].end = true
  }
  flush()
  return (
    <div className={`doc ${className}`}>
      {blocks.map((b, i) => b.t === 'h' ? <h4 key={i}>{b.text}</h4>
        : b.t === 'p' ? <p key={i}><Inline text={b.text} /></p>
        : b.t === 'ul' ? <ul key={i}>{b.items.map((x, j) => <li key={j}><Inline text={x} /></li>)}</ul>
        : <ol key={i}>{b.items.map((x, j) => <li key={j}><Inline text={x} /></li>)}</ol>)}
    </div>
  )
}
