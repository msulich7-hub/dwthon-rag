import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningOrder } from '../../data/entities'
import type { OrgScope } from '../production-order'

export type SupplySnapshotLine = {
  productSku: string
  onHandQty: number
  wipQty: number
  scheduledReceiptQty: number
  source: 'mercato_derived'
}

/**
 * Mercato-derived supply snapshot (no inventory ETL). WIP = in_progress MO qty; receipts = planned MO.
 */
export async function buildMercatoSupplySnapshot(
  em: EntityManager,
  scope: OrgScope,
): Promise<SupplySnapshotLine[]> {
  const orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $nin: ['cancelled'] },
  })

  const bySku = new Map<string, SupplySnapshotLine>()

  for (const order of orders) {
    const sku = order.productSku?.trim() || 'UNKNOWN'
    const row = bySku.get(sku) ?? {
      productSku: sku,
      onHandQty: 0,
      wipQty: 0,
      scheduledReceiptQty: 0,
      source: 'mercato_derived' as const,
    }
    const qty = Number(order.quantity)
    if (order.status === 'in_progress') row.wipQty += qty
    else if (order.status === 'planned' || order.status === 'draft') row.scheduledReceiptQty += qty
    bySku.set(sku, row)
  }

  return [...bySku.values()].sort((a, b) => a.productSku.localeCompare(b.productSku))
}
