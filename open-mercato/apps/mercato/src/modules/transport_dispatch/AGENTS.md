# Transport Dispatch — AGENTS

**Module:** `transport_dispatch` · **IFS → kiosk → dual transport lists**

## Operator formats (separate routes)

| Format | URL | When |
|--------|-----|------|
| A | `/backend/transport_dispatch/format-a` | No/missing load data from IFS |
| B | `/backend/transport_dispatch/format-b` | Mixed packages + pallets |

## Plug your list generator

Your existing tool: implement `registerExternalListGenerator()` from `lib/list-generator.ts` and set `TRANSPORT_LIST_GENERATOR=external` at boot (e.g. in `di.ts` when added).

Built-in generator writes `TransportManifest.payloadJson` with lines per list.

## IFS import

`POST /api/transport_dispatch/ifs/pull` — sample fixture if no body. Replace with real IFS client in `afsu_bridge` module later.

## Entities

- `TransportSourceConsignment` — IFS row
- `TransportDispatchOrder` — dyspozycja per expedition
- `TransportManifest` — lista transportowa output

## Tests

`yarn test --testPathPatterns=transport_dispatch/lib/__tests__`
