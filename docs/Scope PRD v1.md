---
tags: [sc-lakehouse, scope, prd]
created: 2026-10-20
status: v1.0 outline
source: ~/goated-sc-project/docs/PRD-v1.md
---

# Scope: Product Requirements Document (v1.0, outline)

| | |
|---|---|
| **Product** | Scope: Solution Center Hub |
| **Status** | Outline. Sections are scaffolded and not yet written |
| **Version** | v1.0-outline |
| **Updated** | 2026-10-20 |
| **Owner** | _TBD_ |
| **Reviewers** | _TBD (team lead, service ops manager, security, architecture, AI governance)_ |
| **Supersedes** | [[ServiceOps Console Product Design]] (repo `docs/PRD.md`, draft v0.2, prototype description). Content is migrated from it section by section |
| **Related** | `DESIGN.md` (repo) · `ai-dev-plan/index.html` (repo) · prototype in `src/` |

> [!NOTE]
> **How to use this document**
> This PRD is the single source of truth for delivering Scope end to end: what we build, why, for whom, how it runs, what it costs, and how we know it's done. It also serves as the evidence pack for the **CSI ID application** (see §16).
>
> Each section has:
> - **Purpose:** what the section must answer.
> - **Include:** the content it needs.
> - **Source:** where existing material lives (the v0.2 PRD, the AI plan or the code).
> - **Status:** `TODO` (not started), `MIGRATE` (exists in v0.2 and needs moving and updating), `DECIDE` (blocked on a decision), `DRAFT` (written, needs review) or `DONE`.

### Planning under uncertainty

Two decisions are outside our control. The PRD must hold for every combination of them, so these tags are used throughout:

| Tag | Meaning |
|---|---|
| `[CSI]` | A CSI ID is approved. Scope is deployed as a registered application with a URL, SSO and real integrations |
| `[NO-CSI]` | No CSI ID. Scope stays a prototype or a locally run or single-file tool with sample or exported data |
| `[AI]` | An approved LLM is available through the firm's AI gateway |
| `[RULES]` | No LLM. Copilot and Resolution Assist run in rules-only mode (already built in the prototype) |

| | `[AI]` | `[RULES]` |
|---|---|---|
| **`[CSI]`** | Full target product | Full product, with deterministic assist only |
| **`[NO-CSI]`** | Not viable: AI needs a registered app | Demo/prototype track (current state) |

---

## 1. Executive Summary & Context

### 1.1 Background
- **Purpose:** Why this project exists now.
- **Include:** Solution Center team context, ServiceNow as the system of record, how the prototype started, the multi-workspace vision (SC, CyberArk PAM, Database Engineering, Mainframe Operations).
- **Source:** v0.2 summary note; `src/workspaces.js`.
- **Status:** `MIGRATE`

### 1.2 Goal
- **Purpose:** One-paragraph statement of what success looks like.
- **Include:** The single north-star outcome, for example SLA attainment and fair, explainable workload.
- **Source:** v0.2 §2.
- **Status:** `MIGRATE`

### 1.3 Problem Statement
- **Purpose:** The pains, written so a reviewer outside the team understands them.
- **Include:** Invisible queue health, unfair assignment, spreadsheet rotas, verbal handovers, knowledge not reused, manual reporting and coaching. Add evidence (numbers, quotes) for each where possible.
- **Source:** v0.2 §1.
- **Status:** `MIGRATE`. Needs baseline data.

### 1.4 Solution Overview
- **Purpose:** What Scope is and isn't, in one screen.
- **Include:** An operational layer on top of ServiceNow (not a replacement), the module list, explainability as a principle, and AI as optional with a rules-only fallback.
- **Source:** v0.2 summary and §2 non-goals; AI plan "Six rules".
- **Status:** `MIGRATE`. Update the "no generative AI" non-goal, which conflicts with the Copilot work.

### 1.5 Core Workflow
- **Purpose:** The end-to-end loop on one diagram.
- **Include:** Ticket arrives → synced → risk scored → fair-share assigned → worked in the ticket workspace → resolved with journey and code → handed over → reported and coached → knowledge reused. Show where a person approves.
- **Source:** v0.2 §6 key flows.
- **Status:** `TODO` (diagram).

---

## 2. Project Overview

### 2.1 Business Goals
- **Purpose:** Measurable business outcomes, each linked to a metric in §13.
- **Include:** Goals from v0.2 §2, each with an owner and a target.
- **Status:** `MIGRATE`

