# Call Transcripts — module agent guide

**Module id:** `call_transcripts` · **Source:** `@app` (`apps/mercato/src/modules/call_transcripts/`)

## Role

Canonical ingest for meeting/call transcripts (Zoom, Gong, manual API). Projects `customers.interactions` (`interactionType: call`). CRM 2027 subscribes to `call_transcripts.transcript.matched` when `dealId` is present for AI sentiment/risk.

## Commands

- `call_transcripts.ingest` — idempotent on `(tenantId, providerKey, externalRecordingId)`

## API

| Route | Purpose |
|-------|---------|
| `POST /api/call_transcripts/ingest` | Authenticated ingest |
| `POST /api/call_transcripts/webhooks/zoom` | Zoom / deal custom fields |
| `POST /api/call_transcripts/webhooks/gong` | Gong bridge |

Legacy CRM routes (`/api/crm_2027/webhooks/*`) delegate here.

## Env

- `CALL_TRANSCRIPTS_WEBHOOK_SECRET` (falls back to `CRM_2027_WEBHOOK_SECRET`)
- `CALL_TRANSCRIPTS_ZOOM_WEBHOOK_SECRET` (falls back to `CRM_2027_ZOOM_WEBHOOK_SECRET`)
- `CALL_TRANSCRIPTS_WEBHOOK_ALLOW_INSECURE=true` for local dev

## Spec

`.ai/specs/2026-04-21-crm-call-transcriptions.md` (full platform module — this app module is a minimal subset)
