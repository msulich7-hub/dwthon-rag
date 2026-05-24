# Master Plan — Module 5: Mercato UI, Governance & Industrialization

**Steps 81–100** · Final module · Closes the 100-step program

| Field | Value |
|-------|-------|
| **Module** | 5 — Mercato UI, Governance & Industrialization |
| **Scope** | Hindsight dashboard, ACL, CI/CD, OR-Tools bridge monitoring, planner runbooks, IFS write-back (Phase 2 optional) |
| **Depends on** | Modules 1–4 (data model, CP-SAT solver, capacity snapshots, actuals ingestion) |
| **Mercato module** | `production_planning` (`apps/mercato/src/modules/production_planning/`) |
| **Solver service** | `services/ortools-scheduler` (FastAPI + CP-SAT) |

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

---

## Step 82 — Hindsight Overview panel

| | |
|---|---|
| **Deliverable** | Overview tab: KPI cards (late orders, avg tardiness, WC utilization %, open CP-SAT jobs, bridge latency p95), horizon selector (24h / 7d / 28d), site filter, and `GET /api/production_planning/hindsight/overview` aggregating capacity snapshots + optimize job stats. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | Overview loads in ≤2 s for tenant with ≤150 WCs and ≤500 open operations; KPI values match SQL spot-check on staging; empty-state and error-state components follow design system; refresh button re-fetches without full page reload; data respects tenant + site ACL scope. |

---

## Step 83 — Gantt view: 150 work centers

| | |
|---|---|
| **Deliverable** | Gantt tab: virtualized timeline rendering up to **150 work centers** (WC rows), planned operation bars from `plannedStartAt` / `plannedEndAt`, WC grouping by department, zoom (hour / shift / day), and sticky WC label column. |
| **Owner** | Frontend (Mercato module) |
| **Acceptance criteria** | 150 WC × 7-day horizon scrolls at ≥30 fps on reference laptop (Chrome); initial paint ≤3 s; operation tooltip shows order id, SKU, duration, lateness; legend distinguishes planned / fixed / late; no DOM node count explosion (virtualization verified in DevTools). |

---

## Step 84 — Gantt interactions & conflict surfacing

| | |
|---|---|
| **Deliverable** | Gantt UX: horizontal scroll sync, WC row expand/collapse, overlap/conflict highlighting (same WC double-booked), click-through to production order detail, and optional “highlight my site” filter persisted in URL. |
| **Owner** | Frontend (Mercato module) |
| **Acceptance criteria** | Conflicts detected server-side and flagged in Gantt within one refresh cycle; clicking an operation opens `/backend/production_planning/orders/[id]` in same tab; keyboard navigation (arrow keys) moves focus across visible bars; interactions respect `production_planning.manage` vs view-only (read-only drag disabled for viewers). |

---

## Step 85 — Genesis tree drill-down

| | |
|---|---|
| **Deliverable** | Genesis tab: interactive tree from sales order → production order → operations → work centers → capacity snapshot nodes; drill-down panel with timestamps, solver run id, and objective weights used; API `GET /api/production_planning/hindsight/genesis/[rootType]/[rootId]`. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | Tree expands to ≥5 levels without layout break; each node shows provenance (manual / CP-SAT / imported actual); clicking a leaf syncs selection to Gantt tab (cross-tab highlight); tree build time ≤1 s for order with ≤50 operations; missing parent nodes show explicit “orphan” badge, not silent failure. |

---

## Step 86 — Heatmap 3D tolerance (WC × time × deviation)

| | |
|---|---|
| **Deliverable** | Heatmap tab: 3-axis visualization — X = time buckets, Y = work center (top 150 by load), Z/color = tolerance deviation (planned load vs capacity ceiling %); toggles for absolute vs normalized scale; WebGL or canvas fallback. |
| **Owner** | Frontend + Backend (Mercato module) |
| **Acceptance criteria** | Heatmap renders 150 WC × 168 hourly buckets; color scale documented (green ≤85%, amber 85–100%, red >100%); hover cell shows WC id, bucket, planned minutes, capacity minutes, deviation %; export raw matrix as CSV; falls back to 2D heatmap when WebGL unavailable. |

---

## Step 87 — Delta: actual vs optimal

| | |
|---|---|
| **Deliverable** | Delta tab: side-by-side comparison of **actual** shop-floor timestamps (from Module 4 actuals) vs **optimal** CP-SAT plan; per-order and per-WC variance charts; summary table (Δ start, Δ end, Δ tardiness, replan count); API `GET /api/production_planning/hindsight/delta`. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | Delta metrics computed for orders with both actual and planned data; orders missing actuals excluded with count shown; aggregate tardiness delta matches manual calculation ±0.1%; filter by date range and WC; `production_planning.manage` can flag order for re-optimize from Delta row action. |

