# CRM 2027 — module agent guide

**Module id:** `crm_2027` · **Version:** 0.5.0 · **Source:** `@app` only (`apps/mercato/src/modules/crm_2027/`)

## Do not modify Open Mercato core

- No edits under `packages/core`, `packages/ui`, `packages/ai-assistant`, or other platform packages.
- Integrate via **imports**, **command bus** (`customers.*`), **UMES injection**, **events**, **workflows**, **queues/scheduler**.
- Register only in `apps/mercato/src/modules.ts`: `{ id: 'crm_2027', from: '@app' }`.

## Reference branch

`cursor/crm-2027-phase-3-meetings-f6a1` (Phase 3 + 4 merged) — use as template for new app modules.

## Specs

- `open-mercato/.ai/specs/2027-05-23-crm-2027-phase-3-4-consolidated.md`
- `open-mercato/.ai/specs/2027-05-23-crm-2027-product-foundation.md`
- `open-mercato/.ai/specs/2027-05-23-crm-2027-phase-2.md`
- `open-mercato/.ai/specs/2027-05-23-twenty-parity-backlog.md`

## Feature map

| Area | Key files |
|------|-----------|
| Meetings ingest | `lib/ingest-deal-meeting.ts`, `api/deals/[dealId]/meetings/` |
| CRM timeline projection | `lib/meeting-interaction.ts` → `customers.interactions.create` |
| Sentiment | `lib/sentiment.ts`, `lib/sentiment-analyze.ts` |
| At-risk | `lib/at-risk-scan.ts`, `workers/risk-scan.ts` |
| Email sync | `lib/email-sync.ts`, `workers/email-sync.ts`, `POST /api/crm_2027/sync/email` |
| Transcript ingest | `call_transcripts` module → `call_transcripts.ingest`; subscriber `subscribers/call-transcript-deal-bridge.ts` |
| Webhooks (deprecated) | `api/webhooks/zoom`, `api/webhooks/gong` delegate to `call_transcripts` |
| Forecast | `lib/pipeline-forecast.ts`, `GET /api/crm_2027/forecast` |
| Calendar | `lib/calendar-upcoming.ts`, `/backend/crm_2027/calendar` |
| Workflows | `workflows.ts`, `events.ts` |
| UI injection | `widgets/injection-table.ts`, `widgets/injection/*` |
| Cmd+K | `components/CrmCommandPalette.tsx`, `widgets/injection/crm-cmdk` |

## Injection spots

- `detail:customers.deal:tabs` — Meetings tab
- `detail:customers.deal:status-badges` — Risk chips
- `detail:customers.deal:header` — Copilot, quick links
- `data-table:customers.*.list:search-trailing` — Context bar
- `menu:sidebar:main` — CRM nav + Cmd+K
- `admin.page:backend:crm_2027:before` — Cmd+K on CRM pages

## Workers & queues

- `crm_2027:risk-scan` — 6h scheduler (`setup.ts`)
- `crm_2027:email-sync` — 12h scheduler (`setup.ts`)

## ACL

- `crm_2027.view`, `crm_2027.ai`, `crm_2027.voice`, `crm_2027.manage`

## Tests

`yarn test --testPathPatterns=crm_2027/lib/__tests__` from `apps/mercato`
