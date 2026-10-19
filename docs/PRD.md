# Scope: Product Requirements (draft v0.2)

| | |
|---|---|
| **Product** | Scope: Solution Center Hub (formerly "ServiceOps Console") |
| **Status** | Draft v0.2, PRD starting point |
| **Updated** | 2026-10-14 |
| **Source** | The clickable prototype in this repo. Design system: [`DESIGN.md`](../DESIGN.md) |

> [!NOTE]
> **Scope** is one workspace for a service desk team to run the incident queue, assign work fairly, resolve and document tickets, plan shifts and coverage, and coach on quality. It sits on top of ServiceNow and does not replace it. ServiceNow stays the system of record for incidents. The console adds the operational layer the team does by hand today: fairness, coverage, handovers, resolution knowledge and coaching.
>
> This document describes the clickable prototype as it stands, then turns it into the start of a PRD: problem, users, scope, MVP cut, rules, data and open questions.

---

## 1. Problem

What team leads and analysts deal with today:

- **Queue health is invisible until it's late.**
  - SLA breaches are noticed after they happen.
  - Nobody has one number for "how bad is the queue right now".
- **Assignment feels unfair and isn't explainable.**
  - Tickets are handed out manually or round-robin.
  - Priority is ignored, so one analyst ends up with three P1s while another has P4s.
  - Nobody can say *why* a ticket went to someone.
- **Shift coverage lives in spreadsheets.**
  - Leave, weekend duty, holidays and early/late minimums are tracked separately.
  - Coverage gaps are found on the day.
- **Handovers are verbal or in chat.** Open criticals get lost between shifts, and nobody confirms they were received.
- **Resolution knowledge isn't reused.**
  - The same incident is diagnosed from scratch again.
  - Resolution codes are inconsistent, so reporting on root cause is unreliable.
- **Reporting and coaching are manual.**
  - MTTR, SLA attainment and QA are compiled by hand each week.
  - Coaching is based on anecdotes.
- **Credential hygiene:** analysts juggle many work app passwords with different expiry rules, and expiries cause lockouts mid-shift.

## 2. Goals and non-goals

**Goals**
1. Show live queue health in one screen, with an explainable risk score.
2. Assign tickets automatically and fairly, weighted by priority, and record the reason.
3. Make resolving a ticket produce structured, reusable knowledge: a journey and a resolution code.
4. Plan shifts with coverage minimums enforced visually, and flag gaps before the day.
5. Make handovers explicit and acknowledged.
6. Produce performance, QA and coaching reports without spreadsheet work.
7. Remind people before work credentials expire, without the team lead ever seeing secrets.

**Non-goals (for now)**
- Replacing ServiceNow as the ticketing system, or editing ServiceNow configuration.
- Running automated fixes without a human approving them.
- Generative AI. The assist features are deliberately rules-based and explainable (see §8).
- Payroll, HR leave balances of record, or timekeeping of record. The console reads from them; it doesn't own them.
- A full password manager. See the vault open question in §12.

## 3. Users and roles

| Persona | Who | Main jobs |
|---|---|---|
| **Team lead** | Runs one or more shifts of a service desk or support group | Watch queue health, rebalance work, approve automated fixes, plan the rota, approve leave, run handovers, coach analysts |
| **Analyst** | Resolves incidents | Work their prioritised queue, resolve and document tickets, log customer contact, request automated fixes, hand over at shift end, see their own schedule and leave |
| *Service ops manager* (secondary) | Above the team lead | Reads reports, approves the team lead's leave, sees trends across groups |

### Role-based access

| Team lead | Analyst |
|---|---|
| Whole-queue view | Own work queue, plus the team queue read-only |
| Rebalance, set analyst status | Resolve and document tickets |
| Approve automated fixes | Request automated fixes |
| Edit the schedule, approve leave | See own schedule, request leave |
| Team vault compliance (counts only) | Own password vault |
| Coaching scorecards | — |

---

## 4. Information architecture

```
Sign in (SSO; Dev Login in the prototype)
  ↓
Sidebar
├── General
│   ├── Home: Queue command
│   ├── Ticket Explorer
│   └── Reports
├── Tools
│   ├── Team Management
│   ├── Knowledge Base
│   └── Copilot
└── Profile menu (bottom)
    ├── Account profile
    └── Log out

Header: breadcrumb · ServiceNow status (center) · date · light/dark · Notifications
```

