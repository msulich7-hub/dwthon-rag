# Master Plan — Module 5: Mercato UI, Governance & Industrialization

**Steps 81–100** · Final module · Closes the 100-step program

| Field | Value |
|-------|-------|
| **Module** | 5 — Mercato UI, Governance & Industrialization |
| **Scope** | Hindsight dashboard, ACL, CI/CD, OR-Tools bridge monitoring, planner runbooks, IFS write-back (Phase 2 optional) |
| **Depends on** | Modules 1–4 (data model, CP-SAT solver, capacity snapshots, actuals ingestion) |
| **Mercato module** | `production_planning` (`apps/mercato/src/modules/production_planning/`) |
| **Solver service** | `services/ortools-scheduler` (FastAPI + CP-SAT) |

**North star (May 2026):** **Control tower exceptions**, **collaborative locks**, **planner copilot with guardrails** (anti-fantasy, no oracle leakage — not fantasy), and **write-back governance** for ERP publish — competitive with o9 control tower, Kinaxis Maestro Agent Studio guardrails, and governed SAP/IFS schedule push.

**Parity tier key (May 2026 market)**

| Tier | Definition | Vendor anchor |
|------|------------|---------------|
| **P0** | Finite Gantt read model, conflict surfacing, ops runbooks | Opcenter · PlanetTogether · Asprova |
| **P1** | Control tower KPIs, plan compare UI, ACL/scoped collaboration | o9 control tower · Oracle ASCP compare · Kinaxis concurrent planning |
| **P2** | Planner copilot with guardrails, collaborative locks, governed write-back | Kinaxis Maestro Agent Studio · o9 APEX · SAP RTI publish |

---

## Theme map (steps 81–100)

| Steps | Theme |
|-------|-------|
| 81–88 | Hindsight dashboard (Overview → Gantt 150 WC → genesis tree → heatmap 3D → delta → PDF) |
| 89–90 | ACL & governance |
| 91–92 | PR pipeline & deployment industrialization |
| 93–94 | OR-Tools bridge & optimize-job monitoring |
| 95–97 | Planner runbooks & operational readiness |
| 98–99 | IFS write-back (Phase 2, optional) |
| 100 | Go-live & handover |

---

## Step 81 — Hindsight dashboard shell & navigation

| | |
|---|---|
| **Deliverable** | Mercato backend route `/backend/production_planning/hindsight` with tabbed layout (Overview · Gantt · Genesis · Heatmap · Delta · Export), sidebar nav injection, i18n keys (`en` + `pl`), and page meta gated by ACL. |
| **Owner** | Frontend (Mercato module) |
| **Acceptance criteria** | Authenticated user with `production_planning.view` sees Hindsight in sidebar; unauthorized users receive 403 on route and API; tabs render placeholder shells without console errors; DS Guardian passes on all new UI files; deep-link `?tab=gantt&horizon=7d` restores tab state. |
| **Market parity** | **o9:** Control tower navigation shell — tabbed planning cockpit entry. **Kinaxis:** Concurrent planning workspace layout (overview + Gantt + compare). **Oracle ASCP:** Compare-plans UI hub routing. **SAP IBP:** HPA planning area dashboard shell. **Opcenter:** Finite Gantt module navigation parity. |

---

## Step 82 — Control tower: Overview + exception queue

| | |
|---|---|
| **Deliverable** | Overview tab (**control tower**): KPI cards (late orders, avg tardiness, WC utilization %, open CP-SAT jobs, bridge latency p95) + **exception queue** (severity: critical/high/medium) from M2-38 / M4-76 with assignee, age, drill link. Horizon selector (24h / 7d / 28d), site filter, `GET /api/production_planning/hindsight/overview` and `GET .../exceptions?status=open`. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | Overview loads in ≤2 s for tenant with ≤150 WCs and ≤500 open operations; KPI values match SQL spot-check on staging; empty-state and error-state components follow design system; refresh button re-fetches without full page reload; data respects tenant + site ACL scope. |
| **Market parity** | **o9 control tower:** Exception + KPI cards (late orders, utilization, bridge latency) — control tower Overview parity. **Kinaxis:** Concurrent planning live job/status tiles. **o9 Digital Brain EKG:** Horizon-scoped health snapshot. **Oracle ASCP:** Compare-plans summary KPI strip. **Module 5 north star:** Control tower exceptions surface count + drill link (anti-fantasy rejects from M4). |

