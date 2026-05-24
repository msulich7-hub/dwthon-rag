import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'
import {
  ProductionPlanningIfsSilverCustomerOrderLine,
  ProductionPlanningIfsSilverExtractWatermark,
  ProductionPlanningIfsSilverShopOrder,
  ProductionPlanningIfsSilverShopOrderOperation,
  ProductionPlanningIfsSilverSupplyDemandPeg,
  ProductionPlanningIfsSilverWorkCenter,
  ProductionPlanningOperation,
  ProductionPlanningOrder,
  ProductionPlanningPeggingLink,
} from '../../data/entities'
import { recordIfsStagingBatch } from './staging-batch'
import type { OrgScope } from '../production-order'
import { FACTORY_ORDER_CODE_PREFIX } from '../seed-factory-fixture'
import { stableUuidFromString } from '../stable-uuid'

const SOURCE_SYSTEM = process.env.PRODUCTION_PLANNING_IFS_SOURCE ?? 'mercato_pilot'
const CONTRACT = 'MAIN'

/** Pool MO from netting are Mercato-authored — exclude from silver to avoid SoR loop. */
export function isPoolNettingOrderCode(code: string): boolean {
  return code.includes(`${FACTORY_ORDER_CODE_PREFIX}POOL-NET-`)
}

export type IfsSilverExtractResult = {
  batchId: string
  extractedAt: string
  counts: {
    customerOrderLines: number
    shopOrders: number
    shopOrderOperations: number
    supplyDemandPegs: number
    workCenters: number
  }
  watermarks: Array<{ entityName: string; rowCount: number; lagSeconds: number }>
}

function departmentFromWc(code: string): string | null {
  const m = code.match(/^WC-([A-Z]+)-/)
  return m?.[1] ?? null
}

async function upsertWatermark(
  em: EntityManager,
  scope: OrgScope,
  entityName: string,
  batchId: string,
  rowCount: number,
  watermarkValue: string,
): Promise<ProductionPlanningIfsSilverExtractWatermark> {
  const id = stableUuidFromString(
    `pp:ifs:wm:${scope.tenantId}:${scope.organizationId}:${entityName}`,
  )
  let row = await em.findOne(ProductionPlanningIfsSilverExtractWatermark, { id })
  const now = new Date()
  if (!row) {
    row = em.create(ProductionPlanningIfsSilverExtractWatermark, {
      id,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      entityName,
      sourceSystem: SOURCE_SYSTEM,
    })
  }
  row.watermarkValue = watermarkValue
  row.lastExtractBatchId = batchId
  row.lastSuccessAt = now
  row.rowCount = rowCount
  row.lagSeconds = 0
  row.updatedAt = now
  em.persist(row)
  return row
}