### Global elements
- **Sign in:** the app opens on a sign-in page: a centered card on the black rounded panel, with the scope brand above it.
  - **Continue with SSO** is the production path. It isn't connected in the prototype yet.
  - **Dev Login** (prototype only) signs in as the sample team lead or analyst.
  - The session is remembered per browser. **Log out** returns to the sign-in page with a "You're signed out" note.
- **Brand:** the sidebar shows **scope** with "Solution Center Hub" underneath; the breadcrumb starts with "Scope".
- **ServiceNow status pill (header center):** the sync state plus chips for open, P1 and waiting (unassigned) counts. Clicking it shows sync latency, the last sync, intake in the last hour, and **Sync now**.
- **Notifications (header right):** scoped to the role and split into **Needs action** and **Updates**. See §7.
- **Light/dark theme:** remembered per browser.
- **"i" buttons on KPI cards:** each opens a side panel explaining exactly how that number is calculated. This is a trust feature: every metric can be explained.
- **Onboarding tour:** an 11-step guided tour for team leads and 9 steps for analysts, spotlighting the real UI. Some steps have "Try it" actions: rebalance, open my work queue, open approvals, open handover.

---

## 5. Pages: what each one does

### 5.1 Home: Queue command
*The live view of the queue and the team working it. It's the default landing page.*

**KPI row**

| Card | Shows | Rule |
|---|---|---|
| Active incidents | Open count, P1 and P2 counts, breached and at risk | Turns red when any P1 is open |
| Queue risk score | 0–100, a Low/Elevated/High label, a 4-part bar, and the main driver | See §8.2 |
| SLA health average | Ring with % of SLA time left; % of tickets younger than half their SLA | Amber below 55, red below 35 |
| Analysts online | Online out of the team total, plus on leave and off shift | — |

**Schedule this week:** a read-only preview of the shift calendar.
- **Today dropdown:** one slim row of counts: online now, onsite, WFH, on leave. It opens a panel listing names with each person's shift and location, for example "Early · Onsite".
- **Week row:** Mon–Sun with bars for leave, sick days, weekend duty and holidays, plus each day's coverage (for example `4E 2M 3L`) in red when it's short.
- **Clicks:** clicking a day or bar opens Team Management on that day.
- **Height:** the week grid stretches to fill the card's height when the card beside it is taller.

**Assigned per online analyst:** each analyst's weighted load against the cap, open tickets, points and tickets assigned today.
- **Spread:** an Even/Uneven badge based on the gap in points between analysts.
- **Team lead controls:** set each analyst's status (online, offline, on leave) and **Rebalance**.

**Tabs**

| Tab | Who | What |
|---|---|---|
| Team queue | Both | All open incidents: ID, description, priority, state, total age, age in queue, SLA status, assignee with the reason they got it. Searchable. A row opens the ticket workspace |
| My work queue | Both | Own tickets, ordered by priority and then SLA urgency |
| Shift handover | Both | Generated summary: resolved this shift, critical incidents still open, next week's coverage; free-text notes; submit to the next shift |
| Fix approvals | Team lead | Automated fixes proposed by analysts (request, ticket, code, proposed fix, requester, time), to approve or reject |

**Ticket workspace (side panel)**
- **Resolution steps:** a checklist taken from the matched resolution code.
- **Contact log:** channel and note ("What did you tell the customer?").
- **State:** a selector for the ticket's state.
- **Resolution Assist:** likely code, next actions, similar past incidents, runbooks, and **Request automated fix**.
- **Resolve:** setting the state to *Resolved* opens the resolution journey (§8.5).

### 5.2 Ticket Explorer
*How incidents were solved: an investigation and knowledge tool.*

| Tab | What |
|---|---|
| Resolved tickets | KPIs: records, avg EZE MTTR, avg RES MTTR, avg lost time, **Goal ≤4 hours**. Filters: search, date range (7/30/90/all), product group, channel, business app, FCR. Table: ticket, product group, channel, app, opened, resolved, EZE, RES, lost time, FCR, code. A row opens the **journey drawer**: the stage-by-stage timeline, QA result and similar incidents |
| Resolution codes | Code library: code, resolution, root cause, runbook, uses, avg RES MTTR, automatable. Filter by category |
| Handover log | Every handover: ID, time, shift, from → to, resolved, open critical, notes, acknowledged status |

