# Scope: Solution Center Hub (prototype)

```bash
In actual development:
1. Checkout to branch first for the service you're trying to integrate to this Frontend Prototype
2. Every PR should have audits of the implemented and changes made
3. PR and review from each dev
4. Push to preview
5. Present to stakeholder (Agile)
```

**Scope** is a clickable React prototype of a solution center hub for **team leads** and **analysts**. It covers the live incident queue, fair ticket assignment, ticket resolution, shift scheduling and coverage, reporting and coaching, and a personal password vault.

Everything runs in the browser. All data is generated sample data, and the ServiceNow connection is simulated.

## Setup

Requirements: Node.js 18 or newer and npm.

```bash
npm install        # install dependencies (includes the bundled fonts)
npm run dev        # local dev server, usually http://localhost:5173
npm run build      # production build in dist/
npm run artifact   # production build + one self-contained page at dist/artifact.html
npm run check:design   # design-system lint (also runs before every build)
```

The design system (tokens, type scale, colors, spacing, components) is documented in [DESIGN.md](DESIGN.md) and enforced by `scripts/check-design.mjs`.

Product requirements (problem, users, page-by-page features, business rules, data model, MVP scope, open questions) are in [docs/PRD.md](docs/PRD.md).

- **Moving to another machine:** copy the project without `node_modules` and `dist`, then run `npm install`.
- **Fonts:** Geist and Geist Mono are bundled from `@fontsource` in `src/fonts.css`, so the app needs no internet access to show the right fonts.
- **Single-file page:** `npm run artifact` builds a single page with the scripts, styles and fonts all inside it (`scripts/inline-artifact.mjs`). It's the version used for sharing.

### Signing in

The app opens on a **Sign in** page.
- **Continue with SSO:** the production path. It isn't connected in the prototype yet.
- **Dev Login:** pick **Team lead** (Andrea Santos) or **Analyst** (Paolo Reyes) and sign in with no credentials. It's prototype only; remove it before release.

The session is remembered per browser (`scope-session` in localStorage). **Log out** in the profile menu returns you to the sign-in page.

### Prototype controls

Prototype-only controls sit behind the floating **Dev** button in the bottom-right corner. You can also open them with Shift + Alt + D.

| Control | What it does |
|---|---|
| View as | Switch between the **Team lead** and **Analyst** views |
| Onboarding | Start the guided onboarding tour |
| ServiceNow intake | Pull one incident, pull a P1, pull a burst of 5, or force a sync |
| Data | Reset all sample data |

These controls are not part of the product UI.

### Project structure

```
src/
  main.jsx               entry; loads fonts.css and styles.css
  App.jsx                shell: sidebar, header (ServiceNow status, theme, notifications), routing
  store.jsx              app state (React useReducer): queue, assignment, schedule, vault, notifications
  data.js                seeded sample data, business rules (SLA, fair-share, rota), formatters
  styles.css             design tokens (light and dark) and all component styles
  fonts.css              bundled Geist and Geist Mono
  components/
    ui.jsx               Icon, Modal, Drawer, Tabs, Seg, KPI cards, InfoTip, charts, toasts
    Workspace.jsx        ticket workspace, Resolution Assist, five-step resolve journey
    Tour.jsx             onboarding tour
    DevTools.jsx         prototype controls
  pages/
    Home.jsx             Queue command
    Explorer.jsx         Ticket Explorer
    Reports.jsx          Reports
    Team.jsx             Team Management
    ShiftCalendar.jsx    Day / Week / Month shift calendar and the Home week preview
    Settings.jsx         Account profile
    SignIn.jsx           Sign in (SSO placeholder + Dev Login)
scripts/inline-artifact.mjs   builds dist/artifact.html
scripts/check-design.mjs      design-system lint
docs/PRD.md                   product requirements (draft)
DESIGN.md                     design system
```

## Current product design

