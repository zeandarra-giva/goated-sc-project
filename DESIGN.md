# Scope: Design System

This is the source of truth for how Scope looks. Every visual value lives in a token in [`src/styles.css`](src/styles.css). Components use tokens and never raw values.

`npm run check:design` enforces the rules in this file, and it runs automatically before every build (`prebuild`). A build fails if a change uses:
- a raw color outside a token
- a font, font size, radius or z-index that isn't on the scales below
- a drop shadow on an in-page surface

> **Changing the system:** to add a token or a scale step, update **this file**, the token in `styles.css` and the allowed list in `scripts/check-design.mjs` **in the same change**. Never silence the check instead.

---

## 1. Principles

1. **Calm canvas, glass surfaces.** A warm cream page holds translucent "glass" cards. Depth comes from translucency and blur, not shadows.
2. **One accent: Citi blue.** Blue is the only brand color. Everything else is neutral ink or a **semantic** status color.
3. **Color means something.** Green, amber and red only ever mean good, warning and critical. They never decorate.
4. **Every number explains itself.** KPIs carry an "i" button that opens the calculation.
5. **Pills and circles.** Controls are pill-shaped and icon actions are round. Corners are generous.
6. **Light and dark are equal.** Every token has a dark value, and nothing is hard-coded for one theme.

---

## 2. Typography

### Families
| Token | Stack | Use |
|---|---|---|
| `--f-ui` | `'Geist', ui-sans-serif, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif` | All interface text |
| `--f-mono` | `'Geist Mono', 'SFMono-Regular', Menlo, Consolas, monospace` | IDs, SOEIDs, resolution codes, priorities, shift codes, coverage labels, tab counts, keyboard keys |
| `--f-cond` | alias of `--f-ui` | Legacy name, kept for older components. Use `--f-ui` in new code |

- **Bundling:** fonts are bundled (`src/fonts.css`, `@fontsource`, Latin subset, WOFF2). Never load fonts from a CDN.
- **Weights available:** Geist 400 / 500 / 600 / 700 and Geist Mono 400 / 500 / 600. Don't use other weights (the nav's 450 renders as 500).
- **Numbers:** use `font-variant-numeric: tabular-nums` (the `.num` class) for any number that updates or sits in a column.

### Type scale (px)
Body text is **14px / 1.5** (`body`). These are the only allowed sizes, grouped by role:

| Role | Size / weight / line height | Where |
|---|---|---|
| Display | **44** / 600 / 1.05, tracking −0.035em | Page title (`.page-head h1`) |
| KPI value | **38** / 500 / 1, tracking −0.03em, tabular | `.kpi-v` |
| Hero numbers | 30, 32 | Ring values, large stats |
| Section title, large | **26** / 600 / 1.15 | Calendar month title (`.cal-head h2`) |
| Brand | 25 / 600 | Sidebar wordmark |
| Modal title | **24** / 500 / 1.2 | `.modal-h h2` |
| Drawer title / large stats | 22 / 500 | Info drawer title, handover stats |
| Card title, compact | 21 / 500–600 | Calendar preview title, small-screen calendar |
| Profile name | 20 / 600 | Account profile |
| Card title | **19** / 500 / 1.25, tracking −0.02em | `.card-h h2/h3` |
| Emphasis | 17, 18 | Calendar day numbers, drawer headings |
| KPI label | **15.5** / 600 / 1.3 | `.kpi-label` |
| Lead text | 15 | Page description (`.page-head p`), search input |
| Nav / tabs / section | **14.5** / 500 | `.nav-btn`, `.tab`, `.section-title` (600) |
| Body | **14** / 400 | Default text |
| Control | **13.5** / 500 | `.btn`, inputs |
| Secondary | **13** / 500 | `.eyebrow`, segmented control, toasts, callouts |
| Small | **12.5** | `.small`, `.btn.sm`, field labels, KPI foot |
| Caption | **12** | `.pill`, legends, chart tips |
| Mono label | **11.5** / 600 mono | `.prio`, `.code-chip`, shift cells |
| Overline | **11** / 500, uppercase, +0.06em | Table headers (`.tbl th`), tab counts, coverage |
| Micro | 10.5, 10, 9.5 | Badges, avatar initials in small avatars, heatmap day labels |

Rules:
- Headings use negative tracking (−0.015 to −0.035em). Body and labels use none.
- Uppercase is only for table headers (overline).
- Don't add a new size. Pick the closest role.

---

## 3. Color

