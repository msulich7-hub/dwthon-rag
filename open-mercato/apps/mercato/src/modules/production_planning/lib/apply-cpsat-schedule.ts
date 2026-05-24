import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningOperation, ProductionPlanningOrder } from '../data/entities'
import { emitProductionPlanningEvent } from '../events'
import type { CpsatScheduleEntry } from './ortools-bridge'
import type { OrgScope } from './production-order'

export type ApplyCpsatScheduleOptions = {
  jobId?: string
  updateOrderRollup?: boolean
  skipCompletedOperations?: boolean
  dryRun?: boolean
}

export type ApplyCpsatScheduleResult = {
  jobId: string
  applied: number
  skipped: number
  errors: Array<{ operationId: string; reason: string }>
  orderRollupUpdated: string[]
}

export async function applyCpsatSchedule(
  em: EntityManager,
  scope: OrgScope,
  schedule: CpsatScheduleEntry[],
  options?: ApplyCpsatScheduleOptions,
): Promise<ApplyCpsatScheduleResult> {
  const jobId = options?.jobId ?? 'apply-sync'
  const result: ApplyCpsatScheduleResult = {
    jobId,
    applied: 0,
    skipped: 0,
    errors: [],
    orderRollupUpdated: [],
  }

  const touchedOrderIds = new Set<string>()

  for (const entry of schedule) {
    const op = await em.findOne(ProductionPlanningOperation, {
      id: entry.operationId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })

    if (!op) {
      result.errors.push({ operationId: entry.operationId, reason: 'NOT_FOUND' })
      result.skipped += 1
      continue
    }

    if (options?.skipCompletedOperations !== false && op.status === 'completed') {
      result.skipped += 1
      continue
    }

    const start = new Date(entry.plannedStartAt)
    const end = new Date(entry.plannedEndAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      result.errors.push({ operationId: entry.operationId, reason: 'INVALID_INTERVAL' })
      result.skipped += 1
      continue
    }

    if (!options?.dryRun) {
      op.plannedStartAt = start
      op.plannedEndAt = end
      if (op.status === 'pending') op.status = 'planned'
      touchedOrderIds.add(op.productionOrderId)
    }
    result.applied += 1
  }

  if (!options?.dryRun && options?.updateOrderRollup !== false) {
    for (const orderId of touchedOrderIds) {
      const orderOps = await em.find(ProductionPlanningOperation, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        productionOrderId: orderId,
      })
      const order = await em.findOne(ProductionPlanningOrder, {
        id: orderId,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
      })
      if (!order || orderOps.length === 0) continue

      const starts = orderOps
        .map((o) => o.plannedStartAt)
        .filter((d): d is Date => d instanceof Date)
      const ends = orderOps
        .map((o) => o.plannedEndAt)
        .filter((d): d is Date => d instanceof Date)

      if (starts.length > 0) {
        order.plannedStartAt = new Date(Math.min(...starts.map((d) => d.getTime())))
      }
      if (ends.length > 0) {
        order.plannedEndAt = new Date(Math.max(...ends.map((d) => d.getTime())))
      }
      if (order.status === 'draft') order.status = 'planned'
      result.orderRollupUpdated.push(orderId)
    }

    await em.flush()

    await emitProductionPlanningEvent(
      'production_planning.schedule.applied',
      {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        jobId,
        applied: result.applied,
        skipped: result.skipped,
        orderRollupUpdated: result.orderRollupUpdated,
      },
      { persistent: true },
    )
  }

  return result
}
