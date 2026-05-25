# Test Scenario: MES Kiosk shell and onboarding

## Test ID
TC-MES-KIOSK-001

## Category
MES — Shop-floor kiosk

## Priority
High

## Description
Verify the planning mock kiosk loads as a fullscreen terminal with demo banner, primary now card, scan bar, and optional onboarding overlay.

## Prerequisites
- Application running at `http://localhost:3000`
- User can log in as `admin@acme.com` / `secret` (or env init credentials)
- Clear kiosk storage or use incognito: remove `mes_kiosk_onboarding_v1`, `mes_kiosk_nest_v1`, and `mes_kiosk_ops_v1_*` session keys

## Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in and open `/backend/mes/operator?kiosk=1&nest=WC-ASSY-01` | Fullscreen kiosk shell; no standard MES admin sidebar |
| 2 | Observe top banner | Yellow “demo / TRYB POKAZOWY” style banner visible |
| 3 | Observe header | Nest name “Assembly A”, code `WC-ASSY-01`, plan batch meta |
| 4 | Observe now card | Operation “Sub-assembly housing”, WO-2026-1042, materials list with quantities |
| 5 | Observe footer | Scan input fixed at bottom |
| 6 | Fresh profile: reload without onboarding key | 3-step onboarding overlay appears |
| 7 | Click “Skip” | Overlay closes; now card usable |
| 8 | Reload page | Onboarding does not reappear |
| 9 | Click “Show plan & sequence” | Timeline / plan strip expands |
| 10 | Click “Hide plan” | Plan collapses again |

## Expected Results
- Kiosk is touch-friendly (large buttons on now card)
- Only planned operations context; demo actions labeled “(demo)”
- URL retains `kiosk=1` and `nest=WC-ASSY-01`

## Edge Cases / Error Scenarios
- Invalid `nest=` query falls back to default ASSY mock
- `&live=1` shows different (API) UI — not in scope for this scenario

## Automation
Playwright: `apps/mercato/src/modules/mes/__integration__/TC-MES-KIOSK-001-shell-onboarding.spec.ts`