### 2.2 Project Scope
- **Purpose:** Hard boundaries.
- **Include:**
  - **In scope:** modules, roles, workspaces for v1.
  - **Out of scope:** replacing ServiceNow, autonomous fixes, payroll or HR of record, password management.
  - **Future scope.**
- **Source:** v0.2 §2 non-goals, §11.
- **Status:** `MIGRATE`

### 2.3 Assumptions, Dependencies & Constraints
- **Purpose:** State what the plan relies on, especially the two open approvals.
- **Include:**
  - CSI ID approval: timeline, owner, impact if refused.
  - LLM availability: which gateway, which models, data classification limits.
  - ServiceNow API or integration user access.
  - SSO / identity integration.
  - Data platform (SC Lakehouse, to be confirmed).
  - Team capacity.
- **Status:** `DECIDE`

---

## 3. MVP Definition

### 3.1 MVP Pillars
- **Purpose:** 3–5 pillars that define "minimum lovable" for v1.
- **Include:** For example: Run the shift (queue + assignment), Resolve and document, Hand over, Plan coverage, Trust (explainability + access).
- **Source:** v0.2 §11 "MVP (v1): run the shift".
- **Status:** `MIGRATE`

### 3.2 Release Plan
- **Purpose:** What ships in each release.
- **Include:** v1 (run the shift), v1.1 (learn from history), v1.2 (assist and automate), later (to validate).
- **Source:** v0.2 §11.
- **Status:** `MIGRATE`

### 3.3 Delivery Scenarios
- **Purpose:** What we deliver under each `[CSI]`/`[NO-CSI]` × `[AI]`/`[RULES]` outcome.
- **Include:** For each scenario: deliverable, users, data used (live or sample), hosting, and what is deferred.
- **Status:** `TODO`

---

## 4. Current State Analysis

### 4.1 Current Process & Tools Overview
- **Purpose:** How the team works today without Scope.
- **Include:** ServiceNow usage, spreadsheets (rota, leave, reports), chat handovers, how assignment is done, and how reports are compiled.
- **Status:** `TODO`. Needs interviews with team leads.

### 4.2 Current Strengths (to preserve)
- **Purpose:** What works today and must not break.
- **Include:** ServiceNow as the system of record, existing SLAs, existing resolution habits.
- **Status:** `TODO`

### 4.3 Critical Gaps (addressed by MVP)
- **Purpose:** Gap → MVP feature → metric traceability table.
- **Status:** `TODO`

### 4.4 Prototype Status
- **Purpose:** What the clickable prototype proves and what it simulates.
- **Include:** Built, simulated and not built; design guard; verification method.
- **Source:** v0.2 §16.
- **Status:** `MIGRATE`

---

## 5. User Personas

Each persona: role summary, goals, daily jobs, pains, key screens, permissions, and success measures for them.

### 5.1 Analyst
- **Status:** `MIGRATE` (v0.2 §3)

### 5.2 Team Lead
- **Status:** `MIGRATE` (v0.2 §3)

### 5.3 Service Ops Manager
- **Status:** `MIGRATE`. Currently marked secondary; confirm whether it's in v1.

### 5.4 Workspace Admin
- **Purpose:** Who configures a workspace (assignment groups, roster, code prefix, knowledge base, AI settings).
- **Source:** `src/workspaces.js`, Copilot settings.
- **Status:** `TODO`. A new persona implied by workspaces.

### 5.5 Roles & Permissions Matrix
- **Purpose:** Each action × each role, enforced on the server.
- **Source:** v0.2 §3 "Role-based access".
- **Status:** `MIGRATE`. Extend with the admin role and the Copilot and knowledge base actions.

---

## 6. Data Model

For each table: purpose, fields (name, type, required, description), keys, source of truth, sync direction, retention, and data classification.

### 6.1 Core Tables Overview
- **Source:** v0.2 §9.
- **Status:** `MIGRATE`

### 6.2 Ticket & Sync Tables
- Open ticket (synced from ServiceNow), sync cursor and state, contact log, ticket steps.

### 6.3 Resolution Tables
- Resolved ticket, resolution journey (five stages), resolution code library, QA result, fix request.

### 6.4 Analyst, Roster & Leave Tables
- Analyst, skills, status history, shift assignment, shift codes, coverage minimums, leave request, attendance.

### 6.5 Handover Table
- Handover, handover items, acknowledgement.

