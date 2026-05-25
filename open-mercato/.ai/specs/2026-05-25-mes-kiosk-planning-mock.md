# MES Kiosk — planning-backed shop floor (mock-first)

**Date:** 2026-05-25  
**Module:** `mes`  
**Status:** Active development — **mock data only** for kiosk visuals  
**Audience:** AFS9 shop-floor operators, planning integration later

## Vision

The MES kiosk is a **dedicated nest terminal**: the operator walks to a work center (gniazdo), sees only operations that **already passed planning** (BOM, routing, sequence, schedule), knows **what to do next** and **which raw materials** are needed, and can request replenishment in one tap.

Production planning (separate module) will eventually be the source of truth for orders, BOM, routing, and nest assignment. Until that API exists, the kiosk uses **`kiosk-planning-mock.ts`** so UX can be pushed hard without rework on persistence.

## Principles (non-negotiable)

1. **Mock-first on kiosk** — default `?kiosk=1` uses planning mock; optional `&live=1` attaches to live dispatch API for dev only.
2. **No deeper work-reporting** — do not extend timesheets / labor APIs in this phase; Start/Complete on mock updates local UI state only.
3. **Only planned operations** — mock rows carry `planBatchId` + `routingReleased: true`; no ad-hoc mystery operations.
4. **Exact sequence** — operations sorted by `sequence` within the nest queue.
5. **Nest in seconds** — large nest switcher; URL `nest=WC-…` for bookmarking terminals.
6. **Operator context optional** — show assigned operator on nest (mock); not required for auth yet.
7. **Intuitive kiosk UX** — large touch targets, one primary action, minimal text, clear “now vs later”.

## Data contract (mock → future planning API)

| Field | Mock | Future planning module |
|-------|------|------------------------|
| `nestCode` | `KioskNest.code` | Work center / resource |
| `sequence` | int | Planned order on nest |
| `planBatchId` | string | Planning run / scenario id |
| `scheduledStart` / `End` | ISO | Finite scheduling |
| `materials[]` | code, name, hint | BOM explosion |
| `operator` | name, badge | Shift assignment |

## UI blocks (kiosk)

| Block | Purpose |
|-------|---------|
| Nest switcher | Change gniazdo in one tap |
| Operator strip | Who is on the nest (mock) |
| **Now** card | Next operation + materials + Start/Complete |
| Plan timeline | Next ~8h and optional 3-day strip |
| Raw materials | Link to replenishment form |
| Planned queue | Full ordered list (read-only context) |
| Scan (collapsed) | Barcode; matches mock queue |

## Out of scope (documented, not built)

- Voice replenishment (“8 hours, 6 pallets”) calculation
- Weekly material caps (e.g. one pallet / week)
- Real planning module read path
- Labor / work schedule reporting

## Routes

- Kiosk: `/backend/mes/operator?kiosk=1&nest=WC-ASSY-01`
- Raw materials: `/backend/mes/operator/raw-materials?kiosk=1&nest=…&workOrderId=…`
- Live API fallback: add `&live=1` on operator kiosk only

## Changelog

- **2026-05-25** — Spec + mock dataset + `MesKioskExperience` UI.
