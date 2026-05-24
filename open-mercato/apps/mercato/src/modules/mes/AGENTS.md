# MES — module agent guide

**Module id:** `mes` · **Source:** `@app` only (`apps/mercato/src/modules/mes/`)

## Do not modify Open Mercato core

- No edits under `packages/core`, `packages/ui`, `packages/ai-assistant`, or other platform packages.
- Integrate with CRM via **imports** from `@open-mercato/core/...`, **command bus** (`customers.*`), **UMES injection**, and **links** to `/backend/customers/*`.
- Register only in `apps/mercato/src/modules.ts`: `{ id: 'mes', from: '@app' }`.

## Reference modules

- `apps/mercato/src/modules/crm_2027/` — API routes, deal tabs, request context, migrations
- `apps/mercato/src/modules/example/` — injection and ACL patterns

## Dependencies

- `customers` — deal-linked work orders (`CustomerDeal` read for validation)
- `sales` — sales orders (`SalesOrder`, `SalesOrderLine`); tab on `/backend/sales/orders/[id]`
- `workflows` / `notifications` / `scheduler` — optional in later phases via `events.ts`

## Phases

- **A (foundation):** work orders, deal widgets, dashboard API
- **B (execution):** routing templates, operations, confirmations, dispatch queue, operator POD
- **C–F:** see `.ai/specs/2026-05-23-mes-phase-*.md` and `2026-05-23-mes-world-class-roadmap.md`

## After changes

```bash
cd open-mercato/apps/mercato
yarn generate
yarn db:migrate
yarn test -- src/modules/mes
```