### 5.3 Reports
*Performance, quality and coaching, built from Ticket Explorer records.*

**Insights**
- **Performance** (30/60/90 days, with change against the previous period)
  - KPIs: EZE MTTR, RES MTTR, SLA attainment, volume, transfer rate.
  - Charts: MTTR by week, volume by week, root causes, top resolution codes.
  - Tables: assignment group performance and the shift handover signal.
- **Quality & coaching**
  - QA rubric: each resolved ticket is scored automatically on 5 criteria worth 20 points each. The criteria are documentation, contact logged, correct code, validated and SLA met.
  - Analyst scorecards for the last 30 days, lowest first.
  - Coaching plan: what to coach each person on, taken from their weakest criteria.
- **Explorer (Tier 1):** pick a measure and a dimension and get a chart plus a table.
  - Measures: volume, RES/EZE MTTR, lost time, SLA attainment, FCR rate, transfer rate.
  - Dimensions: channel, business app, product group, assignment group, analyst, root cause, code, priority, week.
- **Template search (Tier 2):** type a question in plain English, for example "slowest business apps by RES MTTR". It is parsed into a template (T-01 trend, T-02 top/bottom ranking, T-03 breakdown) plus a measure and a dimension. This is rules-based and runs in the browser.

**Compare & generate**
- **Compare:** two periods, assignment groups or channels side by side.
- **Generate:** a report from a template: weekly service operations report, monthly SLA review or team coaching pack, with a preview.

### 5.4 Team Management

| Tab | What |
|---|---|
| Roster & access | Name, SOEID, access role, assignment group, default shift, base location, today's status, skills. Team leads can **add members**; the SOEID must be 2 letters and 5 digits |
| Schedule & coverage | The **shift calendar** (below), leave requests (team lead approves or rejects), and the holiday and weekend rota |
| Attendance | Clocked in today, late arrivals, on leave, team on-time rate over 30 days; today's clock-in table and a 30-day summary per analyst |
| Password vault | Personal credential vault (§8.7). Team leads see compliance counts only |

**Shift calendar**
- **Views:** Day, Week and Month, with back/forward arrows, a Today button, and a coverage status ("Fully covered" or "N days below minimum").
- **Month:** bars for leave, sick days and weekend duty that span their days. A public holiday is one bar for the whole team. Regular shifts are summarised as each day's coverage. A day shows up to 3 rows of bars, then "+N more".
- **Week:** everyone's shift per day, grouped Early → Mid → Late → Weekend → Leave, with coverage at the bottom.
- **Day:** a 06:00–23:00 timeline per person showing shift hours and onsite/WFH, a current-time line, and who is off.
- **Editing (team lead):** clicking a person or bar opens a shift picker. Editing a multi-day bar changes every day in it. Analysts see a read-only view with their own entries outlined.

### 5.5 Account profile
- **Profile:** name, SOEID, role, group, default shift, location, skills; editable email, manager and custom fields.
- **Role-based access:** both roles listed, with the current one highlighted.
- **Your year at a glance:** a heatmap like a GitHub contribution graph.
  - Square types: worked onsite, WFH, late shift, weekend duty, personal leave, sick, holiday, rest day.
  - Hovering a square shows the shift and hours, for example "Worked onsite · Early shift (06:00–15:00)".
- **Leave:** leave balances (personal and sick), attendance rate, this week's shifts, and leave requests with status.

---

## 6. Key user flows

1. **New incident → assigned:** ServiceNow sync → incident appears in the Team queue → fair-share picks an analyst (§8.1) → the reason is stored → the analyst gets an "Assigned to you" notification.
2. **Resolve:** open the ticket → follow Assist and the steps → log contact → set to Resolved → five-step journey → code created → appears in Explorer, QA and Assist.
3. **Automated fix:** Assist suggests an automatable code → the analyst requests the fix → the team lead approves or rejects in Fix approvals → the analyst is notified of the decision.
4. **Analyst goes offline:** the team lead sets them offline → a rebalance prompt appears → **Rebalance** re-assigns their open tickets by fair-share.
5. **Shift handover:** the outgoing shift reviews the generated summary and adds notes → submits → the next shift sees "Handover to acknowledge" → acknowledges → it's logged in Explorer.
6. **Coverage gap:** leave is approved or a shift is changed → the day's coverage turns red in the calendar and the Home preview → the team lead swaps a shift in the calendar.
7. **Password expiry:** add a credential with an expiry and reminder → the reminder date arrives → bell notification and vault banner → rotate → age resets.

