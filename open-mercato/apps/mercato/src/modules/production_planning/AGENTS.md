# Planowanie produkcji (`production_planning`)

**Module id:** `production_planning` · **Source:** `@app` only (`apps/mercato/src/modules/production_planning/`)

## Do not modify Open Mercato core

- No edits under `packages/core`, `packages/ui`, `packages/ai-assistant`, or other platform packages.
- Integrate via **command bus** (`sales.orders.*`, `catalog.*`), **UMES injection**, and links to `/backend/sales/*`.
- Register only in `apps/mercato/src/modules.ts`: `{ id: 'production_planning', from: '@app' }`.

## Dependencies

- `sales` — sales order detail tabs and stage-bar injection
- `scheduler` + `queue` — periodic capacity refresh jobs
- `workflows`, `notifications` — late-order alerts
- `ai_assistant` — optional scheduling copilot (foundation stubs)

## Reference

Copy patterns from `apps/mercato/src/modules/crm_2027/` and `example/` (injection, ACL, setup).

## Injection spots

- `sales.document.detail.order:tabs` — production schedule tab on order detail
- `detail:sales.order:stage-bar` — production status chips
- `menu:sidebar:main` — module navigation group

## Hexaly (commercial optimizer) — integration pattern

Hexaly is **not** open source and has **no official Node.js SDK**. Do not add proprietary binaries to Mercato.

Recommended architecture (aligned with Open Mercato module + queue model):

1. **Data in Mercato** — production orders, operations, sales links (`production_planning_*` tables).
2. **Export job** — `POST /api/production_planning/optimize` builds payload and calls `lib/hexaly-bridge.ts`.
3. **Hexaly worker** — separate Python/Java microservice (or Hexaly Cloud) runs the solver; returns planned start/end per operation.
4. **Import job** — apply `schedule[]` back via `production_planning` APIs (future: worker `hexaly-import`).

Env:

- `HEXALY_BRIDGE_URL` — HTTP endpoint of your bridge service
- `HEXALY_BRIDGE_API_KEY` — optional bearer token
- `HEXALY_BRIDGE_TIMEOUT_MS` — default `120000`

Without `HEXALY_BRIDGE_URL`, the module uses in-app heuristics (`capacity-snapshot`, late-order flags) only.

Licensing note: Hexaly is quote-based (Business) or free (Academic). Budget for solver separately from Mercato (MIT).
