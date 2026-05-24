# CRM 2027 — Phase 3–4 (consolidated)

| Field | Value |
|-------|-------|
| **Date** | 2027-05-23 |
| **Status** | Implemented |
| **Branch** | `cursor/crm-2027-phase-3-meetings-f6a1` |
| **Module** | `apps/mercato/src/modules/crm_2027` |
| **PR** | #7 |

## Scope

App-module extension on Open Mercato `customers` — no `packages/core` patches.

### Phase 3 — Meetings

- Entity `Crm2027DealMeeting` + migration
- `GET/POST /api/crm_2027/deals/:dealId/meetings`
- Deal tab **Meetings** (`detail:customers.deal:tabs`)

### Phase 4 — Integrations & intelligence

- Meetings → `customers.interactions.create` (`interaction_id` on meeting row)
- LLM sentiment optional (`analyzeSentimentSmart`, `OM_AI_MODEL`)
- Webhooks: Zoom, Gong
- STT bridge (transcript only; audio → 501)
- Email sync API + 12h worker/scheduler
- Calendar upcoming API + UI page
- Pipeline forecast API + dashboard panel
- Code workflows + `GET /api/crm_2027/workflows`
- Cmd+K injection on CRM paths

## API index

| Method | Path |
|--------|------|
| GET/POST | `/api/crm_2027/deals/:dealId/meetings` |
| GET | `/api/crm_2027/deals/:dealId/risk` |
| GET | `/api/crm_2027/calendar/upcoming` |
| GET | `/api/crm_2027/forecast` |
| POST | `/api/crm_2027/sync/email` |
| POST | `/api/crm_2027/webhooks/zoom` |
| POST | `/api/crm_2027/webhooks/gong` |
| POST | `/api/crm_2027/integrations/stt` |
| GET | `/api/crm_2027/workflows` |

## Env

- `CRM_2027_WEBHOOK_SECRET`, `CRM_2027_ZOOM_WEBHOOK_SECRET`
- `OM_AI_MODEL`, `OPENAI_API_KEY` (optional LLM sentiment)

## Out of scope (upstream / future)

- Full `call_transcripts` module (platform spec 2026-04-21)
- Bi-directional Gmail/Outlook sync
- Global AppShell Cmd+K slot

## QA

```bash
cd open-mercato/apps/mercato
yarn db:migrate
yarn test --testPathPatterns=crm_2027/lib/__tests__
```