export async function runIfsSilverExtractPilot(
  em: EntityManager,
  scope: OrgScope,
  options?: { contract?: string },
): Promise<IfsSilverExtractResult> {
  const contract = options?.contract ?? CONTRACT
  const batchId = randomUUID()
  const extractedAt = new Date()
  const lastSeenAt = extractedAt

  const allOrders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $nin: ['cancelled'] },
  })
  const orders = allOrders.filter((o) => !isPoolNettingOrderCode(o.code))

  const orderIds = new Set(orders.map((o) => o.id))
  const operations = (
    await em.find(ProductionPlanningOperation, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: { $nin: ['cancelled'] },
    })
  ).filter((op) => orderIds.has(op.productionOrderId))

  const pegLinks = await em.find(ProductionPlanningPeggingLink, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  const orderById = new Map(orders.map((o) => [o.id, o]))
  const wcCodes = new Set<string>()

  let coLineCount = 0
  let lineNo = 0
  for (const order of orders) {
    if (!order.salesOrderId) continue
    lineNo += 1
    const id = stableUuidFromString(
      `pp:ifs:co:${scope.tenantId}:${scope.organizationId}:${contract}:${order.salesOrderId}:${lineNo}`,
    )
    const row =
      (await em.findOne(ProductionPlanningIfsSilverCustomerOrderLine, { id })) ??
      em.create(ProductionPlanningIfsSilverCustomerOrderLine, {
        id,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        contract,
        orderNo: `SO-${order.salesOrderId.slice(0, 8)}`,
        lineNo,
        partNo: order.productSku ?? 'UNKNOWN',
        sourceSystem: SOURCE_SYSTEM,
        extractBatchId: batchId,
        extractedAt,
        lastSeenAt,
      })
    row.buyQtyDue = order.quantity
    row.wantedDeliveryDate = order.dueAt ?? null
    row.salesOrderId = order.salesOrderId
    row.isDeleted = false
    row.lastSeenAt = lastSeenAt
    row.extractBatchId = batchId
    row.extractedAt = extractedAt
    em.persist(row)
    coLineCount += 1
  }

  let shopOrderCount = 0
  for (const order of orders) {
    shopOrderCount += 1
    const id = stableUuidFromString(
      `pp:ifs:shop:${scope.tenantId}:${scope.organizationId}:${contract}:${order.code}`,
    )
    const row =
      (await em.findOne(ProductionPlanningIfsSilverShopOrder, { id })) ??
      em.create(ProductionPlanningIfsSilverShopOrder, {
        id,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        contract,
        orderNo: order.code,
        partNo: order.productSku ?? 'UNKNOWN',
        sourceSystem: SOURCE_SYSTEM,
        extractBatchId: batchId,
        extractedAt,
        lastSeenAt,
      })
    row.revisedQtyDue = order.quantity
    row.revisedDueDate = order.dueAt ?? order.plannedEndAt ?? null
    row.orderCode = order.code
    row.productionOrderId = order.id
    row.isDeleted = false
    row.lastSeenAt = lastSeenAt
    row.extractBatchId = batchId
    row.extractedAt = extractedAt
    em.persist(row)
  }

  let shopOpCount = 0
  for (const op of operations) {
    const order = orderById.get(op.productionOrderId)
    if (!order) continue
    shopOpCount += 1
    wcCodes.add(op.workCenterCode)
    const id = stableUuidFromString(
      `pp:ifs:shopop:${scope.tenantId}:${scope.organizationId}:${contract}:${order.code}:${op.sequenceNo}`,
    )
    const row =
      (await em.findOne(ProductionPlanningIfsSilverShopOrderOperation, { id })) ??
      em.create(ProductionPlanningIfsSilverShopOrderOperation, {
        id,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        contract,
        orderNo: order.code,
        releaseNo: 1,
        sequenceNo: op.sequenceNo,
        operationNo: op.sequenceNo,
        workCenterNo: op.workCenterCode,
        runTimeMinutes: op.durationMinutes,
        operationId: op.id,
        sourceSystem: SOURCE_SYSTEM,
        extractBatchId: batchId,
        extractedAt,
        lastSeenAt,
      })
    row.runTimeMinutes = op.durationMinutes
    row.workCenterNo = op.workCenterCode
    row.isDeleted = false
    row.lastSeenAt = lastSeenAt
    row.extractBatchId = batchId
    row.extractedAt = extractedAt
    em.persist(row)
  }

  let pegCount = 0
  for (const link of pegLinks) {
    const order = orderById.get(link.productionOrderId)
    if (!order) continue
    pegCount += 1
    const id = stableUuidFromString(
      `pp:ifs:peg:${scope.tenantId}:${scope.organizationId}:${link.id}`,
    )
    const demandCode = order.salesOrderId ? `DEM-SO-${order.salesOrderId.slice(0, 8)}` : `DEM-${order.code}`
    const supplyCode = `SUP-${order.code}`
    const row =
      (await em.findOne(ProductionPlanningIfsSilverSupplyDemandPeg, { id })) ??
      em.create(ProductionPlanningIfsSilverSupplyDemandPeg, {
        id,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        contract,
        demandCode,
        supplyCode,
        demandOrderNo: order.salesOrderId ? `SO-${order.salesOrderId.slice(0, 8)}` : order.code,
        supplyOrderNo: order.code,
        sourceSystem: SOURCE_SYSTEM,
        extractBatchId: batchId,
        extractedAt,
        lastSeenAt,
      })
    row.qtyPegged = link.quantity
    row.isDeleted = false
    row.lastSeenAt = lastSeenAt
    row.extractBatchId = batchId
    row.extractedAt = extractedAt
    em.persist(row)
  }

  let wcCount = 0
  for (const wc of wcCodes) {
    wcCount += 1
    const id = stableUuidFromString(
      `pp:ifs:wc:${scope.tenantId}:${scope.organizationId}:${contract}:${wc}`,
    )
    const row =
      (await em.findOne(ProductionPlanningIfsSilverWorkCenter, { id })) ??
      em.create(ProductionPlanningIfsSilverWorkCenter, {
        id,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        contract,
        workCenterNo: wc,
        sourceSystem: SOURCE_SYSTEM,
        extractBatchId: batchId,
        extractedAt,
        lastSeenAt,
      })
    row.description = wc
    row.department = departmentFromWc(wc)
    row.isDeleted = false
    row.lastSeenAt = lastSeenAt
    row.extractBatchId = batchId
    row.extractedAt = extractedAt
    em.persist(row)
  }

  const wmValue = extractedAt.toISOString()
  const watermarks = await Promise.all([
    upsertWatermark(em, scope, 'CUSTOMER_ORDER_LINE', batchId, coLineCount, wmValue),
    upsertWatermark(em, scope, 'SHOP_ORDER', batchId, shopOrderCount, wmValue),
    upsertWatermark(em, scope, 'SHOP_ORDER_OPERATION', batchId, shopOpCount, wmValue),
    upsertWatermark(em, scope, 'SUPPLY_DEMAND_PEG', batchId, pegCount, wmValue),
    upsertWatermark(em, scope, 'WORK_CENTER', batchId, wcCount, wmValue),
  ])

  await recordIfsStagingBatch(em, scope, {
    batchType: 'pilot_sync',
    rowCount: coLineCount + shopOrderCount + shopOpCount + pegCount + wcCount,
    watermarkAt: extractedAt,
    stats: {
      batchId,
      contract,
      coLineCount,
      shopOrderCount,
      shopOpCount,
      pegCount,
      wcCount,
    },
  })

  await em.flush()

  return {
    batchId,
    extractedAt: extractedAt.toISOString(),
    counts: {
      customerOrderLines: coLineCount,
      shopOrders: shopOrderCount,
      shopOrderOperations: shopOpCount,
      supplyDemandPegs: pegCount,
      workCenters: wcCount,
    },
    watermarks: watermarks.map((w) => ({
      entityName: w.entityName,
      rowCount: w.rowCount,
      lagSeconds: w.lagSeconds,
    })),
  }
}

export async function getIfsSilverExtractStatus(
  em: EntityManager,
  scope: OrgScope,
): Promise<{
  sourceSystem: string
  contract: string
  entities: Array<{
    entityName: string
    rowCount: number
    lagSeconds: number
    lastSuccessAt: string | null
    lastExtractBatchId: string | null
  }>
}> {
  const rows = await em.find(ProductionPlanningIfsSilverExtractWatermark, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  return {
    sourceSystem: SOURCE_SYSTEM,
    contract: CONTRACT,
    entities: rows
      .sort((a, b) => a.entityName.localeCompare(b.entityName))
      .map((r) => ({
        entityName: r.entityName,
        rowCount: r.rowCount,
        lagSeconds: r.lagSeconds,
        lastSuccessAt: r.lastSuccessAt?.toISOString() ?? null,
        lastExtractBatchId: r.lastExtractBatchId ?? null,
      })),
  }
}
