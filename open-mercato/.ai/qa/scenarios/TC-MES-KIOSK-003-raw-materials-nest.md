# Test Scenario: MES Kiosk raw materials and nest change

## Test ID
TC-MES-KIOSK-003

## Category
MES — Shop-floor kiosk

## Priority
Medium

## Description
Verify one-tap navigation to raw-material replenishment form in kiosk skin, submit returns to shop floor, and service nest switch loads another mock nest.

## Prerequisites
- TC-MES-KIOSK-001 prerequisites
- Onboarding skipped or completed

## Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On ASSY kiosk, click “Order raw materials” | Navigate to `/backend/mes/operator/raw-materials?kiosk=1&…` |
| 2 | Observe page | Same kiosk shell + demo banner; nest code in header |
| 3 | Observe work order select | WO-2026-1042 available; BOM lines with mock quantities |
| 4 | Choose replenishment count (e.g. 2) and submit | Success flash; redirect to operator kiosk ASSY |
| 5 | Open ASSY kiosk, click “Change nest” | Service panel with three nests |
| 6 | Select “Paint cell (WC-PAINT-02)” | URL `nest=WC-PAINT-02`; header shows Paint cell |
| 7 | Direct URL `/backend/mes/operator/raw-materials?kiosk=1&nest=WC-ASSY-01` | BOM visible; “Shop floor” back link returns to kiosk |

## Expected Results
- Raw materials form is format preview (no ERP stock deduction)
- Voice CTA disabled (“soon”)
- Nest persistence via `localStorage` after switch

## Edge Cases / Error Scenarios
- Submit without work order — button disabled
- `&live=1` on raw materials uses API queue (different from mock)

## Automation
Playwright: `apps/mercato/src/modules/mes/__integration__/TC-MES-KIOSK-003-raw-materials-nest.spec.ts`
