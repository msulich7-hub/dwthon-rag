# Raport audytu integracji — 5 obszarów app

> **Status:** WYPEŁNIONY — audyt read-only, bez implementacji poprawek.  
> **Brief:** `2026-05-26-all-app-modules-integration-audit-brief.md`

**Data audytu:** 2026-05-24 UTC  
**Audytor:** orchestrator + subagenci A-F (Composer 2.5)  
**Gałęzie przejrzane:**

- `origin/cursor/all-modules-integration-audit-spec-4528` — brief + szablon raportu + stan audytowy `crm_2027`/`production_planning`
- `origin/cursor/planning-mercato-max-4528` — M2 `production_planning`
- `origin/cursor/helpdesk-module-6a78` — M3 `helpdesk`
- `origin/cursor/crm-2027-phase-3-meetings-f6a1` — M1 `crm_2027` phase-3 + M4 `call_transcripts`

---

## Werdykt globalny

**INTEGRATION GO z warunkami** — architektura modułów jest spójna i nie ma fundamentalnego konfliktu SoR/command bus/webhooków, ale integracja "razem" wymaga merge kilku gałęzi oraz ręcznego scalenia `modules.ts`; M5 pozostaje tylko specyfikacją i blokuje wyłącznie XC-04.

**Warunki obowiązkowe, aby przejść z "GO z warunkami" do "INTEGRATION GO":**

1. Zmergować `crm-2027-phase-3-meetings-f6a1` jako jednostkę M1+M4, bo canonical webhooki/STT i bridge do CRM istnieją tylko razem z `call_transcripts`.
2. Zbudować jeden docelowy `modules.ts` z wpisami `crm_2027`, `call_transcripts`, `production_planning`, `helpdesk` (`sales_forecasting` dopiero po osobnym PR).
3. Przyjąć `planning-mercato-max-4528` jako bazę kodową M2 i rozwiązać konflikty CRM/webhooków na korzyść gałęzi meetings.
4. Domknąć P1 kontraktów: `sales.orders.get` dla pełnego WF-10, spójność T-02 `forecastUpliftPct`/`forecastDeltaPct`, konfiguracja webhook secrets.

Nie ma podstaw do **INTEGRATION NO-GO**: nie stwierdzono duplikacji encji core `customers`/`sales`, kolizji queue/event IDs ani niemożliwego merge migracji. Ryzyko jest głównie integracyjno-organizacyjne: rozproszony kod na gałęziach, wzajemnie wykluczające wpisy w `modules.ts`, brak pojedynczej gałęzi z pełnym zestawem.

---

## Werdykty per moduł

| Moduł | Werdykt | Najważniejsza luka |
|-------|---------|-------------------|
| M1 `crm_2027` | **GO z warunkami** | CRM-1..5 są domknięte wewnętrznie, ale bridge M4 (`call-transcript-deal-bridge`, STT -> ingest, deprecated webhooks) istnieje tylko na `crm-2027-phase-3-meetings-f6a1`. |
| M2 `production_planning` | **GO z warunkami** | WF-1..9 działają, testy zielone; WF-10 jest częściowy, bo pełna integracja z core `sales` wymaga brakującego command `sales.orders.get`. |
| M3 `helpdesk` | **GO z warunkami** | WF-HD-1..7 są gotowe dla MVP; luki P1 to assign picker, portal notify, schedule SLA dla istniejących tenantów i konflikt `modules.ts`. |
| M4 `call_transcripts` | **GO z warunkami** | CT-1..5 są zaimplementowane na meetings; M4 musi być włączony razem z M1, bo M1-only po tej gałęzi nie degraduje STT/webhooków poprawnie. |
| M5 `sales_forecasting` (spec) | **SPEC GAP** | Brak kodu modułu; starter opisuje event/API, ale brakuje foundation spec, AGENTS.md i formalnych schematów payloadów; M2 nie ma hooków konsumenta. |

---

## Macierz INT

