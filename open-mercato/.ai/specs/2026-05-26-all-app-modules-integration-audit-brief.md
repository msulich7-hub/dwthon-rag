# Master brief: audyt integracji 5 obszarów app (@app) — orchestrator + subagenci

**Typ:** spec zamówienia dla **agenta-orchestratora** i **5+1 subagentów** (read-only + testy/CLI; bez implementacji poprawek)  
**Repozytorium:** `msulich7-hub/dwthon-rag` · `open-mercato/`  
**Data briefu:** 2026-05-26  
**Pytanie zamawiającego:** *Czy te ~5 rzeczy z ostatnich 2 dni są **razem** właściwie zrobione — architektura modułów, kontrakty między nimi, gotowość merge — a nie tylko jako izolowane paczki na osobnych gałęziach?*

---

## 1. Pięć obszarów audytu

| ID | Obszar | Typ | Gałąź referencyjna (remote) | W `modules.ts` na gałęzi planning |
|----|--------|-----|-----------------------------|-----------------------------------|
| **M1** | `crm_2027` | moduł `@app` | `master` + `origin/cursor/crm-2027-phase-3-meetings-f6a1` | tak |
| **M2** | `production_planning` | moduł `@app` | `origin/cursor/planning-mercato-max-4528` | tak |
| **M3** | `helpdesk` | moduł `@app` | `origin/cursor/helpdesk-module-6a78` | **nie** (osobna gałąź) |
| **M4** | `call_transcripts` | moduł `@app` | `origin/cursor/crm-2027-phase-3-meetings-f6a1` | **nie** |
| **M5** | `sales_forecasting` | **tylko spec** (brak kodu modułu) | `.ai/specs/2026-05-24-sales-forecasting-module-starter-prompt.md` | **nie** |

**Uwaga:** Na jednej gałęzi **nie ma** wszystkich modułów naraz — to jest **świadomy temat audytu** (sekcja 6).

---

## 2. Cel audytu (dwa poziomy)

### 2.1 Poziom modułu (wewnętrzny)

Każdy moduł M1–M4: czy ma domknięty workflow (API ↔ lib ↔ UI ↔ workers/events ↔ testy), zgodnie z własnym `AGENTS.md` i specami.

### 2.2 Poziom platformy (integracja „razem”)

| Pytanie | Oczekiwana odpowiedź w REPORT |
|---------|-------------------------------|
| Czy moduły **nie duplikują** encji core (`customers`, `sales`)? | Tak + dowody (command bus, injection) |
| Czy **kontrakty między modułami** są zaimplementowane, nie tylko w spec? | Macierz INT (sekcja 5) |
| Czy **webhooki / voice / STT** nie rozjechają się (CRM vs call_transcripts)? | Jedna ścieżka canonical + deprecations |
| Czy **demand → supply** (M5 → M2) jest spójny na papierze i gotowy na implementację? | Werdykt spec vs kod M2 |
| Czy da się **zmerge’ować** gałęzie bez konfliktów `modules.ts` / migracji? | Merge readiness (sekcja 7) |

**Deliverable orchestratora:**

`open-mercato/.ai/specs/2026-05-26-all-app-modules-integration-audit-REPORT.md`

(opcjonalnie załączniki per moduł: `...-REPORT-M1-crm.md` itd.)

---

## 3. Orchestrator — rola i plan pracy

### 3.1 Orchestrator NIE implementuje

- Tylko czyta kod, uruchamia testy tam gdzie możliwe, wypełnia REPORT.
- Może delegować **równolegle** subagentów (sekcja 4).
- Scala wyniki w **jeden werdykt integracyjny** (sekcja 8).

### 3.2 Kolejność orchestratora

1. Przeczytać ten brief + `open-mercato/AGENTS.md` + `apps/mercato/src/modules.ts` na **każdej** gałęzi referencyjnej (sekcja 1).
2. Uruchomić subagentów A–E **równolegle** (max 5 Tasków).
3. Uruchomić subagenta **F — Integration** po otrzymaniu skrótów od A–E (lub równolegle z czytaniem `grep` cross-module).
4. Wypełnić macierz INT + XC workflows + merge readiness.
5. Zapisać REPORT + rekomendacje PO (merge order, P0 luki).

