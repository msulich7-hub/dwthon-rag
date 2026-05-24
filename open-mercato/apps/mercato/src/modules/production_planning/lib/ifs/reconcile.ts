import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningIfsSilverCustomerOrderLine,
  ProductionPlanningIfsSilverShopOrder,
  ProductionPlanningIfsSilverShopOrderOperation,
  ProductionPlanningOperation,
  ProductionPlanningOrder,
} from '../../data/entities'
import { isPoolNettingOrderCode } from './extract-pilot'
import type { OrgScope } from '../production-order'

export type IfsSilverReconcileResult = {
  withinTolerance: boolean
  tolerancePct: number
  checks: Array<{
    entity: string
    liveCount: number
    silverCount: number
    liveQty?: number
    silverQty?: number
    deltaPct: number
    ok: boolean
  }>
}

const DEFAULT_TOLERANCE_PCT = 0.1

export async function reconcileIfsSilverPilot(
  em: EntityManager,
  scope: OrgScope,
  options?: { tolerancePct?: number },
): Promise<IfsSilverReconcileResult> {
  const tolerancePct = options?.tolerancePct ?? DEFAULT_TOLERANCE_PCT

  const allLiveOrders = await em.find(
    ProductionPlanningOrder,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: { $nin: ['cancelled'] },
    },
    { fields: ['id', 'code', 'salesOrderId', 'quantity'] },
  )
  const liveOrders = allLiveOrders.filter((o) => !isPoolNettingOrderCode(o.code))
  const liveOrderCount = liveOrders.length
  const liveCoDemandCount = liveOrders.filter((o) => Boolean(o.salesOrderId)).length

  const silverOrders = await em.count(ProductionPlanningIfsSilverShopOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isDeleted: false,
  })

  const liveOrderIds = liveOrders.map((o) => o.id)
  const liveOps =
    liveOrderIds.length > 0
      ? await em.count(ProductionPlanningOperation, {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          status: { $nin: ['cancelled'] },
          productionOrderId: { $in: liveOrderIds },
        })
      : 0
  const silverCoLines = await em.count(ProductionPlanningIfsSilverCustomerOrderLine, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isDeleted: false,
  })
  const silverOps = await em.count(ProductionPlanningIfsSilverShopOrderOperation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isDeleted: false,
  })

  const liveQtySum = liveOrders.reduce((s, o) => s + Number(o.quantity), 0)
  const silverOrderRows = await em.find(
    ProductionPlanningIfsSilverShopOrder,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      isDeleted: false,
    },
    { fields: ['revisedQtyDue'] },
  )
  const silverQtySum = silverOrderRows.reduce((s, o) => s + Number(o.revisedQtyDue), 0)

  const silverCoRows = await em.find(
    ProductionPlanningIfsSilverCustomerOrderLine,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      isDeleted: false,
    },
    { fields: ['buyQtyDue'] },
  )
  const silverCoQty = silverCoRows.reduce((s, l) => s + Number(l.buyQtyDue), 0)
  const liveCoQty = liveOrders
    .filter((o) => Boolean(o.salesOrderId))
    .reduce((s, o) => s + Number(o.quantity), 0)

  const checks = [
    compareCounts('shop_orders', liveOrderCount, silverOrders, tolerancePct),
    compareCounts('shop_order_operations', liveOps, silverOps, tolerancePct),
    compareCounts('customer_order_lines', liveCoDemandCount, silverCoLines, tolerancePct),
    compareQty('shop_order_qty', liveQtySum, silverQtySum, tolerancePct),
    compareQty('customer_order_line_qty', liveCoQty, silverCoQty, tolerancePct),
  ]

  return {
    withinTolerance: checks.every((c) => c.ok),
    tolerancePct,
    checks,
  }
}

function compareCounts(
  entity: string,
  liveCount: number,
  silverCount: number,
  tolerancePct: number,
): IfsSilverReconcileResult['checks'][number] {
  const base = Math.max(liveCount, 1)
  const deltaPct = Math.abs(liveCount - silverCount) / base * 100
  return {
    entity,
    liveCount,
    silverCount,
    deltaPct: Math.round(deltaPct * 1000) / 1000,
    ok: deltaPct <= tolerancePct || (liveCount === 0 && silverCount === 0),
  }
}

function compareQty(
  entity: string,
  liveQty: number,
  silverQty: number,
  tolerancePct: number,
): IfsSilverReconcileResult['checks'][number] {
  const base = Math.max(liveQty, 1)
  const deltaPct = Math.abs(liveQty - silverQty) / base * 100
  return {
    entity,
    liveCount: 0,
    silverCount: 0,
    liveQty: Math.round(liveQty * 1000) / 1000,
    silverQty: Math.round(silverQty * 1000) / 1000,
    deltaPct: Math.round(deltaPct * 1000) / 1000,
    ok: deltaPct <= tolerancePct || (liveQty === 0 && silverQty === 0),
  }
}