| INT | Status | Dowód (gałąź / plik) |
|-----|--------|----------------------|
| INT-01 `customers` -> M1 CRM | **Zaimplementowane** | `crm_2027` używa `customers.interactions.create` w `lib/meeting-interaction.ts` i `lib/voice-execute.ts`; własne tabele tylko analityczne (`crm_2027_deal_meetings`, risk flags). Gałęzie: planning/meetings. |
| INT-02 M4 -> `customers` | **Zaimplementowane** | `call_transcripts/lib/project-interaction.ts` tworzy interaction `interactionType: call` przez command bus. Gałąź: `crm-2027-phase-3-meetings-f6a1`. |
| INT-03 M4 -> M1 | **Zaimplementowane na meetings / Brak na audytowej** | Event `call_transcripts.transcript.ingested` + `crm_2027/subscribers/call-transcript-deal-bridge.ts` na meetings; brak katalogu M4 i subscribera na `all-modules-integration-audit-spec-4528`. |
| INT-04 M1 -> M4 | **Częściowo** | Na meetings STT i deprecated CRM webhooks delegują do `call_transcripts.ingest`; audio-only STT zwraca 501. Na audytowej CRM webhooki nadal idą osobną ścieżką `ingestProviderMeeting`. |
| INT-05 M3 -> `customers` | **Zaimplementowane** | `helpdesk/widgets/injection-table.ts` i widget `customer-tickets`; `lib/customer-context.ts` waliduje core `CustomerEntity`. Gałąź: `helpdesk-module-6a78`. |
| INT-06 M3 <-> M1 | **Brak bezpośredniego API (OK MVP)** | Brak direct kontraktu helpdesk-CRM; wspólnym kontekstem jest `customers`/profil klienta. |
| INT-07 M2 -> `sales` | **Częściowo** | Pegging po `salesOrderId`, API `/sales-orders/{id}/pegging` i widget działają w M2; `sales-order-bridge.ts` woła `sales.orders.get`, którego nie ma w core commands. Gałąź: `planning-mercato-max-4528`. |
| INT-08 M5 -> M2 | **Tylko spec** | `sales_forecasting.forecast.published` i `demand-export` opisane w starter prompt; `git grep` w M2 nie znajduje `sales_forecasting`/`forecast.published`. |
| INT-09 M1 -> M2 | **Brak (świadoma luka produktowa MVP)** | Brak kontraktu pipeline forecast -> APS; brief wskazuje, że brak direct M1-M2 nie jest samodzielnym NO-GO. |
| INT-10 M2 -> M1 | **Brak (OK MVP)** | Brak kontraktu zwrotnego planning -> CRM. |
| INT-11 M3 -> M2 | **Brak (OK MVP)** | Brak kontraktu helpdesk -> planning; brak wpływu na przepływy M1-M4/M2. |
| INT-12 Voice pattern | **Częściowo** | M1 i M3 mają wzorzec `voice-intent` -> `voice-execute`, osobne prefixy API i ACL; brak wspólnego abstraktu, ale zachowanie jest spójne dla MVP. |
| INT-13 Webhook secrets | **Zaimplementowane po merge M4** | `call_transcripts/lib/webhook-verify.ts` ma fallback `CALL_TRANSCRIPTS_*` -> `CRM_2027_*`; canonical route to `/api/call_transcripts/webhooks/*`. |
| INT-14 `modules.ts` | **Częściowo** | Fragmentacja: planning/audyt mają `crm_2027` + `production_planning`; meetings ma `call_transcripts` + `crm_2027`; helpdesk ma `crm_2027` + `helpdesk`. Docelowo trzeba cztery wpisy @app. |
| INT-15 Migracje | **Częściowo / merge-ready z uwagą** | Tabele są rozłączne per moduł; brak kolizji nazw. Uwaga: timestamp `20260523140000` występuje w różnych modułach (CRM/helpdesk), co wymaga normalnego apply wszystkich migracji modułowych, ale nie jest konfliktem SoR. |

---

## XC workflows

### XC-01 Spotkanie Zoom -> transkrypt -> deal risk -> notification

- Kroki wykonane/audytowane: canonical `/api/call_transcripts/webhooks/zoom` -> `call_transcripts.ingest` -> projection do `customers.interactions` -> event `call_transcripts.transcript.ingested` -> `call-transcript-deal-bridge` -> `ingestDealMeeting` -> potencjalne high-risk notification.
- Wynik: **Działa na gałęzi meetings po wspólnym włączeniu M1+M4**. Na audytowej/planning bez M4 łańcuch się urywa; STT audio-only ma 501, ale transcript/webhook bez M4 nie mają pełnej graceful degradation.

### XC-02 Helpdesk + CRM context

- Kroki: `POST /api/helpdesk/ingest` tworzy ticket; widget `customer-tickets` wstrzykuje zakładkę na profilu person/company; CRM kontekst pojawia się przez wspólne `customers`.
- Wynik: **Częściowo**. Ticket + customers tab są gotowe na helpdesk branch; pełny widok "ticket + historia CRM/call" wymaga merge M1/M4/M3 do jednej gałęzi. Brak direct M3<->M1 jest akceptowalny na MVP.

### XC-03 SO -> pegging -> netting -> optimize

- Kroki: M2 seed/netting/pegging/optimize/scenario/control tower; API `sales-orders/{id}/pegging` i widget produkcji na SO.
- Wynik: **Częściowo**. Wewnątrz M2 działa i testy są zielone. Pełny E2E na realnym core SO wymaga brakującego read command `sales.orders.get` albo zmiany kontraktu bridge.

