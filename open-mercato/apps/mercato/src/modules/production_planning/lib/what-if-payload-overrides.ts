import type { PayloadOrder } from './cpsat-chunking'
import type { CpsatWorkCenterFloor } from './ortools-bridge'

export type ScenarioPayloadOverrides = {
  demand?: Record<string, unknown>
  supply?: Record<string, unknown>
  capacity?: Record<string, unknown>
  horizonHours?: number
}

function matchesWorkCenterPattern(code: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return code.startsWith(prefix)
  }
  return code === pattern
}

export function applyScenarioPayloadOverrides(
  orders: PayloadOrder[],
  overrides?: ScenarioPayloadOverrides | Record<string, unknown> | null,
  planningStartAt?: Date,
): {
  orders: PayloadOrder[]
  workCenterFloors: CpsatWorkCenterFloor[]
  notes: string[]
} {
  const notes: string[] = []
  const workCenterFloors: CpsatWorkCenterFloor[] = []
  if (!overrides || typeof overrides !== 'object') {
    return { orders, workCenterFloors, notes }
  }

  const cap =
    'capacity' in overrides && overrides.capacity && typeof overrides.capacity === 'object'
      ? (overrides.capacity as Record<string, unknown>)
      : null
  const demand =
    'demand' in overrides && overrides.demand && typeof overrides.demand === 'object'
      ? (overrides.demand as Record<string, unknown>)
      : null

  let nextOrders = orders

  if (cap?.oeeMultiplier != null) {
    const mult = Number(cap.oeeMultiplier)
    if (Number.isFinite(mult) && mult > 0 && mult !== 1) {
      const factor = 1 / mult
      nextOrders = nextOrders.map((o) => ({
        ...o,
        operations: o.operations.map((op) => ({
          ...op,
          durationMinutes: Math.max(1, Math.round(op.durationMinutes * factor)),
        })),
      }))
      notes.push(`Capacity: OEE multiplier ${mult} applied to operation durations.`)
    }
  }

  if (demand?.forecastDeltaPct != null) {
    const pct = Number(demand.forecastDeltaPct)
    if (Number.isFinite(pct) && pct !== 0) {
      nextOrders = nextOrders.map((o) => {
        if (!o.dueAt) return o
        const due = new Date(o.dueAt)
        const shiftHours = Math.round((168 * Math.abs(pct)) / 100)
        due.setTime(due.getTime() - Math.sign(pct) * shiftHours * 60 * 60 * 1000)
        return { ...o, dueAt: due.toISOString(), isLate: false }
      })
      notes.push(`Demand: shifted due dates by ${pct}% horizon equivalent.`)
    }
  }

  if (cap?.workCenterBlackoutHours != null && planningStartAt) {
    const hours = Number(cap.workCenterBlackoutHours)
    const pattern = String(cap.workCenterPattern ?? '*')
    if (Number.isFinite(hours) && hours > 0) {
      const floorAt = new Date(planningStartAt.getTime() + hours * 60 * 60 * 1000)
      const wcs = new Set<string>()
      for (const o of nextOrders) {
        for (const op of o.operations) {
          if (matchesWorkCenterPattern(op.workCenterCode, pattern)) wcs.add(op.workCenterCode)
        }
      }
      for (const wc of wcs) {
        workCenterFloors.push({
          workCenterCode: wc,
          earliestStartAt: floorAt.toISOString(),
        })
      }
      notes.push(`Capacity: blackout ${hours}h on pattern ${pattern}.`)
    }
  }

  return { orders: nextOrders, workCenterFloors, notes }
}
