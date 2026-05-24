# Production planning — CP-SAT (Google OR-Tools)

## Stack

| Layer | Technology | License |
|-------|------------|---------|
| Mercato module | `production_planning` (@app) | MIT |
| Solver service | `services/ortools-scheduler` (FastAPI + CP-SAT) | Apache 2.0 |

## Flow

1. `POST /api/production_planning/optimize` loads orders + operations (`build-cpsat-payload.ts`).
2. `POST {ORTOOLS_BRIDGE_URL}` → Python `/schedule` runs CP-SAT.
3. `apply-cpsat-schedule.ts` writes `plannedStartAt` / `plannedEndAt` on operations (sync by default).

## Env (Mercato)

```
ORTOOLS_BRIDGE_URL=http://ortools-scheduler:8080/schedule
ORTOOLS_BRIDGE_API_KEY=
ORTOOLS_BRIDGE_TIMEOUT_MS=120000
```

## Docker

```bash
docker build -t ortools-scheduler open-mercato/services/ortools-scheduler
docker run -p 8080:8080 ortools-scheduler
```

## Objectives

- `minimize_lateness` — sum of order tardiness vs `dueAt`
- `balance_load` — spread work-center completion times + makespan
- `minimize_changeover` — penalize same-machine SKU changes (heuristic)

## Model (CP-SAT)

- Interval variables per operation, `AddNoOverlap` per work center
- Precedence: `end[i] <= start[i+1]` within each production order
- Horizon: `horizonHours * 60` minutes from `planningStartAt`
