# Debata ekspertów: M1 IFS silver pilot + embedded dual-Gantt

**Data:** 2026-05-25  
**Kontekst:** `production_planning` — parity Kinaxis / o9 / SAP IBP / Opcenter / Asprova  
**Decyzja PO:** wykonać oba wątki (M1 pilot extract + dual-Gantt w Scenario Lab) i udokumentować spór ekspertów.

---

## 1. Ekspert integracji IFS / SAP IBP RTI

**Stanowisko:** Pilot Mercato → silver jest **GO na scaffolding**, **NO-GO** na zastąpienie JDBC/CDC z `CUSTOMER_ORDER_LINE`, `SHOP_ORDER`, `SUPPLY_DEMAND`.

### Za pilotem (zaimplementowano)

| Element | Uzasadnienie |
|---------|--------------|
| Tabele silver z natural keys (`contract`, `order_no`, `line_no`, …) | Kontrakt pod przyszły adapter IFS9 bez zmiany schematu |
| `source_system`, `extract_batch_id`, `last_seen_at`, `is_deleted` | Wzorzec CDC / soft-delete |
| Watermarki per `entity_name` | Obserwowalność lag i batchów |
| `POST /api/production_planning/ifs/extract/sync` | Ręczny pilot; później scheduler |
| Reconcile ±0,1% shop orders / operations | Bramka jakości przed M2 na silver |

### Przeciw pełnemu M2 na silver (bez JDBC)

- Brak `demand_code` / `supply_code` z IFS — pilot mapuje z Mercato MO/pegging.
- Ryzyko pętli SoR: silver z MO, które M2 sam tworzy → wymaga flag `source_system` i reguł „nie ekstrahuj z powrotem pool MO z nettingu”.
- Pegi produkcyjne i BOM 6 poziomów: **NO-GO** do czasu JDBC.

### Decyzja PO (M1)

| Priorytet | Działanie |
|-----------|-----------|
| P0 (następny) | JDBC/CDC IFS, pola IFS-native, watermark na `source_modified_at` |
| P1 (teraz) | ✅ Pilot extract + status API + reconcile |
| P2 | Reconcile rozszerzony o qty sumy i CO lines |

---

## 2. Ekspert UX planowania (Opcenter / Kinaxis)

**Stanowisko:** **Ship embedded dual-Gantt v1** w Scenario Lab z warunkami ograniczającymi ryzyko wydajności.

### Warunki v1 (zaakceptowane)

- Wspólna oś czasu (`planningStartAt` w query, nie `new Date()` per request).
- Tylko **baseline ↔ scenariusz A** (nie B w tym samym widoku).
- Do **50 WC**, **72 h** horyzontu, lazy load po compare KPI.
- Union wierszy WC; diff: unchanged / moved / new / removed + late ring.

### Bug krytyczny (naprawiony)

`buildGanttPayload` ustawiał `planningStartAt = new Date()` przy każdym wywołaniu — compare rozjeżdżał osie. Fix: parametr `planningStartAt` w API i `/gantt/compare`.

### Decyzja PO (Gantt)

| Priorytet | Działanie |
|-----------|-----------|
| P1 (teraz) | ✅ `ScenarioGanttCompare` w Scenario Lab, `GET /gantt/compare` |
| P1 | Scroll sync między panelami (v1.1) |
| P2 | Trzeci panel dla scenariusza B, drill-down do operacji |

---

## 3. Synteza — co wyszło w kodzie

| Obszar | Pliki / API |
|--------|-------------|
| Migracja silver | `Migration20260525180000_production_planning_ifs_silver_pilot.ts` |
| Encje | `data/entities.ts` — `ProductionPlanningIfsSilver*` |
| Extract | `lib/ifs/extract-pilot.ts`, `POST .../ifs/extract/sync` |
| Status + reconcile | `GET .../ifs/extract/status`, `lib/ifs/reconcile.ts` |
| Dual Gantt | `lib/gantt-compare.ts`, `GET .../gantt/compare`, `components/ScenarioGanttCompare.tsx` |
| Scenario Lab | `scenarios/page.tsx` — embedded po compare |

---

## 4. Backlog po debacie

1. **M1 JDBC** — prawdziwy extract z IFS9, nie Mercato mirror.  
2. **M2 na silver** — tylko po reconcile qty i regułach SoR.  
3. **Gantt v1.1** — scroll sync, export PNG.  
4. **Genesis explorer UI** — osobny slice.  

---

*Dokument wygenerowany po debacie readonly subagentów i implementacji slice na branchu `cursor/planning-m1-dual-gantt-debate-4528`.*
