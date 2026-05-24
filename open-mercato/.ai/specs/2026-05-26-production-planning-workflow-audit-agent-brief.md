# Brief audytu: agent weryfikacji workflow — moduł `production_planning`

**Typ zadania:** spec dla **dedykowanego agenta audytowego** (read-only lub z uruchomieniem testów/CLI)  
**Repozytorium:** `msulich7-hub/dwthon-rag` / `open-mercato`  
**Moduł:** `apps/mercato/src/modules/production_planning/`  
**Data briefu:** 2026-05-26  
**Pytanie zamawiającego:** *Czy kod jest napisany tak, że da się przeprowadzić pełny workflow przebiegu (E2E na danych Mercato), a nie tylko luźne endpointy?*

---

## 1. Cel audytu

Agent ma **nie implementować nowych feature’ów**, tylko:

1. Zmapować **wszystkie podsystemy** powstałe w serii PR (#16–#22, gałęzie `cursor/planning-*-4528`).
2. Sprawdzić, czy istnieje **spójny łańcuch przyczynowo-skutkowy** od danych wejściowych do wyniku planistycznego.
3. Wykonać (lub zasymulować krok po kroku) **workflow referencyjne** z tabeli poniżej.
4. Wystawić werdykt: **GO / GO z warunkami / NO-GO** per workflow + lista luk z priorytetem P0/P1/P2.
5. Ocenić jakość integracji (API ↔ lib ↔ UI ↔ CLI ↔ eventy ↔ testy).

**Deliverable:** jeden plik wynikowy:

`open-mercato/.ai/specs/2026-05-26-production-planning-workflow-audit-REPORT.md`

(uzupełniany przez agenta audytowego; ten brief pozostaje zamówieniem).

---

## 2. Kontekst — co powstało (mapa podsystemów)

Moduł **nie jest jednym monolitem** — to warstwy nakładane w kilku iteracjach:

| Warstwa | ID wewn. | Kluczowe ścieżki | PR / temat (orientacyjnie) |
|---------|----------|------------------|----------------------------|
| **Fundament** | M0 | Zlecenia, operacje, capacity | foundation, factory seed #16 |
| **CP-SAT / scenariusze** | M3 | `optimize`, `scenarios/*`, warm-start, multi-objective, SLA | #17 P0 parity |
| **MRP / Genesis** | M2 | `mrp/netting`, `genesis/roots`, pool MO, pegging | #19 M2 Gantt |
| **IFS silver (pilot)** | M1′ | `ifs/extract/*`, tabele silver, reconcile | #20 M1 pilot (Mercato mirror, **nie JDBC**) |
| **Gantt / compare** | M5a | `gantt`, `gantt/compare`, `ScenarioGanttCompare` | #20–#21 |
| **Hindsight** | M4′ | `hindsight/overview`, chaos premium PLN | #22 Mercato-only |
| **Ops / jakość** | M5b | `delta-replan`, `anti-fantasy`, control tower, kalendarze WC | #22 |
| **Integracja SO** | M5c | `sales-orders/.../pegging`, widget injection | #22 |
| **CLI** | — | `seed-factory`, `run-pipeline`, `run-netting`, `run-extract`, `run-delta-replan` | #16, #22 |

**Źródło prawdy kodu:** `production_planning/AGENTS.md`  
**Źródło parity:** `.ai/specs/2026-05-24-production-planning-master-plan.md`  
**Ograniczenie audytu:** workflow **bez ETL IFS** — silver = lustro Mercato; JDBC/CDC to osobna bramka, nie blokuje werdyktu „czy Mercato workflow działa”.

---

## 3. Workflow referencyjne do weryfikacji E2E

Agent **musi** przejść każdy wiersz i opisać: kroki, API/CLI, oczekiwany artefakt, faktyczny wynik, luki.

### WF-1 — Cold start fabryki (dane testowe)

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | `mercato production_planning seed-factory --org=… --tenant=… --preset=small` | MO + operacje + ~30% pegged SO |
| 2 | `GET /api/production_planning/capacity` | `openOrders` > 0, `workCenters` > 0 |
| 3 | Hub UI `/backend/production_planning` | Kafelki prowadzą do podstron |

**Pytanie audytu:** Czy bez seedu reszta workflow ma sensowne komunikaty błędów (genesis_empty, brak danych)?

---

### WF-2 — Planowanie skończonej mocy (CP-SAT)

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | `POST /api/production_planning/optimize` `{ applySync: true }` | `status: completed`, `applied` > 0 |
| 2 | Ponownie `GET /capacity` | Zmiana `plannedStartAt` / utilization |
| 3 | `GET /api/production_planning/anti-fantasy/validate` | Raport AF (passed lub lista violations) |
| 4 | UI Schedule — przyciski CP-SAT + Delta replan | Komunikat sukcesu |

**Zależność:** `ORTOOLS_BRIDGE_URL` → `services/ortools-scheduler`. Jeśli bridge wyłączony — agent opisuje **degradację** (nie myli z brakiem workflow).

---

### WF-3 — MRP: genesis → netting → pool MO

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | `POST /api/production_planning/mrp/netting/runs` `{ mode: "full" }` | `rootsProcessed` > 0, opcjonalnie `poolMoCreated` |
| 2 | `GET /api/production_planning/genesis/roots` | Lista korzeni |
| 3 | `GET /api/production_planning/genesis/roots/{id}` | Drzewo BOM z `parentNodeId`, opcjonalnie net qty |
| 4 | `GET /api/production_planning/mrp/pool-orders` | Pool MO + pegi |
| 5 | UI Genesis — te same akcje | Spójność z API |

**Pytanie audytu:** Czy explode 6-level (`bom-catalog`) faktycznie zwiększa liczbę węzłów vs stary 3-level? Czy incremental netting (`mode: incremental`) przetwarza tylko delta?

---

### WF-4 — Silver pilot (bez IFS): extract → reconcile → bootstrap

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | `POST /api/production_planning/ifs/extract/sync` | `extract.counts`, `reconcile.withinTolerance` |
| 2 | `GET /api/production_planning/ifs/extract/status` | Watermarki per entity |
| 3 | `POST /api/production_planning/mrp/silver/bootstrap` | `rootsCreated` ≥ 0 |
| 4 | Netting po bootstrap | Korzenie `ifs_silver_customer_order_line` |

**Pytanie audytu:** Czy pool MO (`FACTORY-POOL-NET-*`) są **wykluczone** z extract (SoR loop)? Czy reconcile qty działa?

---

### WF-5 — Scenario Lab (what-if) → compare → Gantt

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | `POST /api/production_planning/scenarios/runs` template WIF-01 | Scenariusz `completed` + `kpiSnapshot` |
| 2 | Drugi scenariusz (inny template) | Drugi `scenarioId` |
| 3 | `GET /api/production_planning/scenarios/compare?baseline=…&a=…` | Delta KPI |
| 4 | `GET /api/production_planning/gantt/compare?baselineScenarioId=…&scenarioId=…` | Wspólna oś czasu, diff kinds |
| 5 | UI Scenario Lab | Embedded dual-Gantt + opcjonalnie scenariusz B |

**Pytanie audytu:** Czy `planningStartAt` jest wspólne między baseline a scenariuszem (brak rozjechania osi)?

---

### WF-6 — Hindsight (chaos premium)

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | Po ≥2 ukończonych scenariuszach | — |
| 2 | `GET /api/production_planning/hindsight/overview` | `scenarios[]` z `chaosPremiumPln` |
| 3 | UI `/backend/production_planning/hindsight` | Tabela PLN |

**Pytanie audytu:** Czy bez scenariuszy UI/API zwraca pusty stan bez crash?

---

### WF-7 — Control tower

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | `GET /api/production_planning/control-tower/overview` | KPI |
| 2 | `GET /api/production_planning/control-tower/exceptions` | late, overload, genesis_empty, silver_stale, anti_fantasy |
| 3 | UI control-tower | Zgodność z API |

---

### WF-8 — Delta replan (concurrent slice)

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | `POST /api/production_planning/delta-replan` | netting incremental + optimize + antiFantasy |
| 2 | `mercato production_planning run-delta-replan --org=… --tenant=…` | JSON jak API |
| 3 | Event `production_planning.netting.completed` | Subscriber → notification (jeśli notifications włączone) |

---

### WF-9 — Pipeline CLI jednym strzałem

```bash
mercato production_planning run-pipeline --org=<uuid> --tenant=<uuid> --preset=small --force
```

**Oczekiwany wynik:** JSON z extract, reconcile, netting, hindsight (scenarios może być 0 jeśli brak scenariuszy).

**Pytanie audytu:** Czy kolejność kroków w `run-pipeline` jest logiczna i idempotentna przy `--force`?

---

### WF-10 — Integracja sprzedaż (SO)

| Krok | Akcja | Oczekiwany wynik |
|------|--------|------------------|
| 1 | Znaleźć `salesOrderId` z seeda (pegged MO) | UUID |
| 2 | `GET /api/production_planning/sales-orders/{id}/production` | Lista MO |
| 3 | `GET /api/production_planning/sales-orders/{id}/pegging` | genesisRoots + peggingLinks |
| 4 | Widget na SO (jeśli UI dostępne) | Sekcja pegging |

---

## 4. Macierz „czy workflow jest domknięty w kodzie”

Agent wypełnia tabelę (Tak / Częściowo / Nie + 1 zdanie dowodu):

| WF | API | Lib (logika) | UI | CLI | Testy jednostkowe | E2E / manual |
|----|-----|--------------|-----|-----|-------------------|--------------|
| WF-1 | | | | | | |
| WF-2 | | | | | | |
| WF-3 | | | | | | |
| WF-4 | | | | | | |
| WF-5 | | | | | | |
| WF-6 | | | | | | |
| WF-7 | | | | | | |
| WF-8 | | | | | | |
| WF-9 | | | | | | |
| WF-10 | | | | | | |

**Definicja „Tak”:** da się przejść workflow na org/tenant z seedem `small` bez ręcznych poprawek DB i bez edycji `packages/core`.

---

## 5. Checklist techniczny (agent code review)

### 5.1 Spójność danych

- [ ] Encje MikroORM zgadzają się z migracjami (`Migration20260523*` … `Migration20260525180000*`).
- [ ] Stable UUID (`stable-uuid.ts`) — brak kolizji między genesis / pool / peg.
- [ ] Pool MO nie trafiają do silver extract (`isPoolNettingOrderCode`).
- [ ] Netting nie przetwarza pool MO jako korzeni popytu.

### 5.2 API

- [ ] Każda route ma `metadata` + `requireFeatures` spójne z `acl.ts`.
- [ ] Błędy 400/404 sensowne (brak org scope, brak scenariusza).
- [ ] OpenAPI / tagi `production_planning` (jeśli generator używany).

### 5.3 UI

- [ ] Wszystkie `PP_ROUTES.*` mają `page.tsx` + `page.meta.ts`.
- [ ] Hub linkuje do: orders, schedule, scenarios, gantt, control-tower, genesis, pool-workbench, hindsight.
- [ ] Scenario Lab: compare KPI → dual Gantt lazy load (nie blokuje przy błędzie Gantt).
- [ ] Loading / error states na każdej stronie.

### 5.4 Zdarzenia i powiadomienia

- [ ] `events.ts` — zdarzenia emitowane w miejscu użycia (netting completed, optimize completed).
- [ ] `subscribers/*` — metadata.event zgodne z emit.
- [ ] `notifications.ts` — typy + klucze i18n w `i18n/en.json`.

### 5.5 Testy

Uruchomić:

```bash
cd open-mercato/apps/mercato
yarn test src/modules/production_planning/lib/__tests__
cd open-mercato/services/ortools-scheduler && python3 -m pytest -q
```

- [ ] Ostatni znany stan: **64/64** testów TS modułu (agent podaje aktualną liczbę).
- [ ] Czy testy pokrywają **łańcuch** (pipeline fixture, gantt compare, reconcile), nie tylko funkcje izolowane?
- [ ] Brak testów E2E Playwright dla workflow — **zgłosić jako lukę P2**, nie jako NO-GO samego kodu.

### 5.6 Zależności zewnętrzne

| Zależność | Wpływ na werdykt workflow |
|-----------|-------------------------|
| OR-Tools bridge | WF-2, WF-5, WF-8 wymagają bridge lub jawnej degradacji |
| Postgres + migracje | Wszystkie WF |
| Moduł `sales` | WF-10 (command bus SO summary) |
| Notifications core | Subscribers WF-8 — opcjonalne |

---

## 6. Znane ograniczenia (nie traktować jako bug workflow Mercato)

Agent **nie oznacza** jako P0 failure:

- Brak JDBC/CDC IFS — zamierzone; silver = `mercato_pilot`.
- Chaos premium bez actuals IFS — metodologia `mercato_fixture_v1`.
- Supply on-hand z derived MO — nie magazyn ERP.
- Brak 36 scenariuszy turniejowych w jednym kliknięciu.

---

## 7. Kryteria werdyktu końcowego

W REPORT agent wybiera **jedną** z opcji:

### A) **WORKFLOW GO (Mercato sandbox)**

> Da się przeprowadzić WF-1…WF-9 (oraz WF-10 jeśli sales dostępny) na seedzie `small`/`medium` z dokumentowanymi krokami; luki są kosmetyczne lub wymagają tylko konfiguracji (bridge URL).

### B) **WORKFLOW GO z warunkami**

> Główny przebieg działa, ale są 1–3 blokery konfiguracyjne lub luki API/UI (wymienić z P0).

### C) **WORKFLOW NO-GO**

> Łańcuch się rwie (np. netting nie tworzy korzeni, compare Gantt zawsze puste, reconcile zawsze fail mimo zgodnych danych).

**Osobna sekcja:** „Czy da się **automatyzować** pełny przebieg jednym agentem implementacyjnym?” — ocena gotowości CLI `run-pipeline` + brakujących kroków (np. auto-scenariusz WIF-01 w pipeline).

---

## 8. Instrukcje dla agenta audytowego

### 8.1 Tryb pracy

1. Przeczytać `production_planning/AGENTS.md` i ten brief.
2. Przejrzeć diff gałęzi `cursor/planning-mercato-max-4528` względem `master` (lub stack PR #16→#22).
3. Dla każdego WF: prześledzić call graph (UI → API → lib → entities).
4. Uruchomić testy (sekcja 5.5).
5. Jeśli środowisko pozwala: wykonać CLI `run-pipeline` na znanych UUID testowych lub opisać brak env.
6. Zapisać REPORT według szablonu (sekcja 9).

### 8.2 Czego unikać

- Nie proponować refaktoru `packages/core`.
- Nie wymagać IFS JDBC do werdyktu Mercato workflow.
- Nie mylić „brak UI dla JDBC” z „workflow nie działa”.

### 8.3 Opcjonalnie: subagent explore

Można delegować równolegle:

- **Agent A:** M2/M1 silver/netting/genesis  
- **Agent B:** M3/M5 scenarios/gantt/optimize  
- **Agent C:** CLI, testy, migracje  

Scalenie w jednym REPORT.

---

## 9. Szablon pliku REPORT (do wypełnienia przez agenta)

```markdown
# Raport audytu workflow — production_planning

**Data audytu:** …  
**Gałąź / PR:** …  
**Audytor:** agent …

## Werdykt skrócony

[ A | B | C ] — jedno zdanie.

## Macierz WF (sekcja 4)

(wypełniona)

## Najważniejsze dowody E2E

### WF-… (nazwa)
- Kroki wykonane: …
- Wynik: …
- Dowód: log / JSON / ścieżka pliku

## Luki (priorytetyzowane)

| P | Opis | WF | Sugestia naprawy |
|---|------|-----|------------------|

## Mocne strony architektury

- …

## Czy workflow nadaje się do automatyzacji agentem?

[Tak/Nie] — …

## Rekomendacje dla PO

1. …
```

---

## 10. Powiązane dokumenty

| Dokument | Rola |
|----------|------|
| `2026-05-26-all-app-modules-integration-audit-brief.md` | Audyt 5 obszarów (CRM, planning, helpdesk, transcripts, SF spec) — orchestrator + subagenci |
| `2026-05-24-production-planning-master-plan.md` | 100 kroków, bramki F0–F4 |
| `2026-05-25-production-planning-expert-debate-m1-gantt.md` | Decyzje M1 + dual-Gantt |
| `2026-05-25-production-planning-mercato-only-max-slice.md` | Zakres bez ETL |
| `2026-05-23-production-planning-cpsat-ortools.md` | Solver |

---

## 11. Prompt startowy (copy-paste dla agenta)

```
Jesteś agentem audytowym workflow modułu production_planning w repo dwthon-rag/open-mercato.

Przeczytaj i wykonaj:
open-mercato/.ai/specs/2026-05-26-production-planning-workflow-audit-agent-brief.md

Deliverable:
open-mercato/.ai/specs/2026-05-26-production-planning-workflow-audit-REPORT.md

Nie implementuj poprawek — tylko audyt. Uruchom testy modułu. Przejdź workflow WF-1…WF-10.
Odpowiedz czy kod pozwala na pełny przebieg na danych Mercato (seed + silver pilot + scenariusze),
czy tylko na izolowane endpointy. Werdykt: GO / GO z warunkami / NO-GO.
```

---

*Brief przygotowany pod zamówienie weryfikacji „czy da się zrobić workflow przebiegu” — nie zastępuje testów akceptacyjnych na środowisku z prawdziwym IFS.*
