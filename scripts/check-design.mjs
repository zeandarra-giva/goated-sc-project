// Design system guard. Fails (exit 1) when styles drift from DESIGN.md:
// raw colors outside tokens, off-scale font sizes, radii or z-index,
// unknown font families, and drop shadows on in-page surfaces.
// Run: npm run check:design   (also runs before every build)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ---- The allowed scales. Change these only together with DESIGN.md. ----
export const FONT_SIZES = [9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 17, 18, 19, 20, 21, 22, 24, 25, 26, 30, 32, 38, 44]
export const RADII = ['2px', '3px', '4px', '6px', '8px', '10px', '12px', '14px', '16px', '18px', '20px', '22px', '26px', '50%', '999px', 'var(--r-card)', 'var(--r-sm)', 'var(--r)']
export const Z_INDEX = [-1, 1, 2, 5, 20, 30, 40, 45, 50, 51, 60, 70, 75, 80, 90]
const FONT_FAMILIES = ['var(--f-ui)', 'var(--f-mono)', 'var(--f-cond)', 'inherit']
// Layers that float above the page may use the elevation token.
const ELEVATED = ['.popover', '.modal', '.drawer', '.toast', '.chart-tip', '.profile-menu', '.tour-card', '.dev-panel', '.today-pop', '.dev-fab']

const root = new URL('..', import.meta.url).pathname
const problems = []
const report = (file, line, msg) => problems.push(`${file}:${line}  ${msg}`)

// ---------- CSS ----------
const cssFile = 'src/styles.css'
const css = readFileSync(join(root, cssFile), 'utf8')
// Blank out comments but keep line numbers.
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
const lineOf = (idx) => cssCode.slice(0, idx).split('\n').length

const ruleRe = /([^{}]+)\{([^{}]*)\}/g
let m
while ((m = ruleRe.exec(cssCode))) {
  const selector = m[1].trim()
  if (selector.startsWith('@')) continue
  const bodyStart = m.index + m[0].indexOf('{') + 1
  for (const decl of m[2].split(';')) {
    const at = bodyStart + m[2].indexOf(decl)
    const [rawProp, ...rest] = decl.split(':')
    if (!rest.length) continue
    const prop = rawProp.trim()
    const value = rest.join(':').trim()
    const line = lineOf(at + decl.length - decl.trimStart().length)
    // 1. Colors live only in custom properties (tokens).
    if (!prop.startsWith('--') && /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(value)) report(cssFile, line, `raw color in "${prop}" — use a token (var(--…))`)
    // 2. Font families.
    if (prop === 'font-family' && !FONT_FAMILIES.includes(value)) report(cssFile, line, `font-family "${value}" — use var(--f-ui) or var(--f-mono)`)
    if (prop === 'font') {
      if (!/var\(--f-(ui|mono|cond)\)|inherit/.test(value)) report(cssFile, line, `font shorthand "${value}" must use var(--f-ui) or var(--f-mono)`)
      const size = value.match(/(?:^|\s)([\d.]+)px/)
      if (size && !FONT_SIZES.includes(+size[1])) report(cssFile, line, `font size ${size[1]}px is off the type scale`)
    }
    // 3. Font sizes.
    if (prop === 'font-size') {
      const px = value.match(/^([\d.]+)px$/)
      if (px && !FONT_SIZES.includes(+px[1])) report(cssFile, line, `font size ${px[1]}px is off the type scale`)
      if (!px && !/em$|^inherit$|^var\(/.test(value)) report(cssFile, line, `font-size "${value}" — use a px value from the scale`)
    }
    // 4. Radii.
    if (prop === 'border-radius') {
      for (const v of value.split(/\s+/)) if (!RADII.includes(v) && v !== '0') report(cssFile, line, `border-radius ${v} is off the radius scale`)
    }
    // 5. z-index.
    if (prop === 'z-index' && !Z_INDEX.includes(+value)) report(cssFile, line, `z-index ${value} is not a defined layer`)
    // 6. Shadows: in-page surfaces get none. Rings (0 0 0 Npx) and inset strokes are fine.
    if (prop === 'box-shadow' && value !== 'none') {
      const layers = value.split(/,(?![^(]*\))/).map((l) => l.trim())
      for (const l of layers) {
        const ring = /^(inset\s+)?0\s+0\s+0\s+[\d.]+px\b/.test(l)
        const elevation = l === 'var(--shadow)'
        if (ring) continue
        if (elevation && ELEVATED.some((e) => selector.includes(e))) continue
        report(cssFile, line, elevation ? `var(--shadow) on "${selector}" — elevation is only for floating layers` : `box-shadow "${l}" — cards and in-page surfaces have no drop shadow`)
      }
    }
  }
}

// ---------- JSX / JS inline styles ----------
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(f) ? [p] : []
})
for (const file of walk(join(root, 'src'))) {
  const rel = file.slice(root.length)
  readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
    if (/(['"`])#[0-9a-f]{3,8}\1|rgba?\(\s*\d/i.test(text)) report(rel, i + 1, 'raw color in code — use var(--token)')
    for (const s of text.matchAll(/fontSize:\s*([\d.]+)/g)) if (!FONT_SIZES.includes(+s[1])) report(rel, i + 1, `fontSize ${s[1]} is off the type scale`)
    for (const s of text.matchAll(/font:\s*'(\d{3})\s+([\d.]+)px[^']*'/g)) {
      if (!FONT_SIZES.includes(+s[2])) report(rel, i + 1, `font size ${s[2]}px is off the type scale`)
      if (!/var\(--f-/.test(s[0])) report(rel, i + 1, 'inline font must use var(--f-ui) or var(--f-mono)')
    }
    if (/fontFamily:\s*'(?!var\(--f-)/.test(text)) report(rel, i + 1, 'fontFamily must be var(--f-ui) or var(--f-mono)')
    for (const s of text.matchAll(/borderRadius:\s*([\d.]+)/g)) if (!RADII.includes(`${s[1]}px`)) report(rel, i + 1, `borderRadius ${s[1]} is off the radius scale`)
    if (/boxShadow:/.test(text)) report(rel, i + 1, 'inline boxShadow — use a class from styles.css')
  })
}

if (problems.length) {
  console.error(`Design check failed — ${problems.length} issue(s). See DESIGN.md.\n`)
  console.error(problems.map((p) => '  ' + p).join('\n'))
  process.exit(1)
}
console.log('Design check passed.')
