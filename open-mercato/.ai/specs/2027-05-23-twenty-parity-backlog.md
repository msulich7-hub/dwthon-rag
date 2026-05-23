# SPEC: Twenty parity backlog for CRM 2027

**Reference:** [twentyhq/twenty](https://github.com/twentyhq/twenty) (UX/MCP inspiration only — no fork)  
**Module:** `apps/mercato/src/modules/crm_2027/` (`from: '@app'`)  
**Status:** Phase A implemented; Phases B in-module only

## Hard rule: do not modify Open Mercato core

All CRM 2027 / Twenty-parity work stays in the **app module** — no PRs to:

- `packages/core/**` (including `customers`, `auth`, …)
- `packages/ui/**` (AppShell, DataTable primitives)
- `packages/ai-assistant/**` (platform AI host)
- Any other `packages/*` platform code

**Allowed integration patterns (OM-native):**

| Pattern | Example |
|---------|---------|
| Import from published packages | `@open-mercato/core/modules/customers/data/entities` |
| Call existing command handlers | `customers.interactions.create` via `commandBus` |
| UMES widget injection | `widgets/injection-table.ts` → customers deal header, sidebar |
| Register module | Single line in `apps/mercato/src/modules.ts` |
| Backend/API under module path | `backend/crm_2027/*`, `api/crm_2027/*` |
| Compose existing routes | Link/redirect to `/backend/customers/*` — no fork |

If Twenty parity needs a platform feature we do not have (global Cmd+K slot, calendar primitive), **defer or document as upstream request** — do not patch core in this product repo.

## Parity matrix (summary)

| Twenty | CRM 2027 (in-module only) | Phase |
|--------|---------------------------|-------|
| Object home + nav | `/backend/crm_2027` hub + sidebar injection | **A** |
| Table / Kanban views | `ViewSwitcher` → existing customers list + pipeline | **A** |
| Global search | `/backend/crm_2027/search` + `GET /api/crm_2027/search` | **A** |
| Record side panel | `RecordPeekDrawer` (module component) | **A** |
| MCP tool catalog | `crm_2027.describe_crm_surface` | **A** |
| Cmd+K CRM command menu | **Out of scope** until upstream exposes injection; use hub + search | — |
| Calendar view | **Out of scope** without new UI in `@app` only (no core calendar) | — |
| Custom objects runtime | Use existing `entities` via core APIs — no core edits | — |
| Email/calendar sync | **Out of scope** — separate integration module upstream | — |

## Phase A — done (shell & discovery)

CRM hub, sidebar, deals view switcher, search API/UI, record peek, AI discovery tools.

## Phase B — next (still `@app` only)

- Thin pages under `/backend/crm_2027/people|companies` that redirect to customers v2 routes
- More injection widgets on existing `detail:customers.*` spots (timeline chips, quick actions)
- Perspectives: use `/api/perspectives` with `tableId` prefixed `crm_2027.*` — no core change

## Explicitly not in CRM 2027 scope

- Forking or patching `packages/core/src/modules/customers`
- Changing `AppShell`, global hotkeys registry, or MCP server in `ai-assistant`
- Ejecting official modules into this repo
