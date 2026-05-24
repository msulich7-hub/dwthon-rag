# Mercato-only max slice (bez IFS JDBC)

**Data:** 2026-05-25  
**Cel:** Maksymalna parity na danych fixture + silver pilot, bez `CUSTOMER_ORDER_LINE` / JDBC IFS.

## Zaimplementowano

| Obszar | Co |
|--------|-----|
| **M2 BOM 6 poz.** | `bom-catalog.ts`, `resolve-variant-tree.ts`, `explode.ts` do 6 leveli |
| **Netting** | incremental mode, skip pool MO, variant resolution JSON, silver bootstrap |
| **Silver** | `bootstrapGenesisFromSilver`, qty reconcile, SoR guard pool MO |
| **UI** | Hindsight chaos premium, Pool workbench, Genesis akcje rozszerzone |
| **Gantt** | Scenariusz B panel w Scenario Lab |
| **M4 lite** | `chaos-premium.ts`, `hindsight/overview` API + strona |
| **Control tower** | Wyjątki `genesis_empty`, `silver_stale` |
| **CLI** | `run-pipeline`, `run-netting`, `run-extract` |

## Pipeline CLI (fixture)

```bash
mercato production_planning run-pipeline --org=<uuid> --tenant=<uuid> --preset=benchmark
```

Kolejność: seed → silver extract → reconcile → bootstrap genesis → netting full.

## Kolejny slice (bez ETL) — delta replan & anti-fantasy

| Element | Opis |
|---------|------|
| **Delta replan** | `POST /api/production_planning/delta-replan` — incremental netting + CP-SAT |
| **Anti-fantasy** | AF-01 overload, AF-02 overlap, AF-03 unscheduled backlog |
| **Supply snapshot** | `GET .../mrp/supply-snapshot` — WIP/receipts z MO Mercato |
| **Net requirements** | W drzewie genesis: gross/supply/net per węzeł |
| **SO pegging** | `GET .../sales-orders/:id/pegging` + widget na zamówieniu |
| **AI tools** | `anti_fantasy_validate`, `hindsight_chaos` |
| **CLI** | `run-delta-replan` |

## Nadal wymaga IFS / ETL

- JDBC/CDC, prawdziwe `demand_code` / `supply_code`
- On-hand z magazynu (nie derived z MO)
- Plan attainment vs `MANUF_OPERATION_FEEDBACK`
- Roczny backfill 365d z IFS actuals
- Alt routing / BOM effectivity z IFS revision tables

## Możliwe dalej bez ETL (marginalny zysk)

- Eksport CSV Gantt, rolling 600+ benchmark harness w CI
- Tournament auto-run wszystkich 36 WIF na fixture (długi CPU)
- Powiadomienia SSE po netting/optimize
- Kalendarze zmianowe WC (mock JSON per org)