---

## Step 83 — Gantt view: 150 work centers

| | |
|---|---|
| **Deliverable** | Gantt tab: virtualized timeline rendering up to **150 work centers** (WC rows), planned operation bars from `plannedStartAt` / `plannedEndAt`, WC grouping by department, zoom (hour / shift / day), and sticky WC label column. |
| **Owner** | Frontend (Mercato module) |
| **Acceptance criteria** | 150 WC × 7-day horizon scrolls at ≥30 fps on reference laptop (Chrome); initial paint ≤3 s; operation tooltip shows order id, SKU, duration, lateness; legend distinguishes planned / fixed / late; no DOM node count explosion (virtualization verified in DevTools). |
| **Market parity** | **Opcenter / PlanetTogether / Asprova:** Finite Gantt at 150 work centers — shop-floor schedule read model. **Kinaxis:** Concurrent planning Gantt density at plant scale. **SAP IBP:** PP/DS finite schedule visualization in HPA. **Oracle ASCP:** Compare-plans Gantt viewport for scenario A/B. **o9:** Control tower Gantt lane for exception context. |

---

## Step 84 — Gantt conflicts + planner copilot (propose-only, HITL)

| | |
|---|---|
| **Deliverable** | Gantt UX: horizontal scroll sync, WC row expand/collapse, overlap/conflict highlighting, click-through to order detail, site filter in URL. **Planner copilot (P1):** panel suggests ranked actions (re-sequence, split pool MO, defer order) from current schedule — **propose-only**; apply requires explicit confirm + audit log (`copilot_suggestions` table). No auto-write (Maestro Agent Studio guardrails). |
| **Owner** | Frontend (Mercato module) |
| **Acceptance criteria** | Conflicts detected server-side and flagged in Gantt within one refresh cycle; clicking an operation opens `/backend/production_planning/orders/[id]` in same tab; keyboard navigation (arrow keys) moves focus across visible bars; interactions respect `production_planning.manage` vs view-only (read-only drag disabled for viewers). |
| **Market parity** | **o9 control tower:** Conflict/exception highlighting on finite schedule. **Opcenter / PlanetTogether:** WC double-book surfacing on finite Gantt. **Kinaxis:** Concurrent planning overlap detection UX. **SAP IBP:** PP/DS infeasibility/conflict flags on timeline. **Module 5 north star:** Collaborative locks — view-only vs manage scopes gate drag/re-optimize (Step 90). |

---

## Step 85 — Genesis tree drill-down

| | |
|---|---|
| **Deliverable** | Genesis tab: interactive tree from sales order → production order → operations → work centers → capacity snapshot nodes; drill-down panel with timestamps, solver run id, and objective weights used; API `GET /api/production_planning/hindsight/genesis/[rootType]/[rootId]`. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | Tree expands to ≥5 levels without layout break; each node shows provenance (manual / CP-SAT / imported actual); clicking a leaf syncs selection to Gantt tab (cross-tab highlight); tree build time ≤1 s for order with ≤50 operations; missing parent nodes show explicit “orphan” badge, not silent failure. |
| **Market parity** | **o9 Digital Brain EKG:** Genesis / provenance tree drill-down. **Kinaxis:** Scenario versioning lineage — solver run id + objective weights on nodes. **Oracle ASCP:** Compare-plans genesis trace (sales → MO → ops). **SAP IBP:** HPA pegging / structure tree. **Kinaxis Maestro:** Guardrails — provenance labels prevent “fantasy” unattributed plans. |

---

## Step 86 — Heatmap 3D tolerance (WC × time × deviation)

| | |
|---|---|
| **Deliverable** | Heatmap tab: 3-axis visualization — X = time buckets, Y = work center (top 150 by load), Z/color = tolerance deviation (planned load vs capacity ceiling %); toggles for absolute vs normalized scale; WebGL or canvas fallback. |
| **Owner** | Frontend + Backend (Mercato module) |
| **Acceptance criteria** | Heatmap renders 150 WC × 168 hourly buckets; color scale documented (green ≤85%, amber 85–100%, red >100%); hover cell shows WC id, bucket, planned minutes, capacity minutes, deviation %; export raw matrix as CSV; falls back to 2D heatmap when WebGL unavailable. |
| **Market parity** | **o9 Digital Brain EKG:** WC × time × load deviation heatmap (control tower capacity view). **Kinaxis:** Concurrent planning utilization tolerance bands. **SAP IBP:** HPA harmonized capacity heatmap. **Opcenter / PlanetTogether:** Finite Gantt overload visualization. **Oracle ASCP:** Compare-plans capacity stress matrix export. |

