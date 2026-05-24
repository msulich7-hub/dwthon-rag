# Raport audytu integracji — 5 obszarów app

> **Status:** SZABLON — do wypełnienia przez agenta-orchestratora.  
> **Brief:** `2026-05-26-all-app-modules-integration-audit-brief.md`

**Data audytu:** _…_  
**Audytor:** orchestrator + subagenci A–F  
**Gałęzie przejrzane:** _…_

---

## Werdykt globalny

_ [ INTEGRATION GO | INTEGRATION GO z warunkami | INTEGRATION NO-GO ] — jedno zdanie._

---

## Werdykty per moduł

| Moduł | Werdykt | Najważniejsza luka |
|-------|---------|-------------------|
| M1 `crm_2027` | | |
| M2 `production_planning` | | |
| M3 `helpdesk` | | |
| M4 `call_transcripts` | | |
| M5 `sales_forecasting` (spec) | | |

---

## Macierz INT

| INT | Status | Dowód (gałąź / plik) |
|-----|--------|----------------------|
| INT-01 | | |
| INT-02 | | |
| INT-03 | | |
| INT-04 | | |
| INT-05 | | |
| INT-06 | | |
| INT-07 | | |
| INT-08 | | |
| INT-09 | | |
| INT-10 | | |
| INT-11 | | |
| INT-12 | | |
| INT-13 | | |
| INT-14 | | |
| INT-15 | | |

---

## XC workflows

### XC-01 Spotkanie → risk

- Kroki wykonane: _…_
- Wynik: _…_

### XC-02 Helpdesk + CRM context

- Kroki: _…_
- Wynik: _…_

### XC-03 SO → planning

- Kroki: _…_
- Wynik: _…_

### XC-04 Forecast → APS (spec)

- Kroki: _…_
- Wynik: _…_

### XC-05 Merge simulation

- Proponowana kolejność merge: _…_
- Konflikty: _…_

---

## Testy uruchomione

| Moduł | Komenda | Wynik |
|-------|---------|-------|
| crm_2027 | `yarn test src/modules/crm_2027/lib/__tests__` | |
| production_planning | `yarn test src/modules/production_planning/lib/__tests__` | |
| helpdesk | (gałąź helpdesk) | |
| call_transcripts | (gałąź meetings) | |
| ortools | `pytest` w services/ortools-scheduler | |

---

## Luki priorytetyzowane

| P | Moduł | Opis | Blokuje merge? |
|---|-------|------|----------------|
| | | | |

---

## Rekomendacje PO

1. _…_

---

## Czy „razem właściwie zrobione”?

**Odpowiedź:** _[ Tak / Częściowo / Nie ]_

_Uzasadnienie (3–5 zdań):_

---

## Automatyzacja pełnego przebiegu jednym agentem

**[ Tak / Nie ]** — _…_
