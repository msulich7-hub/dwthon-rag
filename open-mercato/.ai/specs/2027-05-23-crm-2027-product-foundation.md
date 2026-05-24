# SPEC: CRM 2027 product foundation on Open Mercato

**Status:** in progress (Phase 1 implemented in `crm_2027` app module)  
**Date:** 2027-05-23  
**Platform:** Open Mercato (`apps/mercato`) — **not** Orpheus (deprecated PHP stack)

## Goal

Ship a competitive, modular CRM product for 2027 on Open Mercato: reuse ~80% platform capabilities (multi-tenancy, RBAC, customers/deals/pipelines, sales bridge, AI harness) and differentiate on AI-native workflows inspired by market leaders (Agentforce-style autonomy, HubSpot-style deal progression, sentiment-aware risk, voice-first UX).

**Reference UX:** Twenty (Notion-like CRM, MCP-native) — borrow interaction patterns, not fork the product.

## Strategic pillars → implementation map

| Trend (2027) | Phase 1 (`crm_2027` v0.1) | Phase 2+ |
|--------------|---------------------------|----------|
| **A. Agent-based CRM** | `crm_2027.sales_autonomy_agent` + `list_at_risk_deals`, proactive scan tools | Renewal/opportunity rules engine, scheduled workers |
| **B. Voice-first UX** | `POST /api/crm_2027/voice-intent` — NL → structured intent (PL/EN) | Speech SDK, meeting transcription pipeline |
| **C. Sentiment & emotional AI** | `analyze_text_sentiment` heuristic + `sentiment_monitor_agent` | LLM enrichment, email/chat channel ingestion |
| **D. Smart deal progression** | `suggest_deal_updates` + `deal_progression_agent`, whitelist `customers.update_deal_stage` | Post-meeting transcript analysis, follow-up drafts |
| **E. Composable / modular** | Dedicated `@app` module, UMES injection on deal detail | Official module publish, CPQ integrations |

## Dependencies (platform)

- **Core CRM:** `customers` (people, companies, deals, pipelines, activities)
- **Revenue bridge:** `sales` (quotes/orders after won deals)
- **AI runtime:** `ai_assistant`, `defineAiTool`, approval cards for mutations
- **Optional:** `inbox_ops`, `messages`, `workflows` for channel automation

## Module: `crm_2027`

**Location:** `apps/mercato/src/modules/crm_2027/`  
**Registry:** `apps/mercato/src/modules.ts` → `{ id: 'crm_2027', from: '@app' }`

### Agents

| Agent ID | Purpose |
|----------|---------|
| `crm_2027.copilot` | Unified operator assistant on deal detail |
| `crm_2027.deal_progression_agent` | Stage/field suggestions after interactions |
| `crm_2027.sentiment_monitor_agent` | Tone analysis, at-risk flagging |
| `crm_2027.sales_autonomy_agent` | Proactive pipeline hygiene (stalled/at-risk) |

### ACL features

- `crm_2027.view` — use CRM 2027 UI and read tools
- `crm_2027.ai` — invoke agents
- `crm_2027.voice` — voice-intent API

### Acceptance (Phase 1)

1. Module enabled; `yarn generate` discovers agents, tools, routes, widgets.
2. Deal detail shows **CRM 2027** AI trigger (`detail:customers.deal:header`).
3. Copilot can analyze sentiment on pasted text and suggest deal updates for current deal.
4. Voice-intent API returns structured intents for Polish/English samples.
5. Mutations to deal stage go through existing `customers.update_deal_stage` approval flow only.

## Out of scope (explicit)

- Orpheus or PHP legacy stacks
- Forking Twenty; only UX/MCP patterns as reference
- Full autonomous agents without human approval (Phase 1)

## QA notes

- Requires `customers`, `ai_assistant` enabled and `OPENAI_API_KEY` (or configured provider) for live agent chat.
- Run: `yarn generate`, `yarn mercato auth sync-role-acls` after ACL changes.