---

## Step 87 — Delta: actual vs optimal

| | |
|---|---|
| **Deliverable** | Delta tab: side-by-side comparison of **actual** shop-floor timestamps (from Module 4 actuals) vs **optimal** CP-SAT plan; per-order and per-WC variance charts; summary table (Δ start, Δ end, Δ tardiness, replan count); API `GET /api/production_planning/hindsight/delta`. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | Delta metrics computed for orders with both actual and planned data; orders missing actuals excluded with count shown; aggregate tardiness delta matches manual calculation ±0.1%; filter by date range and WC; `production_planning.manage` can flag order for re-optimize from Delta row action. |
| **Market parity** | **Oracle ASCP:** Compare-plans delta tab — actual vs optimal side-by-side (Module 4 API consumer). **Kinaxis:** Scenario versioning plan compare UI. **o9:** Scenario management variance charts for control tower. **SAP IBP:** PP/DS plan vs actuals compare. **Chaos premium:** Link to M4 value-of-concurrency summary where available. |

---

## Step 88 — Hindsight PDF export

| | |
|---|---|
| **Deliverable** | Export tab + header action: generate PDF report bundling Overview KPIs, Gantt snapshot (current viewport or full horizon), heatmap thumbnail, top-10 delta variances, genesis summary for selected root; `POST /api/production_planning/hindsight/export/pdf` returns signed download URL. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | PDF generates in ≤30 s for standard report; file includes generation timestamp, tenant, horizon, and user id; PDF renders correctly in Acrobat and browser preview; export requires `production_planning.view`; failed generation returns structured error and does not block UI; audit log entry created per export. |
| **Market parity** | **Oracle ASCP:** Compare-plans export pack for steering reviews. **Kinaxis:** Scenario versioning PDF snapshot for concurrent planning sign-off. **o9 control tower:** Executive exception + KPI export. **SAP IBP:** HPA planning review report. **Write-back governance:** Export audit trail prerequisite for governed publish (Steps 98–99). |

---

## Step 89 — ACL feature matrix & role templates

| | |
|---|---|
| **Deliverable** | Extended `acl.ts` features: `production_planning.hindsight`, `production_planning.optimize`, `production_planning.export`, `production_planning.ifs_writeback` (disabled by default); preset role templates (Viewer, Planner, Hindsight Analyst, Admin) documented in module setup; enforcement on all hindsight + optimize routes. |
| **Owner** | Backend (Mercato module) + Product |
| **Acceptance criteria** | Each new feature id registered in setup and visible in Roles UI; route guards return 403 without leaking data shape; role templates apply cleanly on fresh tenant bootstrap; unit tests cover matrix for all hindsight API endpoints; no regression to existing `view` / `manage` / `ai` features. |
| **Market parity** | **Module 5 north star:** Write-back governance — `production_planning.ifs_writeback` disabled by default; role-gated publish. **Kinaxis Maestro:** Agent Studio role boundaries for copilot actions. **o9 control tower:** Feature matrix for planner vs analyst vs admin. **SAP IBP:** HPA role templates for planning area access. **Oracle ASCP:** Compare-plans / optimize ACL separation. |

---

## Step 90 — ACL work-center & site scoping

| | |
|---|---|
| **Deliverable** | Row-level scope: users may be restricted to a subset of work centers and/or manufacturing sites; scope stored on role assignment; all hindsight and schedule APIs filter by allowed WC list; admin bypass flag. |
| **Owner** | Backend (Mercato module) |
| **Acceptance criteria** | Scoped planner sees only assigned WCs in Gantt, heatmap, and delta; optimize payload excludes out-of-scope operations; 150-WC tenant with 20-WC scope loads proportionally faster; cross-scope order (multi-WC) shows partial view with “restricted operations hidden” notice; scope changes take effect without redeploy. |
| **Market parity** | **Module 5 north star:** **Collaborative locks** — WC/site scope prevents cross-planner edit conflicts on shared orders. **Kinaxis:** Concurrent planning multi-planner WC partitions. **o9 control tower:** Site/WC scoped exception ownership. **Opcenter / PlanetTogether:** Department-scoped finite Gantt views. **SAP IBP:** HPA harmonized area site scoping. |

