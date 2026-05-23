import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'
import {
  ProductionPlanningOperation,
  ProductionPlanningOrder,
} from '../data/entities'
import type { OrgScope } from './production-order'
import { mapProductionOrder, mapProductionOperation } from './production-order'
import type { CpsatObjective, CpsatScheduleRequest } from './ortools-bridge'

export type BuildCpsatPayloadOptions = {
  productionOrderIds: string[]
  horizonHours?: number
  objective?: CpsatObjective
  planningStartAt?: Date
}

export async function buildCpsatScheduleRequest(
  em: EntityManager,
  scope: OrgScope,
  options: BuildCpsatPayloadOptions,
): Promise<CpsatScheduleRequest> {
  const planningStartAt = options.planningStartAt ?? new Date()
  const horizonHours = options.horizonHours ?? 168
  const objective = options.objective ?? 'minimize_lateness'

  const orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    id: { $in: options.productionOrderIds },
    status: { $nin: ['completed', 'cancelled'] },
  })

  if (orders.length === 0) {
    throw new Error('NO_SCHEDULABLE_ORDERS')
  }

  const orderIds = orders.map((o) => o.id)
  const operations = await em.find(
    ProductionPlanningOperation,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      productionOrderId: { $in: orderIds },
      status: { $nin: ['completed', 'cancelled'] },
    },
    { orderBy: { sequenceNo: 'ASC' } },
  )

  const opsByOrder = new Map<string, ProductionPlanningOperation[]>()
  for (const op of operations) {
    const list = opsByOrder.get(op.productionOrderId) ?? []
    list.push(op)
    opsByOrder.set(op.productionOrderId, list)
  }

  const payloadOrders = orders
    .map((order) => {
      const orderOps = opsByOrder.get(order.id) ?? []
      if (orderOps.length === 0) return null
      const dto = mapProductionOrder(order)
      return {
        ...dto,
        operations: orderOps.map((op) => {
          const opDto = mapProductionOperation(op)
          return {
            id: opDto.id,
            productionOrderId: opDto.productionOrderId,
            sequenceNo: opDto.sequenceNo,
            name: op.name,
            workCenterCode: opDto.workCenterCode,
            durationMinutes: opDto.durationMinutes,
            status: opDto.status,
            plannedStartAt: opDto.plannedStartAt,
            plannedEndAt: opDto.plannedEndAt,
          }
        }),
      }
    })
    .filter((o): o is NonNullable<typeof o> => o !== null)

  if (payloadOrders.length === 0) {
    throw new Error('NO_SCHEDULABLE_OPERATIONS')
  }

  return {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    productionOrderIds: options.productionOrderIds,
    orders: payloadOrders,
    horizonHours,
    objective,
    planningStartAt: planningStartAt.toISOString(),
  }
}

export function createCpsatJobId(): string {
  return randomUUID()
}