### 3.1 Neutrals and surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f6f0e4` | `#12110f` | Page canvas |
| `--surface` | `#fbf7ef` | `#1c1b18` | Floating layers: modal, drawer, popover, menus |
| `--surface-2` | `#eee6d6` | `#24221e` | Subtle fills, nav buttons |
| `--surface-3` | `#e3d9c6` | `#302d27` | Tracks (meters, rings), rest-day fills |
| `--card` | `#efe8da` | `#1f1d1a` | Solid card color (glass is derived from it) |
| `--glass` | `rgba(239,232,218,.58)` | `rgba(31,29,26,.55)` | **Card fill** |
| `--glass-2` | `rgba(251,247,239,.62)` | `rgba(40,38,34,.55)` | Nested card or panel inside a card |
| `--glass-blur` | `blur(22px) saturate(160%)` | `blur(22px) saturate(140%)` | Card `backdrop-filter` |
| `--line` | ink 10% | cream 9% | Dividers, table rules, the line under card titles |
| `--line-strong` | ink 22% | cream 20% | Control borders, dashed chips |
| `--hover` | ink 5% | cream 6% | Hover fill |
| `--row-hover` / `--row-sel` | ink 3.5% / blue 10% | — | Table rows |
| `--ink` | `#1b1a17` | `#f3ecdf` | Primary text |
| `--ink-2` | `#4d4a42` | `#c9c1b1` | Secondary text |
| `--muted` | `#8a857a` | `#8f887a` | Tertiary text, units, hints |
| `--btn` / `--btn-ink` | `#1b1a17` / `#f6f0e4` | `#f3ecdf` / `#12110f` | Primary button, selected segment, icon buttons |

**Fixed-dark surfaces** (the same in both themes):

| Token | Value | Use |
|---|---|---|
| `--rail` | `#121110` (`#050505` dark) | Sidebar |
| `--rail-ink` | `#b9b3a6` | Sidebar group labels |
| `--rail-text` | `#ece5d8` | Sidebar items |
| `--rail-title` | `#fbf7ef` | Wordmark, profile name |
| `--rail-hi` / `--rail-hi-ink` | `#7cc0f2` / `#0b1f33` | Active nav item, nav counts, sidebar avatar |
| `--rail-active` / `--rail-hover` | white 6% / 12% | Sidebar hover and active fills |
| `--scrim` / `--scrim-soft` / `--scrim-strong` | ink 45% / 30% / 55% | Modal, drawer and tour backdrops |
| `--on-color` | `#ffffff` | Text on a solid accent or status fill (badge, P1, status icon) |

### 3.2 Brand: Citi blue

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent` | **`#056DAE`** | `#4aa3e3` | Links, focus, badges, selected state, "you" outline, dev button |
| `--accent-soft` | `#dce8f4` | blue 16% | Selected card background |
| `--focus-ring` | blue 30% | blue 45% | 3px focus halo on inputs |
| `--blue` / `--blue-ink` | `#9fc6ee` / `#0b3a6b` | `#3f78b8` / `#e2efff` | The main pastel: avatars, Early shift, online |
| `--navy` | `#003b70` | `#9ccbf0` | Deep blue text accents |
| `--kb-1…4` | `#002d72` `#056dae` `#4f9fdc` `#9fc6ee` | reversed light→dark | **Blue ramp** for meters and multi-part bars (dark → light) |

### 3.3 Semantic status (reserved)

| Meaning | Text / solid | Soft fill | Pill (bg / ink) |
|---|---|---|---|
| **Good** (OK, on target, met) | `--good` `#3d7a2a` | `--good-soft` | `--tag-green` / `--tag-green-ink` |
| **Warning** (at risk, elevated, below target) | `--warn` `#8a5a0a` | `--warn-soft` | `--tag-yellow` / `--tag-yellow-ink` |
| **Critical** (breached, high risk, below minimum, P1) | `--crit` `#c2362f` | `--crit-soft` | `--tag-red` / `--tag-red-ink` |
| Info / brand | `--accent` | `--accent-soft` | `--tag-blue` / `--tag-blue-ink` |
| Neutral | `--ink` | — | `--tag` |

Rules:
- Status is **never shown by color alone**. Pair it with a label ("Breached", "Elevated", "below minimum"), an icon (⚠, ✓) or a dot next to a title.
- Status colors are never used for decoration, series or categories.
- Thresholds used now:
  - **SLA:** at risk when under 25% of the SLA is left.
  - **Risk score:** below 35 good, 35–59 warn, 60 or above crit.
  - **SLA health:** below 55 warn, below 35 crit.
  - **Goal ≤4h:** below 80% warn, below 65% crit.
  - **Lost time:** above 2h warn.
  - **Coverage:** below minimum is crit.

