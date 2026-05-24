# Prompt startowy — moduł `sales_forecasting` (osobne okno agenta)

Skopiuj całość sekcji **„PROMPT DO WKLEJENIA”** poniżej do nowego czatu Cloud Agent / Cursor.

---

## PROMPT DO WKLEJENIA

```markdown
# Zadanie: nowy moduł Open Mercato — prognozowanie sprzedaży (`sales_forecasting`)

## Kontekst biznesowy

Budujemy **moduł prognozowania sprzedaży** w aplikacji Mercato (`apps/mercato`), powiązany z istniejącym modułem **planowania produkcji** (`production_planning`) i standardowym modułem **sales**.

**Cel 2027:** Class A demand planning (parity o9 IBP / SAP IBP demand / Kinaxis) — consensus forecast, wersje scenariuszy, propagacja popytu do MRP i CP-SAT, bez zastępowania ERP (Oracle IFS9 = SoR operacyjny w docelowej architekturze).

**Repozytorium:** `msulich7-hub/dwthon-rag` · workspace `open-mercato/`

## Zasady Open Mercato (OBOWIĄZKOWE)

Przeczytaj i stosuj **przed kodem**:

1. `open-mercato/AGENTS.md` — Task Router (module dev, API, ACL, events, widgets, queue)
2. `open-mercato/packages/core/AGENTS.md` — CRUD, setup, migracje, auto-discovery
3. `open-mercato/packages/core/src/modules/sales/AGENTS.md` — zamówienia, kanały, NIE liczyć cen inline
4. `open-mercato/.ai/specs/AGENTS.md` — najpierw spec, potem kod
5. Wzorzec modułu app: `apps/mercato/src/modules/crm_2027/` + `apps/mercato/src/modules/production_planning/`

### Twarde ograniczenia

- **NIE edytuj** `packages/core`, `packages/ui`, `packages/ai-assistant` ani innych pakietów platformy.
- Moduł **tylko** w `apps/mercato/src/modules/sales_forecasting/`
- Rejestracja **tylko** w `apps/mercato/src/modules.ts`: `{ id: 'sales_forecasting', from: '@app' }`
- Integracja z sales przez **command bus**, **UMES injection**, **response enrichers** — nie duplikuj encji zamówień
- Tenant + organization scope na wszystkich encjach i API
- i18n `en` + `pl`, DS Guardian na UI

## Moduły powiązane (kontrakty integracji)

### `production_planning` (już w repo)

| Artefakt | Ścieżka |
|----------|---------|
| Master plan v2 | `.ai/specs/2026-05-24-production-planning-master-plan.md` |
| What-if catalog | `.ai/specs/2026-05-24-production-planning-what-if-scenario-catalog.md` |
| PR foundation | branch `cursor/production-planning-foundation-f6a1` |
| PR scenario engine | branch `cursor/planning-scenarios-engine-4528` |

**Kierunek danych demand → supply:**

```
sales_forecasting (forecast buckets)
    → production_planning M2 netting (gross req, time buckets)
    → what-if T-02 / BND-SOP (demand shock ±20%)
    → CP-SAT optimize / scenarios
```

**Kontrakt docelowy (zaimplementuj w F1):**

- Event: `sales_forecasting.forecast.published` — payload: `{ tenantId, organizationId, horizon, buckets[] }`
- API read dla production_planning: `GET /api/sales_forecasting/demand-export?from=&to=&sku=`
- Scenariusz what-if `T-02` ma czytać **published forecast version**, nie hardcoded +20%

### `sales` (core)

- Źródło **actuals**: historyczne `sales.orders` / linie (agregacja do bucketów)
- Injection: zakładka „Prognoza” na `sales.document.detail.order` lub osobna strona SKU/family
- NIE twórz duplikatu encji Order — linkuj `salesOrderId` / `productSku` / catalog product id

### IFS9 (przyszłość, F0)

- Read-only staging jak w M1 production plan — forecast może być **importowany** z IFS, ale Mercato jest miejscem consensus i wersjonowania

## Zakres modułu `sales_forecasting` — proponowany podział

### Moduł SF — 5 bloków (spec + implementacja fazowa)

| Blok | Kroki | Deliverable |
|------|-------|-------------|
| **SF1** Data & actuals | 1–15 | Historia sprzedaży 365d, bucket dzień/tydzień, SKU hierarchy |
| **SF2** Statistical + manual | 16–30 | Baseline forecast (MA/ETS lub stub), override planisty |
| **SF3** Consensus & versions | 31–45 | Wersje scenariuszy (base/upside/downside), publish, compare |
| **SF4** Integracja APS | 46–55 | Export do production_planning, event bus, what-if feed |
| **SF5** UI & governance | 56–65 | Grid forecast, waterfall actual→forecast, ACL, runbook |

**North Star SF:** consensus forecast w **&lt;15 min** po zmianie actuals; publish propaguje do netting **&lt;15 min** (concurrent planning parity).

## Pierwsza iteracja (MVP — zrób w tym oknie)

### Faza 0 — spec (PR 1, docs only lub docs + szkielet)

1. Utwórz `.ai/specs/2026-05-24-sales-forecasting-module-foundation.md` z:
   - ERD: `sales_forecasting_versions`, `sales_forecasting_buckets`, `sales_forecasting_overrides`
   - API lista
   - Eventy modułu (`createModuleEvents`)
   - Macierz integracji z `production_planning` + `sales`
   - KPI: MAPE, bias, forecast value vs actual
2. Utwórz `apps/mercato/src/modules/sales_forecasting/AGENTS.md`
3. Branch: `cursor/sales-forecasting-foundation-4528`

### Faza 1 — fundament kodu (PR 2)

Scaffold modułu (wzoruj się na `production_planning` + `crm_2027`):

```
sales_forecasting/
  index.ts, setup.ts, acl.ts, events.ts, notifications.ts
  data/entities.ts, data/validators.ts
  migrations/Migration..._foundation.ts
  lib/actuals-aggregator.ts      # z sales history → buckets
  lib/forecast-version-service.ts
  lib/demand-export.ts            # feed dla production_planning
  api/versions/route.ts
  api/versions/[versionId]/publish/route.ts
  api/buckets/route.ts
  api/demand-export/route.ts
  backend/sales_forecasting/page.tsx + page.meta.ts
  widgets/injection/...
  i18n/en.json, pl.json