### 3.3 Gałęzie — jak audytować rozproszony kod

```bash
# M2 — najpełniejszy planning
git fetch origin cursor/planning-mercato-max-4528
git worktree add /tmp/audit-planning origin/cursor/planning-mercato-max-4528  # opcjonalnie

# M3 helpdesk
git fetch origin cursor/helpdesk-module-6a78
git show origin/cursor/helpdesk-module-6a78:open-mercato/apps/mercato/src/modules.ts

# M4 + M1 rozszerzony (transcripts + CRM bridge)
git fetch origin cursor/crm-2027-phase-3-meetings-f6a1
```

Jeśli `git worktree` niedostępne — wystarczy `git show` / `git grep` na `origin/…` bez checkout.

---

## 4. Subagenci — podział zadań

### Subagent A — `crm_2027` (M1)

**Ścieżka:** `apps/mercato/src/modules/crm_2027/`  
**Gałęzie:** workspace (planning branch) **oraz** `origin/cursor/crm-2027-phase-3-meetings-f6a1` (diff: webhooks, `call-transcript-deal-bridge`, STT→ingest).

**Workflow do przejścia (WF-CRM):**

| ID | Flow | Kroki | Artefakt |
|----|------|-------|----------|
| CRM-1 | Hub → customers shell | `/backend/crm_2027` → redirect deals/people | UI routes |
| CRM-2 | Meeting ingest (native) | `POST /api/crm_2027/deals/{id}/meetings` | interaction + `crm_2027_deal_meetings` |
| CRM-3 | At-risk | schedule 6h lub `POST /risk-scan` → worker → flags | `GET /at-risk-deals` |
| CRM-4 | Voice | `voice-intent` → `voice-execute` → `customers.interactions.create` | interaction source |
| CRM-5 | Views bridge | `POST /views/apply` → customers list perspective | perspective id |

**Testy:**

```bash
cd open-mercato/apps/mercato
yarn test src/modules/crm_2027/lib/__tests__
```

**Zwróć:** werdykt M1, luki P0/P1, czy na gałęzi meetings jest bridge do M4.

---

### Subagent B — `production_planning` (M2)

**Ścieżka:** `apps/mercato/src/modules/production_planning/`  
**Gałąź:** `origin/cursor/planning-mercato-max-4528`

**Użyj szczegółowego briefu:**  
`open-mercato/.ai/specs/2026-05-26-production-planning-workflow-audit-agent-brief.md`  
(WF-1 … WF-10 — wykonać w całości.)

**Testy:**

```bash
yarn test src/modules/production_planning/lib/__tests__
cd open-mercato/services/ortools-scheduler && python3 -m pytest -q
```

**Zwróć:** werdykt M2 (GO/GO warunki/NO-GO), czy SO pegging (WF-10) działa z core `sales`.

---

### Subagent C — `helpdesk` (M3)

**Ścieżka:** tylko na `origin/cursor/helpdesk-module-6a78`  
**Spec:** `open-mercato/.ai/specs/2026-05-23-helpdesk-internal-service-desk.md` (jeśli istnieje na gałęzi; inaczej AGENTS.md)

**Workflow (WF-HD):**

| ID | Flow | Kroki |
|----|------|-------|
| HD-1 | Internal request | `POST /api/helpdesk/requests/internal` → ticket |
| HD-2 | Customer ingest | `POST /api/helpdesk/ingest` |
| HD-3 | Agent workspace | Kanban `agent/board`, assign, resolve |
| HD-4 | SLA | `sla_due_at` + worker `helpdesk:sla-scan` (15m) |
| HD-5 | Portal | `portal-token` → `/ticket/{uuid}` + public API |
| HD-6 | CRM tab | widget `customer-tickets` na person/company |
| HD-7 | Voice | `voice-intent` / `voice-execute` na tickecie |

**Testy (na gałęzi helpdesk):**

```bash
yarn test src/modules/helpdesk/lib/__tests__
```

**Zwróć:** werdykt M3, zależność od `customers` (bez duplikacji encji klienta).

