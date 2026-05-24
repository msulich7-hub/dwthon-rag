# SPEC: MES world-class roadmap (Open Mercato)

**Status:** in progress (Phase A ✅; Phase B ✅ on `cursor/mes-execution-f6a1`; C–F specced)  
**Date:** 2026-05-23  
**Module:** `mes` · `@app` only (`apps/mercato/src/modules/mes/`)  
**Council:** 10 MES/MOM specialists (Siemens, SAP, Apriso, Rockwell, AVEVA, Critical Mfg, Cloud MES, ISA architect, AI MES, Shop-floor UX)

## Goal

Build the best **CRM-native MES** for mid-market SaaS in 2026: manufacturing execution that closes the loop between **commercial promise** (deals) and **shop-floor truth** (operations, confirmations, trace), without forking Open Mercato core.

**Reference patterns:** `crm_2027` (AI, events, UMES), `example` (injection/ACL), IEC 62264 / ISA-95 vocabulary.

## Strategic wedge

| Legacy MES strength | Open Mercato opportunity |
|---------------------|---------------------------|
| Deep plant model | Deal-linked execution from day one |
| ERP-native closed loop | Same tenant: CRM + MES + workflows + AI |
| Monolithic upgrades | `@app` module, `yarn generate`, no core patches |

**Success litmus (Phase D):** Planner creates WO from a deal, operator completes on floor, deal chip/tab updates without opening MES — under 30 seconds perceived latency.

## Phase map

| Phase | Name | Deliverable | Specialist lead |
|-------|------|-------------|-----------------|
| **A** ✅ | Foundation | Work orders, deal link, APIs, widgets, events | Cloud MES |
| **B** | Execution | Routing templates, WO operations, confirmations, dispatch queue | Opcenter / SAP |
| **C** | Trace | Lots/serials, consumption, genealogy, recall API | Rockwell / Critical Mfg |
| **D** | Quality & Pulse | Holds, checklists, OEE-lite, Andon, downtime | AVEVA / FactoryTalk |
| **E** | Integrations | B2MML outbox, ERP/PLM/OT webhooks, idempotent commands | SAP DM / ISA |
| **F** | AI | Copilot, risk scan, workflows (`crm_2027` parity) | AI MES |

Detailed phase specs: `2026-05-23-mes-phase-b.md` … `mes-phase-f.md` (same folder).

## Architecture (ISA spine — thin in B, deep in F)

```
Operations Definition  → routing templates (Phase B)
Work Definition        → apply routing to WO (Phase B)
Work Performance       → confirmations (Phase B)
Work Schedule          → dispatch queue (Phase B lite)
Genealogy              → Phase C
Quality / Equipment    → Phase D
Integration boundary   → Phase E
```

**Anti-patterns (all phases):** monolithic status-only WO; ERP as HMI; SCADA-as-MES; edits under `packages/core`.

## Ten pillars (council consensus)

1. Execution unit below work order (operations)
2. Versioned routing with rework path (later)
3. Genealogy forward/backward (Phase C)
4. Operation confirmations → ERP-ready payloads (Phase E)
5. Resource dispatch queue (Phase B lite)
6. Quality at source (Phase D)
7. Equipment state / OEE (Phase D)
8. Event-native domain (`mes.*`)
9. CRM `dealId` correlation everywhere
10. Scan-first operator UX (Phase B v0 POD, Phase C harden)

## Council debate resolutions (2026-05-23)

| Question | Decision |
|----------|----------|
| ISA-95 full model first? | **No** — job-shop + deal link through D; ISA depth in F |
| Phase B scope | **GO** — routing explosion + confirmations + linear gating; defer materials, parallel routing, APS |
| Mobile POD | **Thin v0 in B** (`/backend/mes/operator`) — scan/offline in C |
| AI (F) vs Integrations (E) | **F before E** for surfaces; E contract (`external_id`) stubbed in B/D |
| MVP “world-class” by D | Federated CRM visibility + execution + release guards — not Plex parity |

## Dependencies (platform)

- `customers` — deals, optional `customers.get_deal` for AI
- `catalog` — product codes (read-only validation later)
- `workflows`, `notifications`, `scheduler`, `queue` — phases D–F
- `ai_assistant` — Phase F
- `webhooks` / `integrations` — Phase E

## Module registry

```ts
{ id: 'mes', from: '@app' }
```

## QA (every phase)

```bash
cd open-mercato/apps/mercato
yarn build:packages   # fresh env
yarn generate
yarn db:migrate
yarn test -- src/modules/mes
```

## Out of scope (global)

- Orpheus / legacy PHP
- `packages/core` patches for MES concerns
- Full OPC-UA client in-process (edge → webhook in E)