### XC-04 Forecast -> APS (spec)

- Kroki: audyt starter prompt M5, master plan M2 i grep M2 pod `sales_forecasting`, `demand-export`, `forecast.published`.
- Wynik: **Tylko spec / SPEC GAP**. Brak kodu M5, brak subscribera M2, niespójny klucz T-02 (`forecastUpliftPct` vs `forecastDeltaPct`). Nie blokuje merge M1-M4+M2, ale blokuje demand->supply E2E.

### XC-05 Merge simulation

- Proponowana kolejność merge:
  1. `origin/cursor/planning-mercato-max-4528` jako baza integracyjna M2.
  2. `origin/cursor/crm-2027-phase-3-meetings-f6a1` dla M1 phase-3 + M4; konflikty `crm_2027`/webhooków rozstrzygnąć na korzyść meetings.
  3. `origin/cursor/helpdesk-module-6a78` dla M3; zachować nowszy CRM z meetings.
  4. Ręcznie scalić `modules.ts` do jednego zestawu @app.
  5. M5 `sales_forecasting` uruchomić jako osobny stream po foundation spec.
- Konflikty: **`modules.ts` pewny konflikt**; możliwe konflikty w `crm_2027/**` między planning/helpdesk/meetings; webhook routes powinny wygrać w wersji delegującej do M4; migracje/tabele/ACL/queues/event IDs nie pokazują fundamentalnej kolizji.

Docelowy fragment `enabledModules`:

```ts
{ id: 'call_transcripts', from: '@app' },
{ id: 'crm_2027', from: '@app' },
{ id: 'helpdesk', from: '@app' },
{ id: 'production_planning', from: '@app' },
// przyszly osobny PR: { id: 'sales_forecasting', from: '@app' },
```

---

## Merge readiness checklist

| Punkt | Status | Uwagi |
|-------|--------|-------|
| `modules.ts` zawiera `crm_2027`, `call_transcripts`, `production_planning`, `helpdesk` | **Nie teraz / wymagane ręczne scalenie** | Żadna z audytowanych gałęzi nie ma kompletu; branches wzajemnie zastępują wpisy @app. |
| Brak cross-module importów omijających command bus | **Tak, z wyjątkiem akceptowanym** | Deprecated CRM webhook routes importują M4 handler — zgodne z celem deprecacji/canonical route. |
| ACL feature names nie kolidują | **Tak** | Prefiksy `crm_2027.*`, `helpdesk.*`, `call_transcripts.*`, `production_planning.*`. |
| Queue names unikalne | **Tak** | M.in. `crm_2027:risk-scan`, `helpdesk:sla-scan`, `production_planning:capacity-refresh`, `production_planning:cpsat-optimize`. |
| Event IDs globalnie unikalne | **Tak** | Namespace per moduł; M4->M1 event bridge używa `call_transcripts.transcript.ingested`. |
| Duplikacja webhook Zoom/Gong bezpieczna | **Tak po merge M4** | Canonical `/api/call_transcripts/webhooks/*`; CRM routes deprecated z `Link`; idempotencja po provider/external id. |
| Migracje | **Merge-ready z uwagą** | Rozłączne tabele; ten sam timestamp w różnych modułach nie jest konfliktem tabel, ale wymaga standardowego uruchomienia migracji wszystkich modułów. |
| Testy sumaryczne na jednej gałęzi | **Brak** | Testy per-moduł częściowo uruchomione; brak unified branch, więc brak jednego wiarygodnego runa wszystkich ścieżek. |
| AGENTS.md opisuje integracje | **Częściowo** | M1/M4 na meetings mają mapę integracji; M5 nie ma modułu/AGENTS; audytowy M1 nie odzwierciedla jeszcze M4. |

---

## Testy uruchomione

| Moduł | Komenda | Wynik |
|-------|---------|-------|
| `crm_2027` | `yarn test src/modules/crm_2027/lib/__tests__` | **Nie uruchomiono wiarygodnie** — subagent A zgłosił blokadę dependency state (`@mikro-orm/core`/`resolve-from`) na gałęzi audytowej. |
| `production_planning` | `yarn test src/modules/production_planning/lib/__tests__` | **PASS** — 64/64 testów TS, 21 suites. |
| `helpdesk` | `yarn test src/modules/helpdesk/lib/__tests__` na worktree helpdesk | **PASS** — 12/12 suites, 34/34 testów. |
| `call_transcripts` | `yarn test src/modules/call_transcripts/lib/__tests__` na worktree meetings | **PASS** — 2 suites, 4 testy. |
| `ortools` | `python3 -m pytest -q` w `services/ortools-scheduler` | **PASS** — 12/12 testów po instalacji requirements/pytest w worktree subagenta. |

