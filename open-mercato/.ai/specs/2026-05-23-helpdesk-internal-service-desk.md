# Helpdesk — internal service desk (May 2026)

## Product intent

**Primary:** internal tool for staff (agents) — triage, assign, internal notes, queues.  
**Secondary:** customers can **submit** requests (email/ingest, future portal); they do not get the agent workspace.

Aligned with patterns from **Jira Service Management** (agent vs portal), **Zammad** (Agent / Customer roles), and **Frappe Helpdesk** (agent desk + customer portal + SLA-ready model).

## OSS landscape (May 2026)

| Project | Role | Fit for Open Mercato module |
|---------|------|------------------------------|
| [Zammad](https://github.com/zammad/zammad) | Full helpdesk, multi-channel | Reference for Agent vs Customer, queues |
| [Frappe Helpdesk](https://github.com/frappe/helpdesk) | Modern desk + portal | Reference for internal desk UX, team queues |
| [osTicket](https://github.com/osticket/osticket) | Classic PHP desk | Simple ticket lifecycle |
| [Plane](https://github.com/makeplane/plane) | Issue tracker / Jira alt | Not ITSM — use for dev tasks, not support |

We implement a **thin composable module** on Open Mercato (no separate stack).

## Roles (ACL)

| Feature | Who |
|---------|-----|
| `helpdesk.agent` | Service team — queues, assign, internal + public replies |
| `helpdesk.view` | Viewers — read queues, add internal notes |
| `helpdesk.submit` | Any employee — file **internal** requests |
| `helpdesk.ingest` | Integrations — **customer** channel (email, webhook) |

## Ticket model

- `visibility`: `internal` (staff-only) \| `customer` (external requester)
- `requester_type`: `staff` \| `customer`
- `team_queue`: `general` \| `it` \| `ops` \| `billing` (routing)
- Comments: `is_internal` (agent note) vs public reply to requester

## Surfaces

- `/backend/helpdesk` — hub
- `/backend/helpdesk/workspace` — **agent queue board** (`helpdesk.agent`)
- `/backend/helpdesk/report` — **internal request** form (`helpdesk.submit`)
- Customer CRM tabs — **agent-only** linked tickets on company/person
- `POST /api/helpdesk/ingest` — customer channel
- `POST /api/helpdesk/requests/internal` — staff internal requests
