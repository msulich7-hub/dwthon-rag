# MES Kiosk — test brief (subagent orchestration)

**Module:** `mes`  
**Feature:** Planning-backed shop-floor kiosk (mock-first)  
**Spec:** `.ai/specs/2026-05-25-mes-kiosk-planning-mock.md`  
**Branch:** `cursor/mes-kiosk-raw-materials-b16f`

## Goal

Validate kiosk UX on mock planning data: shell, onboarding, now card, complete gates, Andon, scan bar, raw materials, nest switch. No live MES API in default `?kiosk=1` path.

## Subagent roles

| Agent | Scope | Inputs | Done when |
|-------|--------|--------|-----------|
| **Unit** | `kiosk-planning-view-model`, `kiosk-planning-mock` | Jest only | All tests in `lib/__tests__/kiosk-planning-mock.test.ts` pass |
| **Integration (Playwright)** | `apps/mercato/src/modules/mes/__integration__/TC-MES-KIOSK-*.spec.ts` | Dev server `:3000`, admin login | `OM_INTEGRATION_MODULES=mes yarn test:integration` green |
| **Manual QA** | `.ai/qa/scenarios/TC-MES-KIOSK-*.md` | Tablet viewport ~768×1024 | Scenarios signed off on ASSY + one other nest |
| **Visual (optional)** | Screenshots with `PW_CAPTURE_SCREENSHOTS=1` | Same URLs as manual | No layout regressions vs spec |

## Environment

```bash
cd open-mercato

# Terminal A — app
yarn dev   # or project-standard dev server on http://localhost:3000

# Terminal B — unit
yarn workspace @open-mercato/app test -- src/modules/mes/lib/__tests__/kiosk-planning-mock.test.ts

# Terminal B — integration (MES only)
OM_INTEGRATION_MODULES=mes yarn test:integration
```

Optional: `BASE_URL=http://localhost:3000` if the server runs elsewhere.

## Entry URLs

| URL | Purpose |
|-----|---------|
| `/backend/mes/operator?kiosk=1&nest=WC-ASSY-01` | Primary ASSY demo (step 10 in progress) |
| `/backend/mes/operator?kiosk=1&nest=WC-PAINT-02` | Paint nest |
| `/backend/mes/operator?kiosk=1&nest=WC-PACK-03` | Pack-out |
| `/backend/mes/operator/raw-materials?kiosk=1&nest=WC-ASSY-01` | Replenishment form |
| `/backend/mes/operator?kiosk=1&live=1` | Legacy API queue (out of kiosk suite) |
| `/backend/mes/operator?kiosk=1&nest=WC-ASSY-01&debug=1` | Service links visible |

## Storage reset (automated)

Playwright uses `presetKioskClientStorage()` in `__integration__/helpers/kioskStorage.ts`:

- `localStorage.mes_kiosk_onboarding_v1 = '1'` — skip onboarding (unless testing onboarding)
- `localStorage.mes_kiosk_nest_v1` — nest bookmark
- Clears `sessionStorage` keys `mes_kiosk_ops_v1_*` — fresh mock queue

## `data-testid` contract

| ID | Element |
|----|---------|
| `mes-kiosk-shell` | Fullscreen terminal wrapper |
| `mes-kiosk-demo-banner` | TRYB POKAZOWY banner |
| `mes-kiosk-onboarding` | Onboarding overlay |
| `mes-kiosk-onboard-skip` / `mes-kiosk-onboard-done` | Onboarding actions |
| `mes-kiosk-now-card` | Primary “Do this now” card |
| `mes-kiosk-start-demo` / `mes-kiosk-complete-demo` | Demo actions |
| `mes-kiosk-complete-dialog` / `mes-kiosk-confirm-complete` | Complete confirmation |
| `mes-kiosk-order-materials` | Link to raw materials |
| `mes-kiosk-andon-short` / `mes-kiosk-andon-dialog` / `mes-kiosk-andon-{reason}` | Andon |
| `mes-kiosk-scan-input` | Bottom scan field |
| `mes-kiosk-plan-toggle` / `mes-kiosk-plan-strip` | Plan horizon UI |
| `mes-kiosk-change-nest` / `mes-kiosk-nest-{code}` | Nest switcher (service) |
| `mes-kiosk-rm-*` | Raw materials kiosk form |

## Scenario map

| ID | Playwright | Manual scenario |
|----|------------|-----------------|
| TC-MES-KIOSK-001 | `TC-MES-KIOSK-001-shell-onboarding.spec.ts` | `scenarios/TC-MES-KIOSK-001-kiosk-shell-onboarding.md` |
| TC-MES-KIOSK-002 | `TC-MES-KIOSK-002-complete-and-andon.spec.ts` | `scenarios/TC-MES-KIOSK-002-kiosk-complete-andon.md` |
| TC-MES-KIOSK-003 | `TC-MES-KIOSK-003-raw-materials-nest.spec.ts` | `scenarios/TC-MES-KIOSK-003-raw-materials-nest.md` |

## Known limits (do not fail tests for)

- Mock only: Start/Complete do not call MES APIs.
- `&live=1` is a separate code path — not covered by kiosk integration suite.
- Jest in some cloud sandboxes may fail on `ts-jest`/yarn; run locally or in CI with project toolchain.

## Handoff checklist

- [ ] Unit tests pass
- [ ] `OM_INTEGRATION_MODULES=mes yarn test:integration` pass with dev server up
- [ ] Manual TC-MES-KIOSK-001..003 on 768px viewport
- [ ] PR description lists URLs and commands above