---

## Step 91 — PR pipeline & module CI gates

| | |
|---|---|
| **Deliverable** | CI workflow for `production_planning` + `ortools-scheduler`: lint, typecheck, unit tests (`cpsat-chunking`, `ortools-bridge`, `apply-cpsat-schedule`), Python pytest, DS Guardian on frontend paths, migration dry-run; required checks on PR to `master`. |
| **Owner** | DevOps / Platform |
| **Acceptance criteria** | PR touching module paths triggers pipeline automatically; all checks pass on green baseline; failing test blocks merge; CI runtime ≤15 min; README badge or internal doc links to workflow; no edits under forbidden core packages (`packages/core`, `packages/ui`) in module PRs. |
| **Market parity** | **Kinaxis / o9 / SAP:** Enterprise APS CI gate parity — solver + chunking regression on every PR. **Oracle ASCP:** Compare-plans smoke in pipeline. **Kinaxis Maestro:** Guardrails — anti-fantasy + scale smoke gates before merge. **o9 APEX:** Continuous planning deploy safety net. **Opcenter:** Finite Gantt UI regression in DS Guardian path. |

---

## Step 92 — Deployment manifests & environment promotion

| | |
|---|---|
| **Deliverable** | Production-ready deploy artifacts: Docker Compose stack (Mercato app + `ortools-scheduler` + Postgres + Redis/queue), env template documenting `ORTOOLS_BRIDGE_URL`, `ORTOOLS_BRIDGE_API_KEY`, `ORTOOLS_BRIDGE_TIMEOUT_MS`; staging → prod promotion runbook; health-check wiring on both services. |
| **Owner** | DevOps / SRE |
| **Acceptance criteria** | `docker compose up` on clean host yields healthy Mercato + bridge (`GET /health` 200); staging deploy completes with smoke test (`POST /optimize` on sample orders); prod manifest uses secrets manager, not plaintext keys; rollback procedure documented and tested once on staging; zero-downtime goal documented with accepted maintenance window. |
| **Market parity** | **SAP IBP:** RTI + PP/DS bridge deployment topology (Mercato + ortools-scheduler). **Kinaxis:** Concurrent planning solver service scale-out manifest. **o9:** Control tower + APEX service health promotion path. **Oracle ASCP:** Compare-plans / CTP engine staging → prod gate. **Write-back governance:** ERP adapter stub isolated; no publish in default deploy. |

---

## Step 93 — OR-Tools bridge monitoring & alerting

| | |
|---|---|
| **Deliverable** | Observability for `ortools-scheduler`: Prometheus metrics (request count, latency histogram, CP-SAT status, infeasible rate, queue depth), structured JSON logs with `jobId` / `tenantId` correlation, Grafana dashboard JSON, alerts on error rate >5%, p95 latency > timeout, `/health` failures. |
| **Owner** | SRE + Backend (Python service) |
| **Acceptance criteria** | Metrics endpoint exposed and scraped in staging; dashboard shows last 24 h of solves; synthetic probe hits `/health` every 60 s; alert fires in test within 5 min of injected failure; logs searchable by Mercato optimize job id; runbook linked from alert annotation (see Step 96). |
| **Market parity** | **o9 control tower:** Solver SLO monitoring — p95, infeasible rate, bridge health alerts. **Kinaxis:** GPU/cuOpt / concurrent scenario job telemetry (where applicable). **SAP IBP:** RTI solve latency + status metrics. **Oracle ASCP:** CTP engine observability. **Kinaxis Maestro:** Guardrails alert on repeated INFEASIBLE / timeout patterns. |

---

## Step 94 — Mercato optimize-job monitoring

| | |
|---|---|
| **Deliverable** | Mercato-side telemetry: optimize async job lifecycle metrics (queued / running / succeeded / failed), bridge timeout counters, chunk count per solve, notification on repeated failures; admin widget or `/backend/production_planning/ops` status page. |
| **Owner** | Backend (Mercato module) + SRE |
| **Acceptance criteria** | Failed optimize jobs visible in ops page within 30 s; tenant-level failure rate chart available; bridge timeout increments Prometheus counter; ≥20-order async path (202 + poll) monitored end-to-end; stale jobs (>2× timeout) flagged as stuck with manual retry action for admins. |
| **Market parity** | **o9 control tower:** Optimize job exception queue — failed/stuck job surfacing (Module 5 north star exceptions). **Kinaxis:** Concurrent planning async job monitor + retry. **SAP IBP:** RTI job lifecycle dashboard. **Oracle ASCP:** Compare-plans / CTP async poll monitoring. **Kinaxis Maestro:** Guardrails — admin retry requires ACL + audit. |

