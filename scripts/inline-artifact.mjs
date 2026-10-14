// Bundles dist/ into one self-contained page (no html/head/body wrapper) for
// publishing as a claude.ai artifact.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
const dir = 'dist/assets'
const files = readdirSync(dir)
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n')
const out = `<title>ServiceOps Console</title>
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/g, '<\\/script')}</script>
`
writeFileSync('dist/artifact.html', out)
console.log('dist/artifact.html', (out.length / 1024).toFixed(0) + ' KB')
