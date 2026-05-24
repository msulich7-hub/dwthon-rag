# Market Parity Blueprint — Production Planning (Maj 2026)

**Cel:** Mercato `production_planning` ma osiągnąć **Class A APS parity** z liderami rynku w maju 2026, bez zastępowania IFS9 jako systemu operacyjnego (SoR).

**Odniesienia rynkowe (stan Q1–Q2 2026):**

| Vendor | Produkt | Co definiuje „najlepsze” w 2026 |
|--------|---------|----------------------------------|
| **Kinaxis** | Maestro | Concurrent planning, always-on engine, interaktywne what-if w minutach, GPU/cuOpt (do 12× szybciej), Agent Studio z guardrails |
| **o9** | Digital Brain / APEX | Enterprise Knowledge Graph, digital twin przedsiębiorstwa, IBP demand+supply+finance, scenariusze rough-cut, control tower |
| **SAP** | IBP HPA + S/4 PP/DS | Jedna harmonized planning area (time-series + order-based), RTI, finite PP/DS, flexible constraints, CBP end-to-end |
| **OMP** | Unison / Plus | Multi-echelon, constraint-based planning, S&OP |
| **Oracle** | ASCP / Cloud SCM | CTP, pegging, compare plans, global supply network |
| **Siemens** | Opcenter APS 2510 | Finite Gantt, drag-drop, sequence-dependent setup, do 50k operacji, multi-horizon |
| **PlanetTogether** | — | Visual finite schedule, what-if sandbox |
| **Asprova** | APS/MS 18.x | Sub-minuta reschedule, finite value chain, KPI evaluation per order type, forward/backward multiplex |

---

## North Star Mercato (maj 2026)

| Wymiar | Definicja „jesteśmy na rynku” | Jak to dowozimy (moduły) |
|--------|------------------------------|---------------------------|
| **Concurrent planning** | Zmiana demand/supply propaguje się przez netting → schedule w &lt;15 min (nie nocny batch) | M2 kroki 32–33, M3 krok 52 |
| **Interaktywne what-if** | Planista uruchamia scenariusz (zmiana priorytetu, awaria WC, rush order) i widzi nowy plan w **&lt;60 s** dla horyzontu 7–14 dni / ≤500 ops | M3 kroki 52, 54, 55 |
| **Wersjonowanie scenariuszy** | Zapis/clone/compare planów jak Kinaxis Compare / o9 scenario management | M3 krok 57, M4 krok 68, M5 krok 87 |
| **Finite capacity** | 150 WC, sequence setup, alt routing, peg-aware — bez infinite-cap fantasy | M3 kroki 45–50 |
| **Multi-horizon** | Tygodnie (tactical) + dni (execution) + roczny replay (strategic learning) | M1 krok 3, M2 krok 25, M4 krok 67 |
| **Pegging end-to-end** | SO → MO → operacje → supply; wizualizacja jak SUPPLY_DEMAND + IBP OBP | M1 krok 10, M2 kroki 30–35 |
| **Plan attainment** | Plan vs actual (MES/IFS feedback), OTIF, chaos premium | M1 krok 12, M4 kroki 74–75, M5 krok 87 |
| **Control tower** | Wyjątki (late, shortage, overload) z drill-down i przypisaniem | M2 krok 38, M5 krok 82 |
| **Agent-assisted (guardrails)** | Copilot proponuje akcje; **nie** zapisuje planu bez human-in-the-loop | M5 krok 84 (P1), M4 krok 76 |
| **Genesis + roczny hindsight** | **Differentiator P2** — żaden lider nie ma gotowego 365d chaos premium z drzewem genezy | M2, M4 |

---

## Macierz parity (skrót)

Legenda: ✅ P0 (must) · ◐ P1 (parity release) · ★ P2 (differentiator) · — out of scope (IFS/Erp)

| Capability | Kinaxis | o9 | SAP IBP | Opcenter | Asprova | **Mercato target** |
|------------|---------|-----|---------|----------|---------|-------------------|
| Always-on / concurrent | ✅ | ✅ | ◐ RTI | ◐ | ◐ | ✅ M2+M3 |
| GPU / massive scale | ✅ cuOpt | ◐ | — | — | — | ◐ P2 (CPU chunk first) |
| Knowledge graph | ◐ | ✅ EKG | ◐ HPA | — | — | ◐ genesis graph |
| Interactive what-if &lt;1 min | ✅ | ✅ | ◐ | ✅ drag | ✅ | ✅ P0 |
| Scenario compare | ✅ | ✅ | ◐ | ✅ | ✅ KPI | ✅ M4+M5 |
| Finite 150+ WC | ✅ | ✅ | ✅ PP/DS | ✅ 50k ops | ✅ | ✅ M3 |
| Sequence setup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ M3 k47 |
| Alt routing / FJSP | ◐ | ✅ | ✅ CDP | ✅ | ◐ | ✅ M3 k46 |
| Pool MO / netting | ✅ | ✅ | ✅ OBP | ◐ | ◐ | ✅ M2 |
| Pegging | ✅ | ✅ | ✅ | ◐ | ◐ | ✅ M2 |
| CTP / ATP | ✅ | ✅ | ✅ | ◐ | — | ◐ P1 (M2+API) |
| IBP financial reconcile | ✅ | ✅ | ✅ | — | — | — (IFS finance) |
| MES feedback loop | ◐ | ◐ | ✅ | ✅ MES | ◐ | ✅ M1 k12 |
| Agent orchestration | ✅ 2026 | ✅ APEX | ◐ | — | — | ◐ P1 copilot M5 |
| **365d hindsight + genesis** | — | — | — | ◐ sim | ◐ long sim | ★ **P2 unique** |