### 6.6 Knowledge Base & Copilot Tables
- Knowledge base pages, chunks and index, data tables (app directory, on-call), Copilot conversations, tool-call log, feedback.
- **Source:** `src/kb.js`, `src/copilot.js`.

### 6.7 Notification Table

### 6.8 Audit Log Table
- Assignment, rebalance, approvals, shift edits, leave decisions, Copilot actions.

### 6.9 Workspace & Configuration Tables
- Workspace, assignment groups, settings, feature flags (AI on or off).

### 6.10 Date Dimension & Holiday Calendar
- Countries and sites in scope (the prototype uses PH holidays).

### 6.11 Entity Relationships
- ERD diagram.

### 6.12 Data Classification, Residency & Retention
- **Purpose:** Required for CSI and for AI approval. Which fields are PII or confidential, where they're stored, and how long.
- **Status:** `DECIDE`

---

## 7. Ticket Lifecycle Definitions

### 7.1 Ticket Lifecycle (ServiceNow states → Scope states)
- New → Assigned → In progress → On hold / awaiting → Resolved → Closed. Include entry and exit rules and who can move a ticket between states.

### 7.2 Resolution Journey (five stages)
- **Source:** v0.2 §8.5.

### 7.3 SLA Definitions
- Per priority: response and resolve targets, breach rules, pause conditions.
- **Source:** v0.2 §8.1.

**Status for §7:** `MIGRATE`. Confirm the ServiceNow state mapping with the platform owner.

---

## 8. Core Requirements

Each requirement gets an ID (for example `REQ-PRE-01`), a priority (MoSCoW) and a link to §9 and §12.

### 8.1 PRESERVE: Must-Have Existing Behaviour
- ServiceNow stays the system of record. No change to ServiceNow configuration. Existing SLAs and assignment groups are honoured.

### 8.2 ADD: New Critical Capabilities (MVP)
- Queue command, fair-share assignment, resolution journey and codes, handover, shift calendar, notifications, SSO/RBAC.

### 8.3 ENHANCE: Lower-Priority Improvements
- Explorer, reports, QA scoring, Copilot, Resolution Assist, automated-fix approvals, password expiry reminders.

**Status:** `TODO`

---

## 9. Functional Specifications

Template per module:
- **User stories:** As a … I want … so that …
- **Screens & states:** empty, loading, error, offline.
- **Business rules:** link to §10.
- **Data read and written:** link to §6.
- **Permissions:** link to §5.5.
- **Behaviour per scenario:** `[AI]` / `[RULES]`.
- **Open questions.**

| § | Module | Source | Status |
|---|---|---|---|
| 9.1 | Queue Command (Home) | v0.2 §5.1, `src/pages/Home.jsx` | `MIGRATE` |
| 9.2 | Fair-Share Assignment & Rebalance | v0.2 §8.1 | `MIGRATE` |
| 9.3 | Ticket Workspace & Resolution | v0.2 §5.1, §8.5 | `MIGRATE` |
| 9.4 | Ticket Explorer | v0.2 §5.2, `src/pages/Explorer.jsx` | `MIGRATE` |
| 9.5 | Reports, QA & Coaching | v0.2 §5.3, `src/pages/Reports.jsx` | `MIGRATE` |
| 9.6 | Team Management: Shifts, Coverage, Leave | v0.2 §5.4, §8.4, `src/pages/ShiftCalendar.jsx`, `Team.jsx` | `MIGRATE` |
| 9.7 | Handover | v0.2 §6 | `MIGRATE` |
| 9.8 | Knowledge Base | `src/pages/KnowledgeBase.jsx`, `src/kb.js` | `TODO` |
| 9.9 | Copilot (AI and rules-only) | `src/pages/Copilot.jsx`, `src/copilot.js`, AI plan | `TODO` |
| 9.10 | Notifications & Alerts | v0.2 §7 | `MIGRATE` |
| 9.11 | Workspaces (multi-team) | `src/workspaces.js` | `TODO` |
| 9.12 | Authentication & Access Control | v0.2 §3, §4 | `MIGRATE` |
| 9.13 | Password Expiry Reminders | v0.2 §8.7 | `DECIDE` (security review) |

---

## 10. Business Rules

- **Purpose:** Every formula and threshold, with current values and who can tune them.
- **Include:** SLA and fair-share weights (3/2/1/1, 12-point cap), queue risk score (0–100, 35/60 bands), time and quality measures (EZE, RES, lost time, FCR), coverage minimums, journey and code rules, Resolution Assist rules, Copilot guardrails.
- **Source:** v0.2 §8, `src/data.js`, `src/analytics.js`, `src/copilot.js` (`GUARDRAILS`).
- **Status:** `MIGRATE`

