# CRM 2027 — module agent guide

**Module id:** `crm_2027` · **Source:** `@app` only (`apps/mercato/src/modules/crm_2027/`)

## Do not modify Open Mercato core

- No edits under `packages/core`, `packages/ui`, `packages/ai-assistant`, or other platform packages.
- Integrate with CRM via **imports**, **command bus** (`customers.*` commands), **UMES injection**, and **links** to `/backend/customers/*`.
- Register only in `apps/mercato/src/modules.ts`: `{ id: 'crm_2027', from: '@app' }`.

## Specs

- `open-mercato/.ai/specs/2027-05-23-crm-2027-product-foundation.md`
- `open-mercato/.ai/specs/2027-05-23-crm-2027-phase-2.md`
- `open-mercato/.ai/specs/2027-05-23-twenty-parity-backlog.md`

## Reference module

Copy patterns from `apps/mercato/src/modules/example/` (injection, ACL, setup) and consume `customers` / `ai_assistant` as dependencies — same as official-modules consumers.
