# OR-Tools CP-SAT scheduler (Mercato bridge)

FastAPI microservice that solves production scheduling for the `production_planning` Mercato module.

## Endpoints

- `GET /health` — liveness
- `POST /schedule` — run CP-SAT (body: Mercato `CpsatScheduleRequest` JSON)

## Run locally

```bash
cd open-mercato/services/ortools-scheduler
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
python3 -m pytest -q
```

## Mercato configuration

```env
ORTOOLS_BRIDGE_URL=http://localhost:8080/schedule
ORTOOLS_BRIDGE_TIMEOUT_MS=120000
```

Then call `POST /api/production_planning/optimize` with `{ "applySync": true }`.

## License

OR-Tools is Apache 2.0. This service is part of the dwthon-rag Open Mercato extension.