---

## Step 95 — Runbook: planner daily operations

| | |
|---|---|
| **Deliverable** | Operator runbook (`docs/runbooks/planner-daily-operations.md`): morning checklist (capacity refresh, review Overview KPIs, scan Gantt conflicts), triggering optimize (`POST /optimize` sync vs async), interpreting lateness chips on sales order stage bar, when to escalate. |
| **Owner** | Product + Operations (Manufacturing SME) |
| **Acceptance criteria** | Runbook reviewed and signed by ≥1 planner SME; covers happy path and “do not optimize” conditions (frozen horizon, missing routings); links to Mercato UI routes and API examples; published in repo and linked from Hindsight Overview help icon; onboarding walkthrough completed with pilot user in ≤45 min. |
| **Market parity** | **Opcenter / PlanetTogether / Asprova:** Planner daily finite Gantt + optimize workflow. **Kinaxis:** Concurrent planning + sub-minute what-if morning checklist. **o9 control tower:** Daily exception review ritual documented. **SAP IBP:** PP/DS planner operations in HPA. **Module 5 north star:** Planner copilot help links — suggest actions within guardrails, not autonomous fantasy replans. |

---

## Step 96 — Runbook: optimize & bridge failure recovery

| | |
|---|---|
| **Deliverable** | Incident runbook (`docs/runbooks/ortools-bridge-incident.md`): bridge down, timeout, infeasible model, partial chunk failure, queue backlog; steps for restart, fallback to manual planning, log extraction, Mercato-side job cancellation. |
| **Owner** | SRE + Backend |
| **Acceptance criteria** | Table-top exercise on staging completes recovery in ≤30 min; each failure mode has detection signal, impact statement, and numbered remediation; runbook references Step 93 alerts; post-incident template included; Mercato continues serving read-only Hindsight when bridge is down. |
| **Market parity** | **o9 control tower:** Incident playbooks for solver/bridge degradation. **Kinaxis Maestro:** Guardrails on partial publish — abort apply on chunk failure (Module 3 parity). **SAP IBP:** RTI bridge failure fallback to read-only plan. **Oracle ASCP:** CTP degradation — compare without re-solve. **Opcenter:** Manual planning fallback when finite engine unavailable. |

---

## Step 97 — Runbook: hindsight dashboard interpretation

| | |
|---|---|
| **Deliverable** | Analyst guide (`docs/runbooks/hindsight-interpretation.md`): how to read genesis tree, heatmap tolerance bands, delta variances; worked examples with screenshots; FAQ (why optimal ≠ actual, changeover objective effects, 150-WC display limits). |
| **Owner** | Product + Manufacturing SME |
| **Acceptance criteria** | Guide enables non-developer to explain a delta report to production manager; glossary defines genesis, tolerance, fixed operations; linked from PDF export footer and in-app help; validated by Hindsight Analyst role holder without engineer assistance. |
| **Market parity** | **Oracle ASCP:** Compare-plans interpretation guide for planners. **Kinaxis:** Scenario versioning / chaos premium explainer for business users. **o9 Digital Brain EKG:** Analyst guide for tolerance + delta reading. **Kinaxis Maestro:** Copilot guardrails FAQ — why optimal ≠ actual, anti-fantasy rules (not fantasy AI claims). **SAP IBP:** HPA KPI glossary for PP/DS outputs. |

---

## Step 98 — IFS write-back Phase 2: design & feature flag (optional)

| | |
|---|---|
| **Deliverable** | SPEC + stub adapter for IFS Applications schedule write-back: mapping planned operations → IFS shop order operations; idempotency keys; feature flag `production_planning.ifs_writeback` default **off**; dry-run mode returning diff preview without ERP mutation. |
| **Owner** | Integration Architect + Backend |
| **Acceptance criteria** | SPEC approved by ERP owner; flag off produces zero IFS traffic; dry-run endpoint returns JSON diff for sample order; no Phase 2 code runs in production until Step 99 pilot sign-off; ACL feature from Step 89 required to enable; rollback = disable flag only. |
| **Market parity** | **Module 5 north star:** **Write-back governance** — idempotency keys, dry-run diff, flag-off default, ACL-gated enable. **SAP IBP:** RTI governed publish to ERP (preview before commit). **Kinaxis:** Concurrent planning approved-scenario publish workflow. **Oracle ASCP:** Compare-plans approve-then-release pattern. **o9:** Control tower governed action with audit trail before ERP push. |