---

### Subagent D — `call_transcripts` (M4)

**Ścieżka:** tylko na `origin/cursor/crm-2027-phase-3-meetings-f6a1`

**Workflow (WF-CT):**

| ID | Flow | Kroki |
|----|------|-------|
| CT-1 | Ingest API | `POST /api/call_transcripts/ingest` → command `call_transcripts.ingest` |
| CT-2 | Webhook Zoom/Gong | canonical `/api/call_transcripts/webhooks/*` |
| CT-3 | Projection | `customers.interactions` (`interactionType: call`) |
| CT-4 | CRM bridge | event `call_transcripts.transcript.ingested` → subscriber `call-transcript-deal-bridge` → CRM sentiment/risk |
| CT-5 | Deprecation | `POST /api/crm_2027/webhooks/*` deleguje + nagłówek `Link` successor |

**Testy:**

```bash
yarn test src/modules/call_transcripts/lib/__tests__
```

**Zwróć:** czy M1 bez M4 ma sensowną degradację (501 STT); czy duplikacja webhooków jest bezpieczna.

---

### Subagent E — `sales_forecasting` (M5 — spec only)

**Pliki:**  
- `open-mercato/.ai/specs/2026-05-24-sales-forecasting-module-starter-prompt.md`  
- `open-mercato/.ai/specs/2026-05-24-production-planning-master-plan.md` (sekcje demand)  
- Kod M2: grep `sales_forecasting`, `demand-export`, `forecast.published`

**Zadanie:** audyt **gotowości kontraktu**, nie implementacji.

| Kontrakt docelowy | Czy M2 już ma hook? | Ocena |
|-------------------|---------------------|-------|
| Event `sales_forecasting.forecast.published` | grep w M2 | |
| `GET /api/sales_forecasting/demand-export` | brak modułu | |
| What-if T-02 czyta published forecast | `what-if` registry | |
| Brak duplikacji Order | N/A | |

**Zwróć:** werdykt M5 = **SPEC READY / SPEC GAP / BLOCKED BY M2** + lista minimalnych kroków przed pierwszym PR kodu SF.

---

### Subagent F — Integracja cross-module (obowiązkowy)

**Zależności od A–E.** Wypełnia sekcje 5, 6, 7 tego briefu.

**Narzędzia:**

```bash
# Przykładowe grep cross-repo (dostosuj gałęzie)
git grep -h "crm_2027\|helpdesk\|call_transcripts\|sales_forecasting\|production_planning" \
  origin/cursor/planning-mercato-max-4528 -- open-mercato/apps/mercato/src/modules
```

---

## 5. Macierz integracji (INT) — wypełnia subagent F

Dla każdej komórki: **Zaimplementowane / Częściowo / Tylko spec / Brak** + 1 zdanie dowodu + gałąź.

| INT | Od → Do | Kontrakt | Oczekiwane zachowanie |
|-----|---------|----------|------------------------|
| INT-01 | `customers` → M1 CRM | command bus, UMES | Deals/interactions bez duplikacji |
| INT-02 | M4 → `customers` | `call_transcripts.ingest` | Interaction `call` |
| INT-03 | M4 → M1 | event + `call-transcript-deal-bridge` | Risk/meeting po `dealId` |
| INT-04 | M1 → M4 | STT route, deprecated webhooks | Canonical ingest |
| INT-05 | M3 → `customers` | injection `customer-tickets` | Tickety na profilu klienta |
| INT-06 | M3 ↔ M1 | brak bezpośredniego API | OK jeśli przez customers |
| INT-07 | M2 → `sales` | pegging API, MO z SO | WF-10 planning |
| INT-08 | M5 → M2 | demand export / event | **docelowo**; dziś brak M5 |
| INT-09 | M1 → M2 | pipeline forecast → APS | **brak** — czy to luka produktowa? |
| INT-10 | M2 → M1 | brak | OK na MVP |
| INT-11 | M3 → M2 | brak | OK na MVP |
| INT-12 | Voice pattern | M1, M3 osobno | Spójność API/intentów? |
| INT-13 | Webhook secrets | M1, M4 env | Fallback env documented |
| INT-14 | `modules.ts` | enabled modules | Jedna lista po merge |
| INT-15 | Migracje | kolejność timestamp | Brak kolizji tabel |