---

## 11. Non-Functional Requirements

| Area | Include | Status |
|---|---|---|
| Security | SSO, server-side RBAC, audit log, re-authentication for sensitive actions, secrets handling | `MIGRATE` (v0.2 §14) |
| Privacy | PII handling, attendance and heatmap visibility, retention | `DECIDE` |
| Performance | Queue sync ≤ 30 s, page load, Copilot latency budget | `MIGRATE` |
| Availability & DR | Target uptime, RTO/RPO, behaviour when ServiceNow or the gateway is down | `TODO` |
| Scalability | Workspaces, users and tickets per day | `TODO` |
| Accessibility | WCAG 2.1 AA | `MIGRATE` |
| Explainability | An "i" panel on every number, a reason on every assignment, sources on every Copilot answer | `MIGRATE` |
| Observability | Logs, metrics, alerts | `TODO` |
| Browser & device support | Phone to wide screen | `TODO` |

---

## 12. Acceptance Criteria

### 12.1 Acceptance Criteria by Module
- Given / When / Then per requirement ID from §8, grouped by §9 module.
- **Status:** `TODO`

---

## 13. Success Metrics

### 13.1 MVP Launch Criteria
- What must be true to call v1 launched (users onboarded, sync stable, zero P1 defects, and so on).

### 13.2 Usability Target Times
- For example: find an at-risk ticket in under 10 s, complete a handover in under 2 min, resolve and code a ticket in under N min.

### 13.3 Business KPIs (baseline → target)
- **Source:** v0.2 §13.
- **Status:** `MIGRATE`. Baselines are needed.

---

## 14. Technical Stack & Architecture

> [!IMPORTANT]
> This section and §15 are the core of the CSI ID application. Write them so that an architecture or security reviewer can approve without a meeting.

### 14.1 Technical Stack Overview
- **Include:** Table of layer → technology → version → justification → firm-approved? (Y/N/TBC).
- **As built:** React 18.3.1, Vite 5.4, Geist fonts (bundled), no third-party CDNs.
- **To decide:** backend runtime, database, job scheduler, hosting platform, CI/CD.
- **Status:** `DECIDE`

### 14.2 Frontend Architecture
- **Include:** Pages, the store (`src/store.jsx`), components, design system enforcement (`check:design`), theming, responsive layout.
- **Status:** `DRAFT` (can be written from the code)

### 14.3 Backend Architecture
- **Include:** Services (API, sync worker, scheduler, Copilot orchestrator), how the rules engine moves from the browser to the server.
- **Status:** `DECIDE`

### 14.4 Project Structure
- **Include:** Repository layout, current and target.

### 14.5 API Specification
- **Include:** Endpoint list (method, path, role, request, response), versioning, error format.

### 14.6 Integrations
- **Include:** ServiceNow (read sync, write-back fields, rate limits, conflict rules), SSO / identity, SC Lakehouse / analytics store, HR / leave, WFM, secrets manager, automation runner, AI gateway.
- **Source:** v0.2 §10.
- **Status:** `MIGRATE`

### 14.7 Scheduled & Background Jobs
- **Include:** ServiceNow sync (30 s), SLA timer evaluation, risk score recompute, coverage gap check, handover reminders, password expiry reminders, KB re-indexing.

### 14.8 Notification System
- **Include:** Channels (in-app, email, chat?), triggers, de-duplication, quiet hours.

### 14.9 Deployment Architecture
- **`[CSI]`:** environments (dev / UAT / prod), hosting, network zone, DNS/URL, TLS, SSO, CI/CD pipeline, release and rollback.
- **`[NO-CSI]`:** how the prototype is run and shared today (`npm run artifact` builds a single file), the data allowed in it (sample only), and its limits.
- **Status:** `DECIDE`

### 14.10 Security & Compliance Controls
- **Include:** Threat model summary, authentication and authorisation, encryption in transit and at rest, secrets, audit, vulnerability scanning, dependency policy.
- **Status:** `TODO`

---

## 15. AI Architecture & Cost Estimate

### 15.1 Approach & Principles
- Use an approved model, don't build one. Scope fetches and the model writes. Send the least data. Cite it or don't say it. A person acts. Off is a supported state.
- **Source:** `ai-dev-plan/index.html`.
- **Status:** `MIGRATE`