### 3.4 Supporting pastels (category only)

| Token (bg / ink) | Light | Category meaning |
|---|---|---|
| `--blue` / `--blue-ink` | `#9fc6ee` / `#0b3a6b` | **Early** shift, worked onsite |
| `--sage` / `--sage-ink` | `#9db86c` / `#3b5218` | **Mid** shift, onsite group |
| `--pink` / `--pink-ink` | `#f2b5d6` / `#8c2f63` | **Late** shift (minor accent, use sparingly) |
| `--butter` / `--butter-ink` | `#f3d36b` / `#6b5108` | **Weekend duty** |
| `--tag-pink` | `#f8d6e8` | Pink pill |

Pastels mark **categories** (shift types). They never mean status.

### 3.5 Shift and leave encoding (calendar, heatmap, week preview)

| Code | Meaning | Fill | Treatment |
|---|---|---|---|
| E | Early 06:00–15:00 | `--blue` | Solid |
| M | Mid 10:00–19:00 | `--sage` | Solid |
| L | Late 14:00–23:00 | `--pink` | Solid |
| W | Weekend duty 08:00–17:00 | `--butter` | Solid |
| PL | Personal leave | `--tag-yellow` | 1.5px **inset outline** in `--warn` |
| SL | Sick leave | `--tag-red` | 1.5px **inset outline** in `--crit` |
| H | Public holiday | `--btn` (dark) | Solid, one bar for the whole team |
| OFF | Rest day | `--surface-3` | Muted text |

The current user's own entries get a 2px inset `--accent` outline (`.mine`).

### 3.6 Data visualization

- **Series tokens** `--s1…--s8`: ink, blue, green, gold, pink, deep green, light blue, red. Assign them in order and never cycle them.
- **Magnitude** (one measure split into parts, meters): use the blue ramp `--kb-1…4`.
- **One axis per chart**, a 2px line, a crosshair tooltip (`.chart-tip`), and a recessive grid in `--line`.
- **Heatmap:** square size is computed from the card width so 53 weeks always fill it (8–28px squares; gap 3px, or 4px when squares are 18px or larger). `--heat-0` is empty. Kinds map to `--s7` (onsite), `--s7` mixed 45% with the card color (WFH), `--pink` (late), `--s3` (weekend), `--s4` (leave), `--s8` (sick), `--s1` (holiday). The legend squares must match the cells.

### 3.7 KPI card tones

| Tone class | Light bg / art / icon ink | Use |
|---|---|---|
| `k-sky` (default) | `#e2effb` / `#c6e0f6` / `#056dae` | General KPIs |
| `k-ice` | `#edf2f8` / `#d6e1ee` / `#1d4f80` | General KPIs |
| `k-azure` | `#d2e7f8` / `#a8cff0` / `#034f82` | General KPIs |
| `k-navy` | `#0b3a6b` / `#134c86` / `#d6eaff` | **One per row at most**, for contrast. Text inverts to white |
| `k-good` / `k-warn` / `k-crit` | `--kp-*-bg` / `--kp-*-art` / status color | Set automatically when the KPI has a `state` |

- **Picking a tone:** pass `tone` for identity or `state` for meaning. `state` always overrides `tone`.
- **Dark mode:** it has its own `--kp-*` values. In dark mode navy becomes Citi blue `#056dae`.
- **Background shape:** the card fill is 78% opaque, so the oversized background icon shows through it.

---

## 4. Shape: radius scale

| Value | Token | Use |
|---|---|---|
| 999px | `--r` | Pills, buttons, inputs, segmented controls, toasts, shift bars in the old table, meters |
| 50% | — | Avatars, icon buttons, status icons, info buttons |
| 26px | — | Sidebar, modal, drawer |
| **22px** | `--r-card` | **Cards**, tour card |
| 20px | — | Popovers, profile menu, dev panel |
| 18px | — | Inner panels (today dropdown, week columns, coverage status) |
| 16px | — | Callouts, textarea, option tiles, profile button |
| 14px | — | Today dropdown button |
| 12px | `--r-sm` | Nav items, calendar bars, chart tooltip, calendar nav buttons |
| 10px | — | Day timeline track, notification badge |
| 8px, 6px, 4px | — | Small boxes, tab counts, `.kbd` |
| 3px, 2px | — | Heatmap cells, legend squares, thin marks (nav indicator, now line, goal marker) |