---

## 7. Notifications

| Group | Items | Team lead | Analyst |
|---|---|---|---|
| Needs action | P1/P2 SLA breached; tickets with under 25% of SLA left | All queue | Own tickets |
| Needs action | Automated fix awaiting approval | ✓ | — |
| Needs action | Handover waiting for acknowledgement | ✓ | ✓ |
| Needs action | Leave request to approve; coverage below minimum | ✓ | — |
| Needs action | Password expiring or expired (own vault) | ✓ | ✓ |
| Updates | New P1 pulled from ServiceNow | ✓ | ✓ |
| Updates | Ticket assigned to you | — | ✓ |
| Updates | Fix approved or rejected | — | ✓ |
| Updates | Runbook or resolution-code changes | ✓ | ✓ |

Each notification links to the place to act: a ticket, a tab or a calendar day. Notifications can be marked read one at a time or all at once.

---

## 8. Business rules (current prototype values)

### 8.1 SLA and fair-share assignment

| Priority | SLA | Load weight |
|---|---|---|
| P1 | 4 h | 3 |
| P2 | 8 h | 2 |
| P3 | 24 h | 1 |
| P4 | 72 h | 1 |

- **At risk:** less than 25% of the SLA window is left. **Breached:** past the deadline.
- **Eligible analysts:** only online analysts. An analyst is capped at **12 load points**.
- **Pick order:** lowest weighted load first. Ties go to the fewest tickets assigned today, then to whoever has waited longest since their last assignment.
- **Explainable:** every assignment stores the reason in plain language.
- **Rebalance:** re-runs the rule for tickets held by analysts who are offline.

### 8.2 Queue risk score (0–100)

| Factor | Weight | Input |
|---|---|---|
| SLA pressure | 40 | (breached + 0.6 × at risk) / open |
| P1/P2 share | 25 | P1+P2 / open |
| Load vs. capacity | 20 | weighted load / (12 × online analysts) |
| Queue age | 15 | avg time in queue / 8 h ceiling |

Bands: below 35 is low, 35–59 elevated, 60 or above high.

### 8.3 Time and quality measures
- **EZE MTTR** (end to end): resolved − opened.
- **RES MTTR** (resolver): resolved − assigned.
- **Lost time:** EZE − RES, meaning time waiting or bouncing between groups. Amber above 2 hours.
- **Goal ≤4 hours:** share of tickets with RES MTTR under 4 hours. The target is 80%; the card is amber below 80% and red below 65%.
- **FCR:** resolved at first contact. **Transfer rate:** share of tickets transferred at least once.
- **QA score:** 5 criteria × 20 points (documentation, contact logged, correct code, validated, SLA met).

### 8.4 Coverage and shifts

| Code | Meaning | Hours |
|---|---|---|
| E | Early | 06:00–15:00 |
| M | Mid | 10:00–19:00 |
| L | Late | 14:00–23:00 |
| W | Weekend duty | 08:00–17:00 |
| PL / SL | Personal leave / Sick leave | — |
| H | Public holiday | — |
| OFF | Rest day | — |

Minimums:
- **Weekday:** 5 on shift, including at least 2 early and 1 late.
- **Weekend:** 2 on weekend duty.
- **Public holiday:** a skeleton crew of 3.

Location pattern: hybrid. Staff based at home come onsite on Tuesday and Thursday; staff based onsite work from home on Friday.

### 8.5 Resolution journey and codes
- **Five steps:** Detection → Diagnosis (root cause) → Fix applied → Validation (customer confirmed) → Close (contact and code).
- **Code format:** `CAUSE-SUB-NN`, for example `NET-VPN-01`.
- **Root cause families:** NET, IAM, APP, EUC, INF, USR, each with subcategories.
- **New fixes:** marking a fix as new creates the next code number.
- **Code contents:** each code carries the resolution, runbook, an automatable flag and the fix.

### 8.6 Resolution Assist (rules, not AI)
- **How it works:** it finds keyword overlap between the open ticket and resolved history. The codes on the closest matches then vote, which gives the likely code with a confidence figure.
- **What it outputs:** the likely code, next actions, similar incidents, runbooks, and an automated-fix proposal when the code is automatable.
- **Where it appears:**
  - Ticket workspace: to act.
  - Explorer journey drawer: similar incidents only.
  - Fix approvals: to decide.
