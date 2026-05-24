import type { EntityManager } from '@mikro-orm/postgresql'
import { listWorkOrderOperations } from './work-order-operations'
import { listWorkOrders } from './work-orders'

export type MesScope = { tenantId: string; organizationId: string }

export type ProductionProgress = {
  workOrderCount: number
  totalOperations: number
  completedOperations: number
  inProgressOperations: number
  percentComplete: number
}

function countCompletedOperation(status: string): boolean {
  return status === 'completed' || status === 'skipped'
}

export async function aggregateProductionProgressForWorkOrders(
  em: EntityManager,
  scope: MesScope,
  workOrderIds: string[],
): Promise<ProductionProgress> {
  if (workOrderIds.length === 0) {
    return {
      workOrderCount: 0,
      totalOperations: 0,
      completedOperations: 0,
      inProgressOperations: 0,
      percentComplete: 0,
    }
  }

  let totalOperations = 0
  let completedOperations = 0
  let inProgressOperations = 0

  for (const workOrderId of workOrderIds) {
    const operations = await listWorkOrderOperations(em, scope, workOrderId)
    totalOperations += operations.length
    completedOperations += operations.filter((op) => countCompletedOperation(op.status)).length
    inProgressOperations += operations.filter((op) => op.status === 'in_progress').length
  }

  const percentComplete =
    totalOperations > 0 ? Math.round((completedOperations / totalOperations) * 100) : 0

  return {
    workOrderCount: workOrderIds.length,
    totalOperations,
    completedOperations,
    inProgressOperations,
    percentComplete,
  }
}

export async function aggregateProductionProgressForDeal(
  em: EntityManager,
  scope: MesScope,
  dealId: string,
): Promise<ProductionProgress> {
  const workOrders = await listWorkOrders(em, scope, { dealId, limit: 200 })
  return aggregateProductionProgressForWorkOrders(
    em,
    scope,
    workOrders.map((wo) => wo.id),
  )
}

export async function aggregateProductionProgressForSalesOrder(
  em: EntityManager,
  scope: MesScope,
  salesOrderId: string,
): Promise<ProductionProgress> {
  const workOrders = await listWorkOrders(em, scope, { salesOrderId, limit: 200 })
  return aggregateProductionProgressForWorkOrders(
    em,
    scope,
    workOrders.map((wo) => wo.id),
  )
}
