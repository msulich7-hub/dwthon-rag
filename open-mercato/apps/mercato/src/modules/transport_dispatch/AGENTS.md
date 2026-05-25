# Transport Dispatch — module agent guide (scaffold)

**Module id:** `transport_dispatch` · **Status:** SPEC ONLY — not implemented yet  
**Source:** `@app` · **Path:** `apps/mercato/src/modules/transport_dispatch/`

## Read before coding

1. `open-mercato/.ai/specs/2027-05-24-transport-dispatch-product-foundation.md`
2. `open-mercato/.ai/specs/2027-05-24-transport-format-a-complement-kiosk.md` — **FORMAT A** (`complement_kiosk`)
3. `open-mercato/.ai/specs/2027-05-24-transport-format-b-split-dispatch-kiosk.md` — **FORMAT B** (`split_dispatch_kiosk`)
4. `open-mercato/.ai/COMPOSER-PROMPT-transport-dispatch.md` — single-shot implementation prompt

## Critical: two formats, one module

| Format | Route | Do not merge UI |
|--------|-------|-----------------|
| A | `/backend/transport_dispatch/format-a` | Complement + package/pallet pickers |
| B | `/backend/transport_dispatch/format-b` | Split mixed load → expeditions X/Y |

Hub: `/backend/transport_dispatch` — two large tiles only.

## Naming (use in code)

| Concept | Entity / type | Avoid |
|---------|---------------|-------|
| AFSU inbound row | `SourceConsignment` | `SalesShipment`, `CarrierShipment` |
| Package/pallet line | `LoadUnitLine` | `PackageInfo` (carriers) |
| Post-split grouping | **`DispatchOrder`** | `shipment`, `wysyłka` |
| Output doc | `TransportManifest` | — |

## Template module

Copy structure from `apps/mercato/src/modules/crm_2027/`:

- `index.ts`, `acl.ts`, `setup.ts`, `events.ts`, `commands/`, `migrations/`, `api/`, `backend/`, `components/`, `i18n/`

Register in `apps/mercato/src/modules.ts`:

```ts
{ id: 'transport_dispatch', from: '@app' },
```

## Constraints

- **No** `packages/core` edits unless user approves.
- **No** extension of `sales` shipment UI for lista transportowa.
- Kiosk UX: big tiles, steppers, &lt;10s operator path — see Format A/B specs.

## ACL (planned)

- `transport_dispatch.view`
- `transport_dispatch.format_a`
- `transport_dispatch.format_b`
- `transport_dispatch.manage`

## Related future modules (not this folder)

- `afsu_bridge` — ingest
- `load_unit_catalog` — type definitions
- `transport_manifest_export` — PDF/ERP