---

## Step 88 — Hindsight PDF export

| | |
|---|---|
| **Deliverable** | Export tab + header action: generate PDF report bundling Overview KPIs, Gantt snapshot (current viewport or full horizon), heatmap thumbnail, top-10 delta variances, genesis summary for selected root; `POST /api/production_planning/hindsight/export/pdf` returns signed download URL. |
| **Owner** | Full-stack (Mercato module) |
| **Acceptance criteria** | PDF generates in ≤30 s for standard report; file includes generation timestamp, tenant, horizon, and user id; PDF renders correctly in Acrobat and browser preview; export requires `production_planning.view`; failed generation returns structured error and does not block UI; audit log entry created per export. |

---

## Step 89 — ACL feature matrix & role templates

| | |
|---|---|
| **Deliverable** | Extended `acl.ts` features: `production_planning.hindsight`, `production_planning.optimize`, `production_planning.export`, `production_planning.ifs_writeback` (disabled by default); preset role templates (Viewer, Planner, Hindsight Analyst, Admin) documented in module setup; enforcement on all hindsight + optimize routes. |
| **Owner** | Backend (Mercato module) + Product |
| **Acceptance criteria** | Each new feature id registered in setup and visible in Roles UI; route guards return 403 without leaking data shape; role templates apply cleanly on fresh tenant bootstrap; unit tests cover matrix for all hindsight API endpoints; no regression to existing `view` / `manage` / `ai` features. |

---

## Step 90 — ACL work-center & site scoping

| | |
|---|---|
| **Deliverable** | Row-level scope: users may be restricted to a subset of work centers and/or manufacturing sites; scope stored on role assignment; all hindsight and schedule APIs filter by allowed WC list; admin bypass flag. |
| **Owner** | Backend (Mercato module) |
| **Acceptance criteria** | Scoped planner sees only assigned WCs in Gantt, heatmap, and delta; optimize payload excludes out-of-scope operations; 150-WC tenant with 20-WC scope loads proportionally faster; cross-scope order (multi-WC) shows partial view with “restricted operations hidden” notice; scope changes take effect without redeploy. |

---

## Step 91 — PR pipeline & module CI gates

| | |
|---|---|
| **Deliverable** | CI workflow for `production_planning` + `ortools-scheduler`: lint, typecheck, unit tests (`cpsat-chunking`, `ortools-bridge`, `apply-cpsat-schedule`), Python pytest, DS Guardian on frontend paths, migration dry-run; required checks on PR to `master`. |
| **Owner** | DevOps / Platform |
| **Acceptance criteria** | PR touching module paths triggers pipeline automatically; all checks pass on green baseline; failing test blocks merge; CI runtime ≤15 min; README badge or internal doc links to workflow; no edits under forbidden core packages (`packages/core`, `packages/ui`) in module PRs. |

---

## Step 92 — Deployment manifests & environment promotion

| | |
|---|---|
| **Deliverable** | Production-ready deploy artifacts: Docker Compose stack (Mercato app + `ortools-scheduler` + Postgres + Redis/queue), env template documenting `ORTOOLS_BRIDGE_URL`, `ORTOOLS_BRIDGE_API_KEY`, `ORTOOLS_BRIDGE_TIMEOUT_MS`; staging → prod promotion runbook; health-check wiring on both services. |
| **Owner** | DevOps / SRE |
| **Acceptance criteria** | `docker compose up` on clean host yields healthy Mercato + bridge (`GET /health` 200); staging deploy completes with smoke test (`POST /optimize` on sample orders); prod manifest uses secrets manager, not plaintext keys; rollback procedure documented and tested once on staging; zero-downtime goal documented with accepted maintenance window. |

---

## Step 93 — OR-Tools bridge monitoring & alerting

| | |
|---|---|
| **Deliverable** | Observability for `ortools-scheduler`: Prometheus metrics (request count, latency histogram, CP-SAT status, infeasible rate, queue depth), structured JSON logs with `jobId` / `tenantId` correlation, Grafana dashboard JSON, alerts on error rate >5%, p95 latency > timeout, `/health` failures. |
| **Owner** | SRE + Backend (Python service) |
| **Acceptance criteria** | Metrics endpoint exposed and scraped in staging; dashboard shows last 24 h of solves; synthetic probe hits `/health` every 60 s; alert fires in test within 5 min of injected failure; logs searchable by Mercato optimize job id; runbook linked from alert annotation (see Step 96). |

---

## Step 94 — Mercato optimize-job monitoring

