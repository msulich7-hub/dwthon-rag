# SPEC: MES Phase B — Execution

**Status:** implemented (`cursor/mes-execution-f6a1`)  
**Parent:** `2026-05-23-mes-world-class-roadmap.md`

## Scope

Routing templates, work order operations, operation confirmations, dispatch queue API, operator POD v0.

## Entities

- `MesRoutingTemplate` / `MesRoutingTemplateStep`
- `MesWorkOrderOperation`
- `MesOperationConfirmation`

## APIs

See implementation in `apps/mercato/src/modules/mes/api/`.

## ACL

- `mes.execute` — post confirmations

## Acceptance

1. Create routing template with ordered steps for `product_code`
2. Apply routing to draft/planned WO → operations; first `ready`
3. Confirm start → `in_progress`; WO → `in_progress`
4. Confirm complete → op done; next `ready`; all done → WO `completed`
5. Dispatch queue sorted correctly
6. Tests green

## Deferred

- Parallel/alternate routings, BOM backflush, APS, full POD offline