Brak testu "wszystko razem" wynika z braku pojedynczej gałęzi z pełnym stackiem. To jest luka merge-readiness, nie dowód na NO-GO architektury.

---

## Luki priorytetyzowane

| P | Moduł | Opis | Blokuje merge? |
|---|-------|------|----------------|
| P0 | — | Nie znaleziono fundamentalnego P0: brak duplikacji SoR, brak niemożliwego merge migracji, canonical webhook po M4 jest jednoznaczny. | Nie |
| P1 | M1+M4 | `call_transcripts` musi być włączony razem z `crm_2027`; M1-only po meetings może rzucić brak handlera `call_transcripts.ingest` dla transcript/webhook. | **Tak dla globalnego GO** |
| P1 | Platforma | `modules.ts` wymaga ręcznego scalenia czterech modułów @app. | **Tak dla globalnego GO** |
| P1 | M2 | Brak `sales.orders.get` w core — pełny WF-10 z real SO nie jest domknięty. | Nie blokuje merge, blokuje produkcyjny XC-03 z real SO |
| P1 | M2/M5 | T-02 ma niespójność `forecastUpliftPct` vs `forecastDeltaPct`; brak hooków `sales_forecasting`. | Nie blokuje M1-M4+M2, blokuje XC-04 |
| P1 | M5 | Brak foundation spec, AGENTS.md i formalnych schema payloadów. | Nie dla obecnego merge, tak dla pierwszego PR kodu M5 |
| P2 | M3 | Assign picker, portal notification, SLA schedule dla istniejących tenantów. | Nie |
| P2 | M1/M4 | Brak testów integracyjnych bridge/webhook handler; test CRM zablokowany deps. | Nie, ale wymagane przed release confidence |

---

## Rekomendacje PO

1. Zatwierdzić kierunek jako **INTEGRATION GO z warunkami**, nie NO-GO: architektura jest spójna, ale delivery wymaga jednej gałęzi integracyjnej.
2. Priorytetowo scalić M2 -> M1+M4 -> M3 i po merge od razu wykonać ręczne scalenie `modules.ts`.
3. Traktować `call_transcripts` jako obowiązkowy companion dla `crm_2027` phase-3; nie deployować M1-only z nowymi STT/webhook delegations.
4. Nie mieszać M5 z merge M1-M4+M2/M3. Najpierw Faza 0 M5: foundation spec, schema event/API, AGENTS.md, kontrakt T-02.
5. Przed produkcyjnym sign-off uruchomić unified test pack na jednej gałęzi integracyjnej oraz smoke: XC-01 webhook Zoom, XC-02 helpdesk customer tab, XC-03 seed SO -> pegging -> netting -> optimize.

---

## Czy "razem właściwie zrobione"?

**Odpowiedź:** **Częściowo**

Architektonicznie moduły są prowadzone w tym samym stylu platformy: command bus, event bridge, widgets/injection, brak duplikacji core `customers`/`sales`, rozłączne ACL/queue/event namespaces. Kontrakty M1-M4 i M2 są w większości gotowe, a luki mają charakter P1/P2 zamiast fundamentalnego NO-GO. Problemem jest to, że kod jest rozproszony po gałęziach i żadna jedna gałąź nie uruchamia pełnego zestawu; `modules.ts` oraz część CRM/webhooków wymagają świadomego merge. M5 jest nadal kontraktem na papierze, więc pełny demand->supply nie jest jeszcze "razem" gotowy.

---

## Automatyzacja pełnego przebiegu jednym agentem

**Nie** — agent implementacyjny nie może dziś przejść XC-01..XC-03 w jednym środowisku bez ręcznego patchowania/merge.

| XC | Możliwość bez patchowania dziś | Co brakuje |
|----|--------------------------------|------------|
| XC-01 | Nie | Brak pojedynczej gałęzi z M1+M4+docelowym `modules.ts` i skonfigurowanymi webhook secrets. |
| XC-02 | Nie | Wymaga merge M3 z M1/M4 na jednym drzewie; gałąź helpdesk nie zawiera pełnego M4/planning. |
| XC-03 | Częściowo tylko na seedzie M2 | Pełny flow z realnym core SO wymaga `sales.orders.get` albo zmiany kontraktu bridge. |

Po wykonaniu merge planu i scalenia `modules.ts` jeden agent powinien móc przejść XC-01 i XC-02 z konfiguracją env. XC-03 będzie pełny dopiero po domknięciu read contract `sales.orders.get` lub równoważnego adaptera.