---

## Step 99 — IFS write-back pilot sync (optional)

| | |
|---|---|
| **Deliverable** | Pilot implementation: one-way push of approved CP-SAT schedule to IFS for ≤10 production orders in pilot site; reconciliation job detecting IFS rejections; audit trail in Mercato (`ifs_writeback_log` entity or equivalent). |
| **Owner** | Integration + Backend |
| **Acceptance criteria** | Pilot runs in staging against IFS sandbox with ≥95% operation match rate; production pilot limited to flagged site and requires `production_planning.ifs_writeback`; failed writes surface in ops page and do not block Mercato schedule; ERP owner signs pilot completion memo; **explicitly out of scope** for go-live if flag remains off. |
| **Market parity** | **Write-back governance:** Pilot ≤10 orders, reconciliation job, `ifs_writeback_log` audit — no silent ERP mutation. **SAP IBP / RTI:** Incremental schedule release with rejection handling. **Kinaxis:** Approved scenario publish to execution system. **Oracle ASCP:** CTP release with match-rate gate. **o9 control tower:** Exception surfacing on ERP reject — ops page parity. |

---

## Step 100 — Go-live checklist & industrialization handover

| | |
|---|---|
| **Deliverable** | Go-live package: UAT sign-off checklist (steps 81–97), production smoke script, rollback plan, on-call roster, known limitations doc (150 WC Gantt cap, async threshold ≥20 orders, IFS Phase 2 status), training completion log, and formal handover from project team to BAU operations. |
| **Owner** | Project Manager + Product Owner |
| **Acceptance criteria** | All P0 acceptance criteria from steps 81–94 marked pass in UAT tracker; staging prod-parity test passed within 7 days of cutover; rollback tested once; on-call runbooks (95–97) distributed; IFS write-back status documented as enabled/disabled/deferred; steering committee sign-off recorded; Module 5 closes program step 100/100. |
| **Market parity** | **May 2026 market parity sign-off:** o9 control tower + Kinaxis concurrent planning + SAP IBP HPA + Oracle ASCP compare + Opcenter finite Gantt baseline documented in known-limitations doc. **North star checklist:** Control tower exceptions live; collaborative locks enforced; planner copilot bounded by Maestro-class guardrails (anti-fantasy); write-back governance status explicit at go-live. **Kinaxis / o9 / SAP / Oracle / Opcenter:** Parity tier P0/P1/P2 gaps logged with severity for post-100 roadmap. |

---

## Cross-step dependencies

```mermaid
flowchart LR
  subgraph hindsight [Hindsight UI 81-88]
    S81 --> S82 --> S83 --> S84
    S82 --> S85
    S83 --> S86
    S85 --> S87 --> S88
  end
  subgraph gov [Governance 89-90]
    S89 --> S90
  end
  subgraph industrial [Industrialization 91-94]
    S91 --> S92 --> S93 --> S94
  end
  subgraph ops [Operations 95-100]
    S93 --> S96
    S88 --> S97
    S89 --> S98 --> S99
    hindsight --> S100
    gov --> S100
    industrial --> S100
    ops --> S100
  end
  S90 --> S82
  S90 --> S83
```

---

## Owner roster (Module 5)

| Owner | Steps |
|-------|-------|
| Frontend (Mercato module) | 81, 83, 84, 86 |
| Full-stack (Mercato module) | 82, 85, 87, 88 |
| Backend (Mercato module) | 89, 90, 94 |
| DevOps / Platform | 91 |
| DevOps / SRE | 92, 93, 96 |
| Product + Manufacturing SME | 95, 97 |
| Integration Architect + Backend | 98, 99 |
| Project Manager + Product Owner | 100 |

---

## Out of scope (Module 5)

- Embedding OR-Tools in Node (solver stays in `services/ortools-scheduler`)
- Modifications to Open Mercato core packages
- Mandatory IFS write-back at go-live (Phase 2 optional per steps 98–99)
- Gantt editing / drag-drop replan (read-only hindsight unless `production_planning.manage` triggers re-optimize)
