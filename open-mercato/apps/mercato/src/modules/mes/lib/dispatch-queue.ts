import type { EntityManager } from '@mikro-orm/postgresql'
import { MesWorkOrder, MesWorkOrderOperation } from '../data/entities'

export type MesScope = { tenantId: string; organizationId: string }

export type DispatchQueueItem = {
  workOrderId: string
  orderNumber: string
  productCode: string
  dealId: string | null
  workOrderStatus: string
  operation: {
    id: string
    sequence: number
    operationCode: string
    operationName: string
    workCenterCode: string | null
    status: string
    plannedQty: number
    completedQty: number
  }
}

export async function listDispatchQueue(
  em: EntityManager,
  scope: MesScope,
  filters: { workCenterCode?: string; status?: 'ready' | 'in_progress'; limit?: number },
): Promise<DispatchQueueItem[]> {
  const statusFilter = filters.status ? [filters.status] : ['ready', 'in_progress']

  const operations = await em.find(
    MesWorkOrderOperation,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: { $in: statusFilter },
    },
    { limit: filters.limit ?? 100 },
  )

  const items: DispatchQueueItem[] = []

  for (const op of operations) {
    const workOrder = await em.findOne(MesWorkOrder, {
      id: op.workOrderId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
    if (!workOrder) continue
    if (!['planned', 'in_progress'].includes(workOrder.status)) continue
    if (filters.workCenterCode && op.workCenterCode !== filters.workCenterCode) continue

    items.push({
      workOrderId: workOrder.id,
      orderNumber: workOrder.orderNumber,
      productCode: workOrder.productCode,
      dealId: workOrder.dealId ?? null,
      workOrderStatus: workOrder.status,
      operation: {
        id: op.id,
        sequence: op.sequence,
        operationCode: op.operationCode,
        operationName: op.operationName,
        workCenterCode: op.workCenterCode ?? null,
        status: op.status,
        plannedQty: op.plannedQty,
        completedQty: op.completedQty,
      },
    })
  }

  items.sort((a, b) => {
    const statusRank = (s: string) => (s === 'in_progress' ? 0 : 1)
    const diff = statusRank(a.operation.status) - statusRank(b.operation.status)
    if (diff !== 0) return diff
    return a.operation.sequence - b.operation.sequence
  })

  return items.slice(0, filters.limit ?? 100)
}
