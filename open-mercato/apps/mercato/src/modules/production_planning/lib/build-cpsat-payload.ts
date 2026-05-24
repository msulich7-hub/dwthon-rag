import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'
import {
  ProductionPlanningOperation,
  ProductionPlanningOrder,
} from '../data/entities'
import type { OrgScope } from './production-order'
import { mapProductionOrder, mapProductionOperation } from './production-order'
import {
  buildScheduleBatch,
  type CpsatScheduleBatch,
  DEFAULT_MAX_OPERATIONS_PER_SOLVE,
  type PayloadOrder,
} from './cpsat-chunking'
import type { CpsatAssemblyLink, CpsatObjective, CpsatScheduleRequest } from './ortools-bridge'
import {
  buildCrossOrderAssemblyLinks,
  filterAssemblyLinksForOperationIds,
  mergeAssemblyLinks,
  type CpsatAssemblyLink as PegLink,
} from './pegging-to-assembly-links'

export { buildScheduleBatch, DEFAULT_MAX_OPERATIONS_PER_SOLVE }
export type { CpsatScheduleBatch }

export type BuildCpsatPayloadOptions = {
  productionOrderIds: string[]
  horizonHours?: number
  objective?: CpsatObjective
  planningStartAt?: Date
  maxOperationsPerSolve?: number
  enableRolling?: boolean
  assemblyLinks?: PegLink[]
  includeCrossOrderPegging?: boolean
}

type PayloadBase = Omit<CpsatScheduleRequest, 'orders' | 'chunk' | 'fixedOperations' | 'workCenterFloors'>

async function loadPayloadOrders(
  em: EntityManager,
  scope: OrgScope,
  productionOrderIds: string[],
): Promise<PayloadOrder[]> {
  const orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    id: { $in: productionOrderIds },
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
    .filter((o): o is PayloadOrder => o !== null)

  if (payloadOrders.length === 0) {
    throw new Error('NO_SCHEDULABLE_OPERATIONS')
  }

  return payloadOrders
}

function buildPayloadBase(
  scope: OrgScope,
  options: BuildCpsatPayloadOptions,
  planningStartAt: Date,
): PayloadBase {
  const horizonHours = options.horizonHours ?? 168
  const objective = options.objective ?? 'minimize_lateness'

  return {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    productionOrderIds: options.productionOrderIds,
    horizonHours,
    objective,
    planningStartAt: planningStartAt.toISOString(),
    slotSizeMinutes: 5,
    maxOperationsPerSolve: options.maxOperationsPerSolve ?? DEFAULT_MAX_OPERATIONS_PER_SOLVE,
    rolling:
      options.enableRolling !== false
        ? {
            enabled: undefined as boolean | undefined,
            windowHours: 168,
            overlapHours: 24,
          }
        : { enabled: false },
  }
}

function resolveAssemblyLinks(
  orders: PayloadOrder[],
  options: BuildCpsatPayloadOptions,
): CpsatAssemblyLink[] {
  const explicit = options.assemblyLinks ?? []
  const cross =
    options.includeCrossOrderPegging !== false
      ? buildCrossOrderAssemblyLinks(orders)
      : []
  return mergeAssemblyLinks(explicit, cross)
}

export async function buildCpsatScheduleRequest(
  em: EntityManager,
  scope: OrgScope,
  options: BuildCpsatPayloadOptions,
): Promise<CpsatScheduleRequest> {
  const planningStartAt = options.planningStartAt ?? new Date()
  const payloadOrders = await loadPayloadOrders(em, scope, options.productionOrderIds)
  const base = buildPayloadBase(scope, options, planningStartAt)
  const assemblyLinks = resolveAssemblyLinks(payloadOrders, options)

  return {
    ...base,
    orders: payloadOrders,
    assemblyLinks,
  }
}

export async function buildCpsatScheduleBatchFromDb(
  em: EntityManager,
  scope: OrgScope,
  options: BuildCpsatPayloadOptions,
): Promise<CpsatScheduleBatch> {
  const planningStartAt = options.planningStartAt ?? new Date()
  const payloadOrders = await loadPayloadOrders(em, scope, options.productionOrderIds)
  const base = buildPayloadBase(scope, options, planningStartAt)
  const maxOps = options.maxOperationsPerSolve ?? DEFAULT_MAX_OPERATIONS_PER_SOLVE
  const totalOps = payloadOrders.reduce((s, o) => s + o.operations.length, 0)

  const assemblyLinks = resolveAssemblyLinks(payloadOrders, options)

  if (totalOps <= maxOps) {
    return {
      batchId: createCpsatJobId(),
      totalOperations: totalOps,
      chunkCount: 1,
      maxOperationsPerSolve: maxOps,
      chunks: [{ ...base, orders: payloadOrders, assemblyLinks }],
    }
  }

  return buildScheduleBatch(base, payloadOrders, {
    maxOperationsPerSolve: maxOps,
    batchId: createCpsatJobId(),
    assemblyLinks,
  })
}

export function createCpsatJobId(): string {
  return randomUUID()
}