---

## 5. Elevation and effects

| Layer | Treatment |
|---|---|
| Canvas | `--bg`, flat, no gradient |
| **Card** | `--glass` + `backdrop-filter: var(--glass-blur)`, **no border, no shadow** |
| Nested panel | `--glass-2`, no shadow |
| KPI card | Tinted fill at 78% + a faint 1px border in its own tone (`--k-ic` at 16%), no shadow |
| **Floating layers** | `--surface` + `box-shadow: var(--shadow)`. Only: popover, modal, drawer, toast, chart tooltip, profile menu, tour card, dev panel, today dropdown |
| Overlays | `--scrim*` backdrop; modal scrim adds `blur(3px)` |
| Header | `--header-bg` (88% canvas) + `blur(10px)`, sticky |

`--shadow` is `0 1px 2px ink 6%, 0 18px 40px ink 14%` in light mode and deeper in dark mode. **In-page surfaces never get a drop shadow.** Rings (`0 0 0 Npx`) and inset outlines are allowed: focus, "mine", leave outlines and the selected option.

**Glass rule:** an element with `backdrop-filter` traps `position: fixed` children. That's why `Modal`, `Drawer` and the info drawer render through a portal to `document.body`. Any new overlay must do the same.

---

## 6. Spacing and layout

**Base unit 2px. Common steps:** 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 32.

| Context | Value |
|---|---|
| Page side padding | `--page-pad`: 32px, 40px at ≥ 1800px, 48px at ≥ 2300px; 16px at ≤ 900px. **No max width**: content fills the screen at any size, and the header uses the same gutter |
| Gap between sections and cards | **18px** (`.page`, `.grid`) |
| Card header | `18px 20px 14px` padding, then a **1px `--line` divider**, then 16px before the body |
| Card body | `0 20px 20px` |
| KPI card | `22px 20px 20px`; label → value 6px; stack gap 8px |
| Calendar card | `20px 22px 18px`, internal gap 14px |
| Row (`.row`) | 8px gap, wraps |
| Stack (`.stack`) | 8px; `.stack.lg` 14px |
| Tabs | 22px between tabs |
| Table cells | `10px 12px` header, `11px 12px` body |
| Buttons | `7px 14px` (`.sm`: `4px 11px`) |
| Inputs | `7px 14px` |
| Modal | header `22px 24px 14px`, body `6px 24px 20px`, footer `14px 24px 20px` |
| Drawer | `20px 22px` header, `18px 22px 32px` body, inset 12px from the viewport |

### Grids
- **KPI row:** `.g-kpi`, `repeat(auto-fit, minmax(200px, 1fr))`.
- **Two-up:** `.g-2`, `repeat(auto-fit, minmax(min(100%, 440px), 1fr))`.
- **Asymmetric:** `.g-3-1` (2fr / 1fr) and `.g-1-2` (1fr / 2fr). Both collapse to one column below 1100px.

### Breakpoints
| Width | Change |
|---|---|
| ≥ 2300px | `--page-pad` 48px |
| ≥ 1800px | `--page-pad` 40px. Content is never capped; grids stretch to the full width |
| ≤ 1100px | Asymmetric grids stack; KPI rows become 2 columns (561–1100px) |
| ≤ 900px | The sidebar becomes a top bar: brand and profile on row 1, a horizontally scrolling nav strip on row 2 that auto-scrolls to the current page. The header wraps and the ServiceNow pill scrolls sideways. Page padding is 16px and h1 is 32px |
| ≤ 720px | Calendar compacts: bar labels hidden, smaller titles |
| ≤ 560px (phones) | 1-column KPIs; h1 26px; the breadcrumb shows only the current page; card padding 16px; assignment rows reflow to name + status / bar / counts; modals and drawers go almost full width |

Rules: no page may scroll sideways at 375px or wider. Wide tables scroll inside their own `.tbl-wrap`. Check new layouts at 375, 768, 1440 and 2560 px.

### Hierarchy on a page
1. **Page head:** h1 (44) + one-line description (15, `--ink-2`). No icon.
2. **KPI row** (when the page has metrics).
3. **Cards:** title (19) + optional muted meta (12.5) + actions on the right, then the divider, then content.
4. **Tabs** split a page's sections. A tab count uses the mono badge.

---

## 7. Components (canonical classes)

