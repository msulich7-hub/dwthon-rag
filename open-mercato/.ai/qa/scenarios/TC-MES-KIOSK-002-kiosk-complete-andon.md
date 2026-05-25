# Test Scenario: MES Kiosk complete flow and Andon

## Test ID
TC-MES-KIOSK-002

## Category
MES — Shop-floor kiosk

## Priority
High

## Description
Verify demo complete confirmation promotes the next operation on ASSY nest, Andon reason picker works, and barcode scan can trigger complete on in-progress step.

## Prerequisites
- TC-MES-KIOSK-001 prerequisites
- Fresh session storage for nest `WC-ASSY-01` (no persisted `mes_kiosk_ops_v1_WC-ASSY-01`) so step 10 is `in_progress`

## Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open ASSY kiosk URL | Now card shows step 10 in progress; “Complete (demo)” visible |
| 2 | Click “Complete (demo)” | Confirmation dialog appears (not immediate complete) |
| 3 | Confirm complete | Dialog closes; success flash; now card shows step 20 “Fit control module” |
| 4 | Verify step 20 | “Start (demo)” available; step 20 was blocked before complete |
| 5 | Click “Report issue…” | Andon dialog with three reason buttons |
| 6 | Pick “Missing material” | Dialog closes; demo success flash with reason |
| 7 | In scan field enter `WO-2026-1042` and press Enter | Match found; complete confirmation opens for in-progress op |

## Expected Results
- Sequence gate: step 20 not startable until step 10 completed
- No API calls to MES work reporting (demo only)
- Nest capacity: only one `in_progress` at a time on nest

## Edge Cases / Error Scenarios
- Cancel complete dialog (if implemented) leaves state unchanged
- Scan unknown code shows error flash, no dialog
- Scan on blocked `ready` op highlights only, does not auto-start

## Automation
Playwright: `apps/mercato/src/modules/mes/__integration__/TC-MES-KIOSK-002-complete-and-andon.spec.ts`