### 15.2 Architecture & Data Flow
- Question → retrieval → redaction → gateway → model → validation → cited answer. Include what never leaves Scope.
- **Status:** `MIGRATE`

### 15.3 Model Options
- Candidate models exposed by the firm's gateway (the prototype lists placeholders), and which model is used for which task.
- **Status:** `DECIDE`

### 15.4 Usage Assumptions
- Users per workspace, questions per user per day, working days per month, average input tokens (prompt + retrieved evidence) and output tokens per call, calls per question (tool loop), insight jobs per day.
- **Status:** `TODO`

### 15.5 Cost Model
- **Formula:** monthly cost = Σ over tasks (calls × (input tokens × input rate + output tokens × output rate)) + embeddings/indexing + gateway fees.
- **Include:** Low / expected / high scenarios, cost per workspace and per user, budget caps and token limits, the effect of caching. Rates come from the firm's gateway price list, not public list prices.
- **Status:** `TODO`

### 15.6 Infrastructure & Run Cost (non-AI)
- Hosting, database, storage, monitoring, support effort. Needed for the CSI application whether or not AI is approved.
- **Status:** `TODO`

### 15.7 Rules-Only Fallback (`[RULES]`)
- What each feature does without a model; this is already built (Explorer, template search, Resolution Assist rules).
- **Source:** AI plan "The fallback" section.
- **Status:** `MIGRATE`

### 15.8 Evaluation, Governance & Monitoring
- Evaluation set, thresholds (correctness, citation rate, refusal rate, latency, cost), model risk sign-off, PII checks in logs, drift and feedback monitoring.
- **Source:** AI plan, rollout phases.
- **Status:** `MIGRATE`

---

## 16. CSI ID Application Pack

- **Purpose:** Map every question on the CSI ID application to the PRD section that answers it, so the application can be filled straight from this document.
- **Include:** Table of application field → answer summary → PRD section → owner → status. Get the actual field list from the application registry team.
- **Typical fields to confirm:**
  - Application name and description
  - Business owner and technical owner
  - Users and user count
  - Data classification
  - Hosting and environments
  - Integrations
  - Authentication
  - Third-party and AI services
  - DR tier
  - Support model
  - Cost
- **Status:** `TODO`. The field list is needed first.

---

## 17. Implementation Plan

### 17.1 Data Integrity & Migration
- Seed data, the historical ticket backfill, code library migration, rota import.

### 17.2 Implementation Phases
- Align with the AI plan phases (rules first, AI behind gates).

### 17.3 Timeline
- Gantt or table with dependencies on CSI approval and AI approval.

### 17.4 Sprint Breakdown
- 17.4.1 Sprint 1: Foundation (backend, auth, ServiceNow read sync)
- 17.4.2 Sprint 2: Queue, assignment & resolution
- 17.4.3 Sprint 3: Handover, shifts & notifications
- 17.4.4 Sprint 4: Reports, polish & UAT
- _(Adjust once the team size is known.)_

### 17.5 Development Milestones & Gates

### 17.6 Risk Register & Mitigation
- Include: CSI refused or delayed, LLM not approved, ServiceNow API access, data privacy, team adoption, fair-share perceived as unfair.
- **Source:** v0.2 §12.

### 17.7 Go-Live Checklist

**Status for §17:** `TODO`

---

## 18. UAT & Verification Plan

### 18.1 Data Setup
### 18.2 Functional Verification
### 18.3 Access Control Verification
### 18.4 Performance & Resilience Checks
### 18.5 AI Evaluation (`[AI]` only)
### 18.6 Sign-off

**Status:** `TODO`

---

## 19. Open Questions & Decision Log

| # | Question | Owner | Due | Decision | Date |
|---|---|---|---|---|---|
| 1 | Is the CSI ID approved? Timeline? | | | | |
| 2 | Which LLM and gateway, if any? | | | | |
| 3 | Backend stack and hosting platform | | | | |
| 4 | SC Lakehouse as the history store? | | | | |
| … | Carry over v0.2 §12 items 1–10 | | | | |

---

## Appendix

- **A. Glossary:** SOEID, EZE, RES, FCR, MTTR, SLA, CSI ID, PII, RAG, and others.
- **B. References:** DESIGN.md, the AI plan, the prototype, ServiceNow docs.
- **C. Change History.**

---

## Related
- [[Index|SC Lakehouse Index]]
- [[ServiceOps Console Product Design]]

#prd #csi-id #scope