| Component | Class / component | Spec |
|---|---|---|
| Card | `.card`, `.card-h`, `.card-b` | Glass, 22px corners; title row with divider |
| KPI | `<Kpi>` / `<KpiShell>` | Label 15.5/600, value 38/500, foot 12.5; tone or state; filled icon art 132px rotated −12° at top −26 / right −26; "i" button pinned top-right |
| Info | `<InfoTip>` | 30px dashed round button; opens a 420px right drawer: "How it's calculated" + title |
| Button | `.btn`, `.primary`, `.ghost`, `.danger`, `.sm` | Pill, 1.5px `--line-strong` border; primary is solid `--btn` |
| Icon button | `.icon-btn` | 42px circle, `--btn` fill; in modals 36px with a dashed outline |
| Segmented | `<Seg>` / `.seg` | Pill track with a 1.5px border; selected is solid `--btn` |
| Tabs | `<Tabs>` / `.tab` | 14.5/500 muted; selected is ink with a 2px underline |
| Pill | `.pill` + `good`/`warn`/`crit`/`accent`/`plain` | 22px tall, 12px text |
| Priority | `<Prio>` / `.prio.P1…P4` | Mono 11.5/600; P1 solid crit, P2 soft red |
| Code chip | `.code-chip` | Mono, 1.2px dashed border |
| Dashed chip | `.dash-chip` | Neutral meta chip, dashed |
| Input | `.in` | Pill, 1.5px border; focus = accent border + 3px ring; textarea 16px corners |
| Table | `.tbl` | Overline headers, `--line` rules, sticky head, `.r` for right-aligned numbers |
| Avatar | `.avatar` (30px), `.sm` (26), `.lg` (92, 26px corners) | `--blue` / `--blue-ink`, initials |
| Calendar bar | `.ev` + code | 30px tall, 12px corners, 24px avatar on the left, truncated label |
| Meter | `.meter` | 10px pill track in `--surface-3`; segments with a 3px gap |
| Toast | `.toast` | Inverted pill, bottom center, 3.8s |
| Modal / Drawer | `<Modal>` / `<Drawer>` | Portalled; Escape closes; scrim click closes. Drawers are **resizable** from the left edge (drag, or ←/→ on the handle in 40px steps; double-click resets), 360px to viewport − 24px, and each drawer type remembers its width |
| Notification badge | `.badge` | 19px, `--accent`, `--on-color` |

### Icons
- **Line icons:** 24px viewBox, 1.8 stroke, round caps and joins (`<Icon>`). Use them at 12–18px in controls.
- **Filled icons:** `<Icon filled>` is for **decorative background art only** (KPI cards). It needs a solid shape in the `FILLED` map in `ui.jsx`.
- **Accessibility:** icons are `aria-hidden`. Icon-only buttons need an `aria-label`.

---

## 8. Motion
- Keep motion short and functional:
  - theme fade 0.2s
  - tour spotlight 0.25s
  - live dot pulse 2s
- Respect `prefers-reduced-motion`; every animation has a reduced-motion override.

## 9. Layers (z-index)
| z | Layer |
|---|---|
| −1 | KPI background art |
| 1–5 | Calendar bars, now line, chart tooltip, preview card while its dropdown is open |
| 20 | Sticky header, today dropdown |
| 30 | (reserved) |
| 40 / 45 | Popovers / profile menu |
| 50 / 51 | Drawer scrim / drawer |
| 60 | Modal scrim |
| 70 | Profile menu on phones |
| 75 / 80 | Dev button and panel / toasts |
| 90 | Onboarding tour |

## 10. Accessibility standards
- Target **WCAG 2.1 AA**. Text tokens are chosen for ≥ 4.5:1 on their surfaces, and the navy KPI inverts text to white.
- Visible focus: the input focus ring and `:focus-visible` outlines in `--accent`.
- Status uses color plus text or an icon; charts have a table view or labels.
- Dialogs: `role="dialog"`, an `aria-label`, Escape closes, and focus returns to the trigger (info drawer).
- Hit targets of 30px or more for icon controls.

---

## 11. Contributing checklist

Before you open a PR that touches the UI:
- [ ] All colors come from tokens (`var(--…)`), in CSS and in inline styles.
- [ ] New tokens have a **light and a dark** value.
- [ ] Font sizes, radii and z-index are on the scales above.
- [ ] No `box-shadow` on cards or in-page elements, and no borders on cards (KPI cards are the one exception: a faint tone border).
- [ ] Status colors only mean status, with a label or icon too.
- [ ] Cards with a title use `.card-h`, which gives the divider.
- [ ] Any new overlay is portalled to `document.body`.
- [ ] `npm run check:design` passes (it runs automatically on `npm run build`).