- **Why rules:** every suggestion can be traced, and nothing runs without a team lead's approval.

### 8.7 Password vault
1. Add: app, username and password, with a generator and strength meter.
2. Set the expiry (30/60/90 days or a date) and a reminder lead time (1/7/14/30 days).
3. Reminder through the bell and a vault banner until the password is rotated.
4. Rotate: generate, update it in the app, confirm, pick the next cycle.
5. The age resets.

Revealing or copying a password needs a fresh identity check. Team leads see compliance counts only, never secrets.

---

## 9. Data model (draft)

| Entity | Key fields | Source of truth |
|---|---|---|
| Analyst | id, name, SOEID, role, assignment group, default shift, base location, skills, status | HR / identity directory, plus console status |
| Ticket (open) | id, description, priority, state, channel, business app, product group, opened, assigned, assignee, assign reason, steps, contact log | **ServiceNow** (synced) |
| Resolved ticket | ticket fields + resolved, EZE/RES/lost hours, FCR, transfers, code, journey stages, QA result | ServiceNow + console journey → **analytics store** |
| Resolution code | code, cause, sub, resolution, runbook, automatable, fix, uses | Console (knowledge base) |
| Fix request | id, ticket, code, proposed fix, requester, status, decided by/at | Console |
| Handover | id, shift, from → to, resolved, open critical, notes, acknowledged by/at | Console |
| Shift assignment | analyst, date, code, location | Console rota (or the WFM tool) |
| Leave request | id, analyst, type, from, days, status, approver | HR leave system (read/write?) |
| Vault item | id, owner, app, username, secret*, changed, expires, reminder days, strength | *Must be an enterprise secrets manager* |
| Notification | id, kind, audience, title, link, created, read | Console |

> [!IMPORTANT]
> **Open question: SC Lakehouse.**
> Ticket Explorer and Reports need a history store with EZE/RES/lost time, journeys and QA. If **SC Lakehouse** is the data platform this project is named after, it's the natural home for resolved tickets, journeys, the code library and report aggregates. In that model ServiceNow feeds raw data in, and the console writes journeys, codes and handovers back. Confirm the scope and the ingestion pattern: batch, CDC or API.

---

## 10. Integrations

| System | Direction | Prototype | Production need |
|---|---|---|---|
| ServiceNow | Read incidents (30-second sync); write assignment, state, work notes and resolution code | Simulated intake and sync | API or integration user, rate limits, field mapping, conflict rules |
| Identity / SSO | Sign-in, role, SOEID | Role switch in the Dev panel | SSO, role mapping, re-authentication for the vault |
| Analytics store (SC Lakehouse?) | Resolved history, aggregates | Seeded 220 tickets | Ingestion, retention, refresh cadence |
| HR / leave | Leave balances and requests | Sample data | Read balances; submit or approve requests? |
| WFM / rota (if any) | Shifts | Seeded 2 weeks + generated pattern | Decide whether the console owns the rota |
| Secrets manager | Vault | In-memory sample | Approved enterprise manager; the console only shows expiry and reminders |
| Automation runner | Run approved fixes | Approval only | Which runner, audit, rollback |

---

## 11. MVP scope

### MVP (v1): run the shift
| Area | Included |
|---|---|
| Queue | ServiceNow read sync, Team queue, My work queue, SLA status, Active incidents and SLA health KPIs, ServiceNow status pill |
| Assignment | Fair-share auto-assignment with reasons, analyst status, Rebalance, Assigned per online analyst card |
| Resolution | Ticket workspace (steps, contact log, state), five-step journey, resolution codes, write the code back to ServiceNow |
| Handover | Generate, submit, acknowledge, handover log |
| Schedule | Shift calendar (Month/Week/Day), team lead editing, coverage minimums, Home week preview |
| Notifications | SLA, assignment, P1, handover, coverage |
| Access | Two roles (team lead, analyst), SSO |
| Trust | "i" explanation panels on every KPI |

### v1.1: learn from history
- Ticket Explorer (resolved tickets, journey drawer, code library).
- Queue risk score.
- Reports → Performance and Explorer (Tier 1).
- QA auto-scoring and analyst scorecards.
- Leave requests and approvals; attendance.
- Onboarding tour.

