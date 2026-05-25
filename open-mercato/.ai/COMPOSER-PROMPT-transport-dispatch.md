# Composer 2.5 — Transport Dispatch module (copy-paste prompt)

Use this prompt on a **local Open Mercato** workspace after pulling specs from GitHub.

---

## Prompt

You are implementing **one new Open Mercato app module** `transport_dispatch` with **two separate kiosk formats**. Read these specs first (in repo):

- `.ai/specs/2027-05-24-transport-dispatch-product-foundation.md`
- `.ai/specs/2027-05-24-transport-format-a-complement-kiosk.md`
- `.ai/specs/2027-05-24-transport-format-b-split-dispatch-kiosk.md`
- `apps/mercato/src/modules/transport_dispatch/AGENTS.md`

**Template:** mirror `apps/mercato/src/modules/crm_2027/` (index, acl, setup, events, commands, migrations, api, backend pages, i18n pl+en).

### Hard requirements

1. Register `{ id: 'transport_dispatch', from: '@app' }` in `apps/mercato/src/modules.ts`.
2. **Two formats = two route trees** — never one combined operator screen:
   - Format A: `/backend/transport_dispatch/format-a` (+ `[id]` detail)
   - Format B: `/backend/transport_dispatch/format-b` (+ `[id]` detail)
   - Hub: `/backend/transport_dispatch` with **two large tiles** and queue counts.
3. Domain names:
   - `SourceConsignment` — AFSU inbound (not `SalesShipment`)
   - `LoadUnitLine` — package or pallet + qty
   - **`DispatchOrder`** — split output per expedition
   - `TransportManifest` — generated list stub (JSON ok v1)
4. **Kiosk UX:** min 48px targets, tile grids with `+`/`−` steppers, sticky footer **Generuj**, no dropdowns for load types. Seed 5 package + 10 pallet types in module config/JSON.
5. Format A: TAK/NIE complement when unknown; pick packages AND pallets; optional single manifest (skip “2 listy” unless flag).
6. Format B: queue shows `30 nieprzetworzonych / 27 mieszanych`; two-column split packages→expedition X, pallets→expedition Y; editable pallet subtypes; **no auto-split algorithm** — manual only, log choices for future ML.
7. Do **not** modify `packages/core`. Stub AFSU data via `fixtures/afsu-consignments.json` + seed command.
8. Commands: `transport_dispatch.format_a.complete`, `transport_dispatch.format_b.complete`.
9. Tests: unit tests for queue filters (A excludes mixed; B includes mixed).
10. Branch: `cursor/transport-dispatch-phase-1-f6a1`, commit, draft PR.

### Out of scope for this task

- Real AFSU API
- PDF print templates
- Modules `afsu_bridge`, `load_unit_catalog`, `transport_manifest_export` (spec only)

When unsure, prefer **simplicity and kiosk speed** over feature breadth.

---

## Verification

```bash
cd open-mercato/apps/mercato
yarn generate
yarn db:migrate
# open /backend/transport_dispatch — two tiles visible
yarn test --testPathPatterns=transport_dispatch
```
