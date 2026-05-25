# Transport / AFSU — four-module ideas backlog

| Field | Value |
|---|---|
| **Date** | 2027-05-24 |
| **Status** | Ideas — transform into specs/PRs incrementally |
| **Parent** | [transport_dispatch foundation](./2027-05-24-transport-dispatch-product-foundation.md) |

## Module 1 — `transport_dispatch` (priority)

**Formats A + B**, `DispatchOrder`, kiosk UI.  
Specs: `2027-05-24-transport-format-a-*.md`, `format-b-*.md`.

## Module 2 — `afsu_bridge`

| Idea | Notes |
|------|-------|
| Pull API / SFTP / CSV drop | Normalize → `SourceConsignment` |
| Map `tak`/`nie` → `complement_raw` | Route to Format A vs B |
| Datetime gaps | Flag `requires_format_a` when no complement in feed |
| Idempotent import | Key: `afsu_ref` |

## Module 3 — `load_unit_catalog`

| Idea | Notes |
|------|-------|
| Admin CRUD | 5 package types, 10 pallet types (tenant-scoped) |
| Expedition codes | X, Y, Z dictionaries |
| Icons per type | Kiosk tile images |
| Replace seed JSON | `transport_dispatch` reads catalog via DI |

## Module 4 — `transport_manifest_export`

| Idea | Notes |
|------|-------|
| PDF lista transportowa | Template per tenant |
| CSV / XLSX | Operator download |
| ERP webhook | Post `TransportManifest` |
| Link to `sales` order | Optional `metadata.order_id` only |

## Cross-cutting ideas (GitHub discussion)

- **Barcode scan** on Format A/B to open consignment by `afsu_ref`
- **Shift handover** report: pending counts per format
- **Role**: operator (format_a/b) vs supervisor (manage + undo)
- **Dark mode kiosk** for warehouse lighting
- **Polish-first** copy; EN secondary
- **Algorithm v2** for Format B: train on `split_log` from manual runs
- **Integration** with `workflows` module: manifest approved → notify transport

## OM modules to reuse (read-only)

| Module | Reuse |
|--------|-------|
| `dictionaries` | Expedition codes |
| `workflows` | Approval after Generuj |
| `notifications` | Supervisor alerts on queue > N |
| `integrations` | Marketplace slot for AFSU provider (future) |
| `audit_logs` | DispatchOrder changes |

## Explicit non-goals

- Replacing `shipping_carriers` wizard
- Modeling lista transportowa as `SalesShipment`