### v1.2: assist and automate
- Resolution Assist (similar incidents, likely code, runbooks).
- Automated-fix requests and team lead approvals, connected to the automation runner.
- Template search (Tier 2), Compare & generate, coaching plan.

### Later or to validate
- Password vault: expiry reminders only, linked to the enterprise secrets manager. This depends on security review.
- Year-at-a-glance heatmap and leave balances (needs HR data).
- Cross-group views for the service ops manager.
- Skills-based routing (skills exist on the roster but aren't used for assignment yet).

---

## 12. Open questions and risks

1. **Vault:** storing secrets in this app is a security risk. Do we drop the vault, or keep only expiry tracking linked to the approved secrets manager?
2. **System of record for the rota:** does the console own shifts, or read them from a WFM tool?
3. **Write-back to ServiceNow:** which fields, how conflicts are handled, and the audit trail.
4. **Fair-share tuning:** are the weights (3/2/1/1) and the 12-point cap right? Should skills and assignment group limit who is eligible?
5. **Risk score calibration:** are the weights and the 35/60 bands useful? Back-test them on history.
6. **QA rubric:** is automatic scoring acceptable to the team, or does it need a manual QA sample?
7. **Coverage minimums:** do they differ per group, site or season?
8. **Holiday calendar:** which countries and sites? The prototype uses PH holidays.
9. **Privacy:** attendance and the heatmap are personal data. Who can see what, and for how long?
10. **SC Lakehouse:** see §9. Confirm it's the data platform and who owns ingestion.

## 13. Success metrics (proposed)

| Metric | Baseline | Target (to agree) |
|---|---|---|
| SLA attainment | Current | +X pts in 90 days |
| P1/P2 breaches per week | Current | −50% |
| Load spread between analysts (pts) | Unknown | ≤ 3 pts most of the shift |
| Lost time (EZE − RES) | Current | −25% |
| Handovers acknowledged within 30 min | — | ≥ 95% |
| Coverage gaps found less than 24 h ahead | Current | ~0 |
| Tickets resolved with a valid code | Current | ≥ 95% |
| Time team leads spend on weekly reporting | Current | −80% |

## 14. Non-functional requirements (draft)

- **Security:** SSO, role-based access enforced on the server, audit log for assignment, rebalance, approvals, shift edits and leave decisions, and re-authentication for sensitive actions.
- **Freshness:** queue sync ≤ 30 s; KPIs recomputed on every sync.
- **Explainability:** every computed number has an "i" explanation; every assignment and suggestion shows its reason.
- **Accessibility:** keyboard navigation, focus states, and status never shown by color alone (labels or icons too). Target WCAG 2.1 AA.
- **Theming:** light and dark modes.
- **Offline-safe assets:** fonts bundled, with no third-party CDNs.

## 15. Design system (as built)

The full spec (tokens, type scale, color, radius, elevation, spacing, components) is in [`DESIGN.md`](../DESIGN.md). `npm run check:design` enforces it, and it runs before every build. A summary:


- **Canvas and cards:** soft neutral canvas with glass cards (translucent fill, background blur, 22px corners, no border or shadow), and a thin divider under card titles.
- **Shape and type:** pill controls and round icon buttons. Geist for text, Geist Mono for codes, SOEIDs and coverage labels.
- **Color:**
  - Citi blue `#056DAE` for accents (links, focus, badges), with a derived soft blue as the main pastel.
  - KPI cards use four blue tints (sky, ice, azure, navy). Green, amber and red are only for status.
  - Shift colors: Early blue, Mid sage, Late pink, Weekend butter. Leave and sick days have a dashed outline; holidays are dark.
- **KPI card anatomy:** a bold title, the large value, a footer, an "i" button in the top-right corner, and the card's filled icon oversized and cropped as the background shape.

## 16. Prototype status

- **Built:** all pages and flows above, clickable, in the React prototype in this repo. A single-file page is published for sharing.
- **Simulated:** ServiceNow intake and sync, sign-in (Dev Login) and role switching (Dev panel), and history: 220 resolved tickets, 14 seeded rota days plus a generated pattern for other dates.
- **Not built:** backend, persistence, real integrations, server-side permissions, audit log.
- **Design guard:** `scripts/check-design.mjs` blocks raw colors, off-scale font sizes, radii and z-index, unknown fonts, and drop shadows on in-page surfaces.
- **Verification:** flows were exercised in an automated headless browser. The visual design has been reviewed through screenshots during iteration.