| | |
|---|---|
| **Deliverable** | Mercato-side telemetry: optimize async job lifecycle metrics (queued / running / succeeded / failed), bridge timeout counters, chunk count per solve, notification on repeated failures; admin widget or `/backend/production_planning/ops` status page. |
| **Owner** | Backend (Mercato module) + SRE |
| **Acceptance criteria** | Failed optimize jobs visible in ops page within 30 s; tenant-level failure rate chart available; bridge timeout increments Prometheus counter; ≥20-order async path (202 + poll) monitored end-to-end; stale jobs (>2× timeout) flagged as stuck with manual retry action for admins. |

---

## Step 95 — Runbook: planner daily operations

| | |
|---|---|
| **Deliverable** | Operator runbook (`docs/runbooks/planner-daily-operations.md`): morning checklist (capacity refresh, review Overview KPIs, scan Gantt conflicts), triggering optimize (`POST /optimize` sync vs async), interpreting lateness chips on sales order stage bar, when to escalate. |
| **Owner** | Product + Operations (Manufacturing SME) |
| **Acceptance criteria** | Runbook reviewed and signed by ≥1 planner SME; covers happy path and “do not optimize” conditions (frozen horizon, missing routings); links to Mercato UI routes and API examples; published in repo and linked from Hindsight Overview help icon; onboarding walkthrough completed with pilot user in ≤45 min. |

---

## Step 96 — Runbook: optimize & bridge failure recovery

| | |
|---|---|
| **Deliverable** | Incident runbook (`docs/runbooks/ortools-bridge-incident.md`): bridge down, timeout, infeasible model, partial chunk failure, queue backlog; steps for restart, fallback to manual planning, log extraction, Mercato-side job cancellation. |
| **Owner** | SRE + Backend |
| **Acceptance criteria** | Table-top exercise on staging completes recovery in ≤30 min; each failure mode has detection signal, impact statement, and numbered remediation; runbook references Step 93 alerts; post-incident template included; Mercato continues serving read-only Hindsight when bridge is down. |

---

## Step 97 — Runbook: hindsight dashboard interpretation

| | |
|---|---|
| **Deliverable** | Analyst guide (`docs/runbooks/hindsight-interpretation.md`): how to read genesis tree, heatmap tolerance bands, delta variances; worked examples with screenshots; FAQ (why optimal ≠ actual, changeover objective effects, 150-WC display limits). |
| **Owner** | Product + Manufacturing SME |
| **Acceptance criteria** | Guide enables non-developer to explain a delta report to production manager; glossary defines genesis, tolerance, fixed operations; linked from PDF export footer and in-app help; validated by Hindsight Analyst role holder without engineer assistance. |

---

## Step 98 — IFS write-back Phase 2: design & feature flag (optional)

| | |
|---|---|
| **Deliverable** | SPEC + stub adapter for IFS Applications schedule write-back: mapping planned operations → IFS shop order operations; idempotency keys; feature flag `production_planning.ifs_writeback` default **off**; dry-run mode returning diff preview without ERP mutation. |
| **Owner** | Integration Architect + Backend |
| **Acceptance criteria** | SPEC approved by ERP owner; flag off produces zero IFS traffic; dry-run endpoint returns JSON diff for sample order; no Phase 2 code runs in production until Step 99 pilot sign-off; ACL feature from Step 89 required to enable; rollback = disable flag only. |

---

## Step 99 — IFS write-back pilot sync (optional)

| | |
|---|---|
| **Deliverable** | Pilot implementation: one-way push of approved CP-SAT schedule to IFS for ≤10 production orders in pilot site; reconciliation job detecting IFS rejections; audit trail in Mercato (`ifs_writeback_log` entity or equivalent). |
| **Owner** | Integration + Backend |
| **Acceptance criteria** | Pilot runs in staging against IFS sandbox with ≥95% operation match rate; production pilot limited to flagged site and requires `production_planning.ifs_writeback`; failed writes surface in ops page and do not block Mercato schedule; ERP owner signs pilot completion memo; **explicitly out of scope** for go-live if flag remains off. |

---

## Step 100 — Go-live checklist & industrialization handover

| | |
|---|---|
| **Deliverable** | Go-live package: UAT sign-off checklist (steps 81–97), production smoke script, rollback plan, on-call roster, known limitations doc (150 WC Gantt cap, async threshold ≥20 orders, IFS Phase 2 status), training completion log, and formal handover from project team to BAU operations. |
| **Owner** | Project Manager + Product Owner |
| **Acceptance criteria** | All P0 acceptance criteria from steps 81–94 marked pass in UAT tracker; staging prod-parity test passed within 7 days of cutover; rollback tested once; on-call runbooks (95–97) distributed; IFS write-back status documented as enabled/disabled/deferred; steering committee sign-off recorded; Module 5 closes program step 100/100. |

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