---

## Luka → krok (co podnieść w 100 krokach)

| Luka względem rynku | Było (v1.0) | Jest (v2.0) — krok |
|---------------------|-------------|---------------------|
| Brak SLA na interaktywny solve | „p95 &lt;120s” | **&lt;60 s** what-if 7d/≤500 ops (M3-52, KPI) |
| Brak wersjonowania scenariuszy | tylko optimize | **plan_scenarios** + compare (M3-57, M4-68, M5-87) |
| Brak multi-objective | jeden objective | tardiness + changeover + WIP (M3-54) |
| Brak warm-start | cold solve | carry-forward + hint z poprzedniego (M3-49, 54) |
| Brak control tower | Overview KPI | **exception queue** + severity (M5-82, M2-38) |
| Brak copilot z guardrails | — | M5-84 (propose-only, audit) |
| CDC zamiast tylko batch ETL | watermark | **near-real-time** incremental (M1-18) |
| Harmonized semantics | silver model | **planning_area_id** + horizons (M1-5) |
| Chaos premium bez narracji ROI | KPI | = **wartość concurrent planning** (M4-75) |

---

## KPI programu (Class A, maj 2026)

| KPI | v1.0 | **v2.0 (market)** |
|-----|------|-------------------|
| Interactive what-if | — | p95 **&lt;60 s** (7d, ≤500 ops) |
| Full replan (1000 SO) | — | p95 **&lt;15 min** end-to-end |
| OTIF@+3d | górny pułag | + **delta vs IFS actual** published |
| Chaos premium | zmierzony | + **PLN/EUR i % sprzedaży** w waterfall |
| Scenario compare | — | 2+ plany side-by-side w UI |
| Exception MTTR | — | krytyczny wyjątek **&lt;4 h** od wykrycia |
| Plan attainment | — | **≥90%** ops w ±1 shift vs actual (pilotaż) |
| Anti-fantasy | 0 critical | + audyt kwartalny |

---

## Fazy v2.0 (bramki z parity)

| Faza | Bramka market |
|------|----------------|
| **F0** | Staging jak IBP RTI: incremental &lt;15 min, reconcile ±0.1% |
| **F1** | Pool MO + pegging: 1000 SO/mies., concurrent delta replan |
| **F2** | What-if &lt;60 s + scenario snapshot + 150 WC benchmark |
| **F3** | Roczny replay + 3 soczewki + chaos premium w walucie |
| **F4** | Control tower + copilot propose-only + pilot 2 tyg. |

---

## Co świadomie NIE kopiujemy (IFS pozostaje SoR)

- Pełne **S&OP finansowe** (P&L reconcile) — tylko operacyjne KPI w Mercato  
- **Multi-tier supplier network** w v1 — opcjonalne P2 (M1-13)  
- **GPU cuOpt** w v1 — architektura gotowa na worker GPU (P2); najpierw peg-aware chunk + warm-start na CPU  
- **Zastąpienie IFS MRP** — Mercato planuje *nad* IFS, write-back opcjonalny z governance (M5-98–99)

---

## Implementacja priorytetowa (90 dni do „parity feel”)

1. **Tydzień 1–4:** M1 staging + M3 k48 peg-aware + **M3-57 scenarios** (schema) + [what-if registry](../catalogs/what-if-scenarios.registry.json)  
2. **Tydzień 5–8:** M2 pool MO + M3 **&lt;60s what-if** tune + **bundle API** (BND-*) + M5-82 exceptions  
3. **Tydzień 9–12:** M4 pilot 13 tygodni + M5 compare UI + turnieje BND-TOURNAMENT-*  
4. **Tydzień 13+:** pełny rok hindsight + copilot P1 („uruchom BND-ESCALATION”)  

**Katalog scenariuszy:** [what-if-scenario-catalog.md](./2026-05-24-production-planning-what-if-scenario-catalog.md) — 18 taktycznych (T-*) + 18 shop-floor (WIF-*) + 10 bundle’ów badań.

---

*Źródła: Kinaxis Maestro/cuOpt/Agent Studio (2026), o9 Digital Brain/APEX (2026), SAP IBP HPA/RTI/PPDS (2025 FPS), Opcenter APS 2510, Asprova 18.0 (2025), debata 10 subagentów.*
