import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningOrder } from '../data/entities'
import type { CpsatScheduleEntry } from './ortools-bridge'
import type { OrgScope } from './production-order'

export type ScenarioKpiSnapshot = {
  operationCount: number
  lateOrderCount: number
  maxLatenessMinutes: number
  avgLatenessMinutes: number
  workCenterCount: number
  objectiveValue: number | null
  solverStatus: string | null
  computedAt: string
}

export async function computeScenarioKpis(
  em: EntityManager,
  scope: OrgScope,
  schedule: CpsatScheduleEntry[],
  options?: {
    objectiveValue?: number | null
    solverStatus?: string | null
  },
): Promise<ScenarioKpiSnapshot> {
  const orderIds = [
    ...new Set(
      schedule
        .map((e) => e.productionOrderId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const orders =
    orderIds.length > 0
      ? await em.find(ProductionPlanningOrder, {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          id: { $in: orderIds },
        })
      : []

  const dueByOrder = new Map<string, Date>()
  for (const order of orders) {
    if (order.dueAt) dueByOrder.set(order.id, order.dueAt)
  }

  const lastEndByOrder = new Map<string, Date>()
  for (const entry of schedule) {
    const orderId = entry.productionOrderId
    if (!orderId) continue
    const end = new Date(entry.plannedEndAt)
    const prev = lastEndByOrder.get(orderId)
    if (!prev || end > prev) lastEndByOrder.set(orderId, end)
  }

  let lateOrderCount = 0
  let maxLatenessMinutes = 0
  let latenessSum = 0

  for (const [orderId, dueAt] of dueByOrder) {
    const end = lastEndByOrder.get(orderId)
    if (!end) continue
    const latenessMs = end.getTime() - dueAt.getTime()
    if (latenessMs > 0) {
      lateOrderCount += 1
      const minutes = Math.round(latenessMs / 60_000)
      latenessSum += minutes
      if (minutes > maxLatenessMinutes) maxLatenessMinutes = minutes
    }
  }

  const workCenters = new Set(schedule.map((e) => e.workCenterCode))

  return {
    operationCount: schedule.length,
    lateOrderCount,
    maxLatenessMinutes,
    avgLatenessMinutes:
      lateOrderCount > 0 ? Math.round(latenessSum / lateOrderCount) : 0,
    workCenterCount: workCenters.size,
    objectiveValue: options?.objectiveValue ?? null,
    solverStatus: options?.solverStatus ?? null,
    computedAt: new Date().toISOString(),
  }
}
