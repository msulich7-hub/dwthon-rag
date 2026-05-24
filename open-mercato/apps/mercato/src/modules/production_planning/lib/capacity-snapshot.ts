import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningOperation, ProductionPlanningOrder } from '../data/entities'
import {
  computeCalendarUtilizationPct,
  effectiveCapacityMinutes,
  resolveWorkCenterCalendar,
} from './capacity/work-center-calendar'

export type WorkCenterLoad = {
  workCenterCode: string
  scheduledMinutes: number
  operationCount: number
  utilizationPct: number
  calendarCapacityMinutes: number
  calendarId: string
}

export type CapacitySnapshot = {
  horizonHours: number
  workCenters: WorkCenterLoad[]
  openOrders: number
  lateOrders: number
}

const DEFAULT_HORIZON_HOURS = 168
const DEFAULT_CAPACITY_MINUTES_PER_HOUR = 60

export function computeUtilizationPct(scheduledMinutes: number, horizonHours: number): number {
  const capacityMinutes = horizonHours * DEFAULT_CAPACITY_MINUTES_PER_HOUR
  if (capacityMinutes <= 0) return 0
  return Math.min(100, Math.round((scheduledMinutes / capacityMinutes) * 100))
}

export function isOrderLate(order: ProductionPlanningOrder, now = new Date()): boolean {
  if (order.status === 'completed' || order.status === 'cancelled') return false
  if (!order.dueAt) return false
  return order.dueAt.getTime() < now.getTime()
}

export async function buildCapacitySnapshot(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  options?: { horizonHours?: number },
): Promise<CapacitySnapshot> {
  const horizonHours = options?.horizonHours ?? DEFAULT_HORIZON_HOURS
  const now = new Date()
  const horizonEnd = new Date(now.getTime() + horizonHours * 60 * 60 * 1000)

  const orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $in: ['draft', 'planned', 'in_progress'] },
  })

  const operations = await em.find(ProductionPlanningOperation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $in: ['pending', 'in_progress'] },
    $or: [
      { plannedStartAt: { $lte: horizonEnd } },
      { plannedStartAt: null },
    ],
  })

  const loads = new Map<string, { minutes: number; count: number }>()
  for (const op of operations) {
    const key = op.workCenterCode.trim() || 'default'
    const entry = loads.get(key) ?? { minutes: 0, count: 0 }
    entry.minutes += Math.max(0, op.durationMinutes)
    entry.count += 1
    loads.set(key, entry)
  }

  const planningStartAt = new Date()
  const workCenters: WorkCenterLoad[] = [...loads.entries()]
    .map(([workCenterCode, { minutes, count }]) => {
      const cal = resolveWorkCenterCalendar(workCenterCode)
      const calendarCapacityMinutes = effectiveCapacityMinutes(
        workCenterCode,
        horizonHours,
        planningStartAt,
      )
      return {
        workCenterCode,
        scheduledMinutes: minutes,
        operationCount: count,
        utilizationPct: computeCalendarUtilizationPct(
          minutes,
          workCenterCode,
          horizonHours,
          planningStartAt,
        ),
        calendarCapacityMinutes,
        calendarId: cal.id,
      }
    })
    .sort((a, b) => b.utilizationPct - a.utilizationPct)

  const lateOrders = orders.filter((o) => isOrderLate(o, now)).length

  return {
    horizonHours,
    workCenters,
    openOrders: orders.length,
    lateOrders,
  }
}
