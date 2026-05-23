# Production planning + Hexaly bridge

## Context

- **Open Mercato** (`@app` module `production_planning`) holds business data: orders, operations, capacity snapshots.
- **Hexaly** is a commercial hybrid optimizer (Python/C++/Java/C#). No Node SDK, not open source.

## Integration

```
Mercato API  →  hexaly-bridge.ts (HTTP)  →  Python/Java worker or Hexaly Cloud
                ← schedule JSON ←
Mercato worker applies planned_start/end to operations (future phase)
```

## Env

| Variable | Purpose |
|----------|---------|
| `HEXALY_BRIDGE_URL` | POST target for optimization jobs |
| `HEXALY_BRIDGE_API_KEY` | Optional bearer |
| `HEXALY_BRIDGE_TIMEOUT_MS` | Default 120000 |

## API

- `POST /api/production_planning/optimize` — sends order ids + objective; returns snapshot + Hexaly result or local fallback message.

## Licensing

Hexaly Business is quote-based; Academic is free for research. Mercato remains MIT.
