# Helpdesk — module agent guide

**Module id:** `helpdesk` · **Source:** `@app` only (`apps/mercato/src/modules/helpdesk/`)

## Do not modify Open Mercato core

- No edits under `packages/core`, `packages/ui`, `packages/ai-assistant`, or other platform packages.
- Integrate via **imports**, **UMES injection** (`detail:customers.company:tabs`, `detail:customers.person:tabs`), and **module-local APIs** under `/api/helpdesk/*`.
- Register only in `apps/mercato/src/modules.ts`: `{ id: 'helpdesk', from: '@app' }`.

## Reference module

Copy patterns from `apps/mercato/src/modules/crm_2027/` (ingest API, entities, migration, injection tabs, `lib/__tests__/`).

## Capabilities

- Ticket CRUD with sequential keys (`HD-0001`)
- `POST /api/helpdesk/ingest` for email/chat payloads
- Customer detail **Support** tab (company + person)
- Backend hub at `/backend/helpdesk`
