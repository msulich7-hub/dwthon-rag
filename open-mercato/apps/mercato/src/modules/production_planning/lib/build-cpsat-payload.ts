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
import { objectiveWeightsForSolve, normalizeObjectiveWeights } from './objective-weights'
import type { CpsatObjectiveWeights } from './ortools-bridge'
import type {
  CpsatAssemblyLink,
  CpsatFixedOperation,
  CpsatObjective,
  CpsatScheduleRequest,
} from './ortools-bridge'
import { loadWarmStartFixedOperations } from './warm-start-from-scenario'
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
  objectiveWeights?: CpsatObjectiveWeights | Record<string, number> | null
  fixedOperations?: CpsatFixedOperation[]
  warmStartScenarioId?: string | null
}

function mergeFixedOperations(
  ...groups: CpsatFixedOperation[][]
): CpsatFixedOperation[] {
  const byId = new Map<string, CpsatFixedOperation>()
  for (const group of groups) {
    for (const row of group) {
      byId.set(row.operationId, row)
    }
  }
  return [...byId.values()]
}

function filterFixedForOperationIds(
  fixed: CpsatFixedOperation[],
  operationIds: Set<string>,
): CpsatFixedOperation[] {
  return fixed.filter((f) => operationIds.has(f.operationId))
}

function attachChunkPayload(
  base: PayloadBase,
  orders: PayloadOrder[],
  assemblyLinks: CpsatAssemblyLink[],
  allFixed: CpsatFixedOperation[],
): CpsatScheduleRequest {
  const operationIds = new Set(orders.flatMap((o) => o.operations.map((op) => op.id)))
  return {
    ...base,
    orders,
    assemblyLinks,
    fixedOperations: filterFixedForOperationIds(allFixed, operationIds),
  }
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
  const objectiveWeights = objectiveWeightsForSolve(
    objective,
    normalizeObjectiveWeights(options.objectiveWeights ?? undefined),
  )

  return {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    productionOrderIds: options.productionOrderIds,
    horizonHours,
    objective,
    objectiveWeights,
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
  const opIds = new Set(payloadOrders.flatMap((o) => o.operations.map((op) => op.id)))
  let fixed = options.fixedOperations ?? []
  if (options.warmStartScenarioId) {
    const warm = await loadWarmStartFixedOperations(
      em,
      scope,
      options.warmStartScenarioId,
      opIds,
    )
    fixed = mergeFixedOperations(fixed, warm)
  }

  return attachChunkPayload(base, payloadOrders, assemblyLinks, fixed)
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
  const opIds = new Set(payloadOrders.flatMap((o) => o.operations.map((op) => op.id)))
  let fixed = options.fixedOperations ?? []
  if (options.warmStartScenarioId) {
    const warm = await loadWarmStartFixedOperations(
      em,
      scope,
      options.warmStartScenarioId,
      opIds,
    )
    fixed = mergeFixedOperations(fixed, warm)
  }

  if (totalOps <= maxOps) {
    return {
      batchId: createCpsatJobId(),
      totalOperations: totalOps,
      chunkCount: 1,
      maxOperationsPerSolve: maxOps,
      chunks: [attachChunkPayload(base, payloadOrders, assemblyLinks, fixed)],
    }
  }

  const batch = buildScheduleBatch(base, payloadOrders, {
    maxOperationsPerSolve: maxOps,
    batchId: createCpsatJobId(),
    assemblyLinks,
  })

  return {
    ...batch,
    chunks: batch.chunks.map((chunk) => {
      const chunkOpIds = new Set(chunk.orders.flatMap((o) => o.operations.map((op) => op.id)))
      return {
        ...chunk,
        fixedOperations: filterFixedForOperationIds(fixed, chunkOpIds),
      }
    }),
  }
}

export function createCpsatJobId(): string {
  return randomUUID()
}
