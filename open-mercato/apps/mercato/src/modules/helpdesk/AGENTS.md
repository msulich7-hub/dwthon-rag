# Service desk (helpdesk) — module agent guide

**Module id:** `helpdesk` · **Source:** `@app` only

## Positioning (May 2026)

**Internal-first** service desk for staff (agents), modeled after **Jira Service Management** (agent workspace vs customer portal) and **Zammad** (Agent / Customer roles).

OSS references: [Zammad](https://github.com/zammad/zammad), [Frappe Helpdesk](https://github.com/frappe/helpdesk), [osTicket](https://github.com/osticket/osticket). See `.ai/specs/2026-05-23-helpdesk-internal-service-desk.md`.

## Do not modify Open Mercato core

No edits under `packages/core`, `packages/ui`, `packages/ai-assistant`.

## Roles

| Feature | Use |
|---------|-----|
| `helpdesk.agent` | Workspace, assign, resolve, CRM customer tab |
| `helpdesk.view` | Read queues, internal notes |
| `helpdesk.submit` | `/backend/helpdesk/report` internal requests |
| `helpdesk.ingest` | `POST /api/helpdesk/ingest` customer channel |
| `helpdesk.voice` | Voice intent / execute on workspace and ticket detail |

## Channels

- **Internal** — `POST /api/helpdesk/requests/internal`, visibility `internal`, requester `staff`
- **Customer** — `POST /api/helpdesk/ingest`, visibility `customer`, requester `customer`

## Surfaces

- `/backend/helpdesk/workspace` — Kanban board + list, queue sidebar, SLA stats
- `/backend/helpdesk/report` — employee self-service
- Dashboard widget `helpdesk.dashboard.service-desk`
- CRM tabs — agent-only linked tickets

## Kanban & SLA

- Drag-and-drop columns: open → in_progress → waiting → resolved (+ optional closed)
- `sla_due_at` from priority (urgent 4h, high 24h, medium 72h, low 7d)
- `GET /api/helpdesk/agent/board`, `GET /api/helpdesk/agent/dashboard`

## Agent extras (v0.4)

| Feature | API / lib |
|---------|-----------|
| Canned responses | `GET /api/helpdesk/canned-responses`, `lib/canned-responses.ts` |
| Knowledge base | `GET/POST /api/helpdesk/kb/articles`, `POST …/kb/from-ticket/[id]` |
| Voice (browser STT → server intent) | `POST /api/helpdesk/voice-intent`, `voice-execute`, `helpdesk.voice` ACL |
| Watchers | `…/tickets/[id]/watchers` |
| Ticket links | `…/tickets/[id]/links` |
| Time entries | `…/tickets/[id]/time-entries` |
| CSAT | `…/tickets/[id]/csat` |
| Summary | `…/tickets/[id]/summary` (`lib/ticket-summary.ts`) |
| Tone enhance | `…/tickets/[id]/enhance-tone` (`lib/tone-enhance.ts`, rule-based) |

Migration: `Migration20260523200000_helpdesk_extras.ts`

UI: `TicketAgentPanel`, `VoiceMicButton` on ticket detail and workspace; KB page `/backend/helpdesk/kb`.
