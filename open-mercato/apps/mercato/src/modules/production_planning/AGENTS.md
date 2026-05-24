# Planowanie produkcji (`production_planning`)

**Module id:** `production_planning` · **Source:** `@app` only (`apps/mercato/src/modules/production_planning/`)

## Do not modify Open Mercato core

- No edits under `packages/core`, `packages/ui`, `packages/ai-assistant`, or other platform packages.
- Integrate via **command bus** (`sales.orders.*`), **UMES injection**, and links to `/backend/sales/*`.
- Register only in `apps/mercato/src/modules.ts`: `{ id: 'production_planning', from: '@app' }`.

## CP-SAT solver (Google OR-Tools)

Heavy scheduling runs in **`open-mercato/services/ortools-scheduler`** (Python, Apache 2.0). Mercato never embeds OR-Tools in Node.

| Step | File / endpoint |
|------|-----------------|
| Export problem | `lib/build-cpsat-payload.ts` |
| HTTP bridge | `lib/ortools-bridge.ts` → `ORTOOLS_BRIDGE_URL` (default `…/schedule`) |
| Solve | Python `app/solver/scheduler.py` (CP-SAT) |
| Apply result | `lib/apply-cpsat-schedule.ts` via `POST /api/production_planning/optimize` |
| What-if scenarios | `data/what-if-scenarios.registry.json` · `lib/what-if-scenario-runner.ts` · `POST /api/production_planning/scenarios/runs` |
| Scenario Lab UI | `/backend/production_planning/scenarios` |
| Cross-order pegging | `lib/pegging-to-assembly-links.ts` → `assemblyLinks` on CP-SAT payload |
| Peg-aware chunking | `partitionOrdersPegAware` in `lib/cpsat-chunking.ts` |

Env: `ORTOOLS_BRIDGE_URL`, `ORTOOLS_BRIDGE_API_KEY`, `ORTOOLS_BRIDGE_TIMEOUT_MS`.

Spec: `.ai/specs/2026-05-23-production-planning-cpsat-ortools.md`

## Dependencies

- `sales` — order detail tab + stage-bar injection
- `scheduler` + `queue` — capacity refresh every 4h
- `workflows`, `notifications` — late-order alerts
- `ai_assistant` — scheduling copilot + `production_planning.capacity_snapshot` tool

## Injection spots

- `sales.document.detail.order:tabs` — production schedule tab
- `detail:sales.order:stage-bar` — production status chips
- `menu:sidebar:main` — module navigation

## Reference

Copy patterns from `crm_2027/` (ACL, setup, workers, injection).