```

**ACL:**

- `sales_forecasting.view`
- `sales_forecasting.manage`
- `sales_forecasting.publish` (consensus sign-off)

**Minimalne API:**

- `GET /api/sales_forecasting/versions` — lista wersji (draft/published)
- `POST /api/sales_forecasting/versions` — nowa wersja (clone from actuals lub poprzednia)
- `PATCH /api/sales_forecasting/buckets` — bulk update qty planowanych
- `POST /api/sales_forecasting/versions/[id]/publish` — emit event + lock version
- `GET /api/sales_forecasting/demand-export` — JSON dla production_planning / what-if

**UI v0:**

- Strona `/backend/sales_forecasting` — tabela SKU × tygodnie, actual vs forecast
- Link w sidebar (`menu:sidebar:main`)

### Faza 2 — powiązanie z production_planning (PR 3)

- W `production_planning`: subscriber na `sales_forecasting.forecast.published`
- Rozszerz `what-if-resolver` / `T-02` o `forecastVersionId` zamiast statycznego +20%
- Dokumentuj w obu AGENTS.md

## Wymagania techniczne

- MikroORM entities + migracje w module (nie w core)
- Walidacja Zod w `data/validators.ts`
- Testy jednostkowe: `lib/__tests__/actuals-aggregator.test.ts`, `demand-export.test.ts`
- Queue worker opcjonalnie: `workers/recompute-baseline.ts` (nightly)
- **Propose-only** nie dotyczy forecast — publish jest świadomą akcją z ACL `publish`

## Market parity (maj 2026 → cel 2027)

| Vendor | Co odwzorować |
|--------|----------------|
| o9 | Consensus demand, wersje scenariuszy, Digital Brain feed |
| SAP IBP | Time-series buckets w harmonized area, publish do supply |
| Kinaxis | Concurrent refresh po zmianie actuals |
| Mercato unique | Ten sam `plan_scenarios` compare co production — **spójny ID wersji** forecast ↔ what-if |

## Git / PR

- Prefix branchy: `cursor/sales-forecasting-*-4528`
- Base: `main` lub `cursor/production-planning-foundation-f6a1` jeśli integracja od razu
- Commit messages: pełne zdania, po angielsku
- PR draft, opis z tabelą API i diagramem integracji
- Po implementacji: `yarn test` w scope modułu

## Kolejność pracy (dla agenta)

1. Przeczytaj AGENTS.md (root, core, sales, production_planning)
2. Napisz spec foundation + integration contract
3. Scaffold moduł + migracja + ACL + setup
4. Actuals aggregator (read-only z sales)
5. Versions + buckets CRUD + publish event
6. demand-export API
7. UI minimal + testy
8. PR; potem osobny task na subscriber w production_planning

## Nie rób w pierwszej iteracji

- Pełnego ML (Prophet/LSTM) — stub baseline wystarczy
- Zapisu do IFS
- Finansowego IBP (P&L reconcile)
- Duplikacji modułu sales orders

## Sukces pierwszej iteracji

- [ ] Moduł zarejestrowany, migracja działa
- [ ] Widać actuals + edytowalny forecast na 12–52 tygodni
- [ ] Publish emituje event i `demand-export` zwraca dane dla 1 SKU
- [ ] Spec + AGENTS.md opisują kontrakt z `production_planning`
- [ ] Testy przechodzą

Zacznij od spec foundation, pokaż ERD i listę endpointów do akceptacji, potem implementuj Fazę 1.
```

---

## Notatki dla zespołu

- Ten prompt zakłada kontynuację w **nowym oknie** bez historii czatu production_planning.
- Jeśli integracja ma być od razu, ustaw **base branch** PR na `cursor/planning-scenarios-engine-4528` lub `cursor/production-planning-foundation-f6a1`.
- Plik katalogu what-if: `apps/mercato/src/modules/production_planning/data/what-if-scenarios.registry.json` — szablon `T-02` czeka na podłączenie forecast API.