---

## 6. Workflow cross-cutting (XC) — „czy razem ma sens”

Orchestrator (lub F) opisuje **scenariusze biznesowe** end-to-end; nie wszystkie muszą być zautomatyzowane dziś.

| XC | Scenariusz | Moduły | Werdykt oczekiwany |
|----|------------|--------|-------------------|
| XC-01 | Spotkanie Zoom → transkrypt → deal risk → notification | M4, M1, customers | Działa na gałęzi meetings |
| XC-02 | Klient dzwoni → ticket helpdesk → agent widzi historię CRM | M3, customers, M1? | Ticket + CRM tab |
| XC-03 | Zamówienie SO → pegging → netting → optimize | sales, M2 | Na gałęzi planning |
| XC-04 | Opublikowany forecast → netting demand shock | M5 spec, M2 | **Tylko spec** do czasu M5 |
| XC-05 | Jeden `modules.ts` + migracje + yarn test wszystkich modułów | wszystkie | Merge simulation |

**XC-05 procedura (obowiązkowa próba lub opis):**

1. Zaproponować **kolejność merge** PR/gałęzi (np. CRM meetings → helpdesk → planning).
2. Wypisać przewidywane konflikty: `modules.ts`, `i18n`, webhook routes.
3. Czy po merge trzeba **jednego** `enabledModules` z 5 wpisami `@app` (+ example).

---

## 7. Merge readiness checklist

- [ ] `modules.ts` — wszystkie moduły: `crm_2027`, `helpdesk`, `call_transcripts`, `production_planning` (+ przyszły `sales_forecasting`)
- [ ] Brak importów cross-module z omijaniem command bus (np. `../../../../call_transcripts` tylko w deprecated delegate — OK)
- [ ] ACL features nie kolidują nazwami
- [ ] Queue names unikalne (`crm_2027_risk_scan`, `helpdesk:sla-scan`, …)
- [ ] Event IDs globalnie unikalne w `events.ts` każdego modułu
- [ ] Duplikacja webhook Zoom/Gong — dokumentacja która route jest canonical
- [ ] Testy: suma testów per moduł + czy CI uruchamia wszystkie ścieżki
- [ ] AGENTS.md w każdym module wskazuje integracje (nie tylko „nie ruszaj core”)

---

## 8. Werdykt końcowy integracji („razem właściwie”)

Orchestrator wybiera **jedną** opcję globalną + per moduł:

| Kod | Znaczenie |
|-----|-----------|
| **INTEGRATION GO** | Moduły są spójne; merge + włączenie w `modules.ts` wystarczy; luki to P1/P2 |
| **INTEGRATION GO z warunkami** | Działa po merge N gałęzi / konfiguracji env / implementacji M5 |
| **INTEGRATION NO-GO** | Fundamentalny konflikt (duplikacja SoR, zepsuty łańcuch M4→M1, niemożliwy merge migracji) |

**Osobna odpowiedź:** „Czy agent implementacyjny może w **jednym** środowisku przejść XC-01…XC-03 bez ręcznego patchowania?” (Tak/Nie + co brakuje)

---

## 9. Znane ograniczenia (nie liczyć jako NO-GO integracji)

- `sales_forecasting` bez kodu — ocenić **kontrakt**, nie implementację.
- Brak JDBC IFS w M2 — osobna bramka.
- Brak bezpośredniego M1↔M2 — OK jeśli produkt nie wymaga jeszcze CRM→APS.
- Brak Playwright E2E — luka P2, nie samodzielny NO-GO.

---

## 10. Szablon REPORT (orchestrator wypełnia)

Plik: `2026-05-26-all-app-modules-integration-audit-REPORT.md`