### Layout
- **Sidebar:** a floating dark sidebar. "General" holds Home, Ticket Explorer and Reports; "Tools" holds Team Management. The profile button sits at the bottom and opens a menu with **Account profile** and **Log out**.
- **Header:** the breadcrumb on the left and the **ServiceNow status** pill in the center. The pill shows open, P1 and waiting counts, and opens sync details with "Sync now". On the right are today's date, the light/dark toggle and **Notifications**.
- **Page head:** a title and a one-line description only.

### Visual language
- **Base:** a warm cream canvas with **glass cards**: translucent fill and background blur, 22px corners, no border and no shadow. Controls are pill-shaped and icon actions are round. The font is Geist throughout, with Geist Mono for codes and SOEIDs.
- **Color:** Citi blue (`#056DAE`) is the accent for links, focus and badges. A softer derived blue is the main pastel. Green, amber and red are reserved for status: SLA, health and coverage.
- **KPI cards:** each card uses one of four Citi blue tints (sky, ice, azure, navy). A card showing a status uses the green, amber or red tint instead. The card's icon appears, filled and oversized, as a decorative shape in the top-right corner.
- **Card titles:** cards with a title have a thin divider under the title row.
- **"i" buttons:** every KPI card has an **i** button that opens a side panel explaining how the number is calculated.
- **Dark mode:** a full set of dark tokens, toggled in the header and remembered per browser.

## Pages and what they cover

### Home: Queue command
The live view of the incident queue and the team working it.

| Section | What it covers |
|---|---|
| KPI row | Active incidents (P1/P2, breached, at risk), Queue risk score (0–100 with breakdown), SLA health (time left and ticket age), Analysts online |
| Schedule this week | Week preview of the shift calendar: who is online, onsite, WFH or on leave today; leave, weekend duty and holiday bars; daily coverage. Clicking it opens the full calendar |
| Assigned per online analyst | Weighted load per analyst against the fair-share cap, how evenly work is spread, analyst status (team lead), and a **Rebalance** button (team lead) |
| Team queue | All open incidents: priority, state, age, SLA status, assignee and why they got it. Opens the ticket workspace |
| My work queue | The analyst's own tickets in order of priority and SLA urgency |
| Shift handover | Resolved count, open criticals, next-week coverage, and notes, submitted for the next shift to acknowledge |
| Fix approvals (team lead) | Automated fixes proposed by analysts, to approve or reject |

The **ticket workspace** is a side panel with resolution steps, a customer contact log, state changes and **Resolution Assist**. Setting a ticket to Resolved opens the five-step **resolution journey**.

### Ticket Explorer
How incidents were solved.

| Tab | What it covers |
|---|---|
| Resolved tickets | KPIs (records, EZE MTTR, RES MTTR, lost time, Goal ≤4 hours), filters (search, date range, product group, channel, business app, FCR), and the results table. Each row opens the ticket's resolution journey with similar incidents |
| Resolution codes | The code library (for example `NET-VPN-01`): resolution, root cause, runbook, uses, average RES MTTR, and whether the fix can be automated |
| Handover log | History of shift handovers and whether each was acknowledged |

### Reports
Two modes.

- **Insights**
  - **Performance:** MTTR and volume by week, root causes, most-used codes, assignment group performance, and handover signals. Ranges are 30, 60 or 90 days with change versus the previous period.
  - **Quality & coaching:** automatic QA scoring on every resolved ticket (documentation, contact logged, correct code, validated, SLA met), analyst scorecards and a coaching plan.
  - **Explorer (Tier 1):** pick a measure and a dimension to get a chart and table.
  - **Template search (Tier 2):** type a question in plain English. It is matched to a report template (trend, top or bottom ranking, breakdown). This is rules-based, not AI.
- **Compare & generate:** compare two periods, assignment groups or channels side by side. Generate a report from a template: weekly service operations report, monthly SLA review or team coaching pack. Reports are built from the Ticket Explorer records.

