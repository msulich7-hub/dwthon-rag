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

## Nadal wymaga IFS

- JDBC/CDC, prawdziwe `demand_code` / `supply_code`
- Plan attainment vs `MANUF_OPERATION_FEEDBACK`
- Roczny backfill 365d z IFS actuals