```markdown
# Raport audytu integracji — 5 obszarów app

**Data:** …  
**Audytor:** orchestrator + subagenci A–F  
**Gałęzie przejrzane:** …

## Werdykt globalny

[ INTEGRATION GO | GO z warunkami | NO-GO ] — jedno zdanie.

## Werdykty per moduł

| Moduł | Werdykt | Najważniejsza luka |
|-------|---------|-------------------|
| M1 crm_2027 | | |
| M2 production_planning | | |
| M3 helpdesk | | |
| M4 call_transcripts | | |
| M5 sales_forecasting (spec) | | |

## Macierz INT (sekcja 5)

(tabela wypełniona)

## XC workflows

### XC-01 …
- Kroki: …
- Wynik: …

## Merge plan

1. Kolejność PR: …
2. Konflikty: …
3. Docelowy `modules.ts`: …

## Luki priorytetyzowane

| P | Moduł | Opis | Blokuje merge? |
|---|-------|------|----------------|

## Rekomendacje PO

1. …

## Czy „razem właściwie zrobione”?

[Tak / Częściowo / Nie] — uzasadnienie 3–5 zdań.
```

---

## 11. Powiązane dokumenty

| Dokument | Rola |
|----------|------|
| `2026-05-26-production-planning-workflow-audit-agent-brief.md` | Szczegół WF-1…10 dla M2 (subagent B) |
| `2027-05-23-crm-2027-*.md` | Specy M1 |
| `2026-05-24-sales-forecasting-module-starter-prompt.md` | M5 |
| `2026-05-24-production-planning-master-plan.md` | M2 + demand |
| `2026-05-23-helpdesk-internal-service-desk.md` | M3 (na gałęzi helpdesk) |

---

## 12. Prompt startowy — ORCHESTRATOR (copy-paste)

```
Jesteś ORCHESTRATOREM audytu integracji modułów @app w open-mercato (repo dwthon-rag).

Przeczytaj i wykonaj:
open-mercato/.ai/specs/2026-05-26-all-app-modules-integration-audit-brief.md

Deliverable:
open-mercato/.ai/specs/2026-05-26-all-app-modules-integration-audit-REPORT.md

Zasady:
- NIE implementuj poprawek.
- Deleguj równolegle subagentów A (crm_2027), B (production_planning), C (helpdesk),
  D (call_transcripts), E (sales_forecasting spec), potem F (integracja).
- Subagent B musi też wykonać brief:
  open-mercato/.ai/specs/2026-05-26-production-planning-workflow-audit-agent-brief.md
- Audytuj kod na właściwych gałęziach remote (sekcja 1 briefu).
- Odpowiedz czy 5 obszarów jest „razem właściwie zrobione” (architektura + merge),
  nie tylko czy każdy moduł osobno działa.

Werdykt globalny: INTEGRATION GO / GO z warunkami / NO-GO.
```

---

## 13. Prompty skrócone — SUBAGENCI (opcjonalne copy-paste)

**A — CRM:**  
`Audyt modułu crm_2027 wg briefu 2026-05-26-all-app-modules-integration-audit-brief.md sekcja Subagent A. Gałęzie: workspace + origin/cursor/crm-2027-phase-3-meetings-f6a1. Zwróć werdykt + luki + stan bridge M4.`

**B — Planning:**  
`Wykonaj open-mercato/.ai/specs/2026-05-26-production-planning-workflow-audit-agent-brief.md w całości na gałęzi planning-mercato-max-4528. Zwróć werdykt WF-1…10.`

**C — Helpdesk:**  
`Audyt helpdesk na origin/cursor/helpdesk-module-6a78, WF-HD-1…7. Zwróć werdykt + integracja customers.`

**D — Call transcripts:**  
`Audyt call_transcripts na origin/cursor/crm-2027-phase-3-meetings-f6a1, WF-CT-1…5 + deprecation CRM webhooks.`

**E — Sales forecasting:**  
`Audyt tylko spec M5 vs kontrakty M2. Brak kodu modułu. Werdykt SPEC READY/GAP.`

**F — Integration:**  
`Wypełnij macierz INT, XC-01…05, merge readiness. Werdykt globalny integracji.`

---

*Brief przygotowany pod zamówienie: jeden „genialny” agent z subagentami ma ocenić spójność 5 obszarów z ostatnich ~2 dni pracy.*
