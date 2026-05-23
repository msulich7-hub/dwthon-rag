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

## Channels

- **Internal** — `POST /api/helpdesk/requests/internal`, visibility `internal`, requester `staff`
- **Customer** — `POST /api/helpdesk/ingest`, visibility `customer`, requester `customer`

## Surfaces

- `/backend/helpdesk/workspace` — agent queues
- `/backend/helpdesk/report` — employee self-service
- CRM tabs — agent-only linked tickets
