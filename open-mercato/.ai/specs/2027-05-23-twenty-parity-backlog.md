# SPEC: Twenty parity backlog for CRM 2027

**Reference:** [twentyhq/twenty](https://github.com/twentyhq/twenty) (UX/MCP inspiration only — no fork)  
**Module:** `apps/mercato/src/modules/crm_2027/`  
**Status:** Phase A implemented in this branch; Phases B–C tracked below

## Parity matrix (summary)

| Twenty | CRM 2027 / Open Mercato | Phase |
|--------|-------------------------|-------|
| Object home + nav | `/backend/crm_2027` hub + sidebar group | **A** |
| Table / Kanban views | Deals `ViewSwitcher` → customers list + pipeline | **A** |
| Global search `/` | `/backend/crm_2027/search` + `GET /api/crm_2027/search` | **A** |
| Record side panel | `RecordPeekDrawer` on at-risk | **A** |
| MCP tool catalog | `crm_2027.describe_crm_surface` + `search_records` | **A** |
| Cmd+K command menu | Blocked — needs core `AppShell` spot | **C** |
| Calendar view | Blocked — needs UI primitive | **C** |
| Custom objects runtime | `entities` module (partial) | **C** |
| Email/calendar sync | `integrations` / future module | **C** |

## Phase A (this PR) — shell & discovery

- CRM hub, expanded sidebar, deals view switcher, unified search API/UI, record peek, AI tools for search + schema describe.

## Phase B — record UX

- Redirect wrappers to `people-v2` / `companies-v2`, timeline filter widget injection, favorites via perspectives.

## Phase C — platform

- Global command palette in `@open-mercato/ui`, calendar view, row-level security.