### Team Management
| Tab | What it covers |
|---|---|
| Roster & access | Team members, access role, assignment group, default shift, base location, today's status and skills. Team leads can add members |
| Schedule & coverage | The **shift calendar** (Day, Week and Month views), leave requests and the weekend and holiday rota |
| Attendance | Today's clock-ins, late arrivals, leave, and on-time rate over 30 days |
| Password vault | Each person's work credentials with expiry, reminders and rotation. Team leads see compliance counts only |

### Account profile
- **Profile card:** name, SOEID, role, assignment group, default shift, location and skills, plus editable details and custom fields.
- **Role-based access:** the access for each role, with the current role highlighted.
- **Your year at a glance:** a heatmap of attendance, shifts and leave. Hovering a day shows the shift and the hours.
- **Leave and shifts:** leave balances, this week's shifts, and leave requests.

## Key rules

### SLA
| Priority | SLA | Load weight |
|---|---|---|
| P1 | 4 h | 3 |
| P2 | 8 h | 2 |
| P3 | 24 h | 1 |
| P4 | 72 h | 1 |

- **At risk:** less than 25% of the SLA window is left.
- **Breached:** past the deadline.

### Fair-share assignment
Only online analysts are eligible.
1. Each new ticket goes to the analyst with the lowest **weighted load**. Loads are capped at 12 points.
2. Ties go to the analyst with the fewest tickets assigned today.
3. Remaining ties go to whoever has waited longest since their last assignment.

Every ticket records why it went to that person. **Rebalance** re-runs the rule for tickets held by analysts who have gone offline.

### Queue risk score (0–100)
The score has four parts:
- SLA pressure: up to 40 points
- P1/P2 share: up to 25 points
- Load against capacity: up to 20 points
- Queue age: up to 15 points

Below 35 is low, 35–59 is elevated and 60 or above is high.

### Coverage minimums
- **Weekdays:** 5 people on shift, including at least 2 early and 1 late.
- **Weekends:** 2 people on weekend duty.
- **Public holidays:** a skeleton crew of 3.

| Shift | Hours |
|---|---|
| Early | 06:00–15:00 |
| Mid | 10:00–19:00 |
| Late | 14:00–23:00 |
| Weekend | 08:00–17:00 |

### Notifications
Notifications are scoped to the role and split into **Needs action** and **Updates**:
- SLA breaches and at-risk tickets
- Fix approvals and decisions
- New P1s
- Assignments
- Handovers to acknowledge
- Leave requests and coverage gaps
- Password expiry
- Runbook and code updates

### Resolution Assist
A rules engine, not AI. It finds keyword overlap with resolved history, then lets the resolution codes on those tickets vote. It suggests a likely code, next actions, similar incidents and runbooks, and can propose an automated fix that needs team lead approval.

### Resolution journey
The journey has five steps: Detection, Diagnosis, Fix applied, Validation and Close.
- **Code:** the root cause picked during Diagnosis produces the resolution code. A new fix gets a newly created code.
- **Afterwards:** the resolved ticket feeds Ticket Explorer, QA scoring and Resolution Assist.

### Password vault flow
1. **Add** a credential: app, username and password, with a generator and strength meter.
2. **Set the expiry:** 30, 60 or 90 days, or a specific date, plus how many days ahead to remind.
3. **Get reminded** through a bell notification and a vault banner.
4. **Rotate** the password and confirm the change.
5. **Age resets** and a new expiry is set.

Revealing or copying a password requires a fresh identity check.

## Limitations of the prototype
- **No backend:** there is no backend, login or real ServiceNow connection. State resets on reload, or when you use Dev → Reset.
- **Schedule data:** the shift rota is seeded for two weeks. Other dates are generated from the same pattern.
- **Vault:** the vault stores sample secrets in memory only. A production version must use an approved enterprise secrets manager.
