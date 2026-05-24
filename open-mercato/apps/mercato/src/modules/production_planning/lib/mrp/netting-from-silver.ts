import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningGenesisRoot,
  ProductionPlanningIfsSilverCustomerOrderLine,
  ProductionPlanningOrder,
} from '../../data/entities'
import type { OrgScope } from '../production-order'
import { stableUuidFromString } from '../stable-uuid'

export type SilverDemandBootstrapResult = {
  silverLinesRead: number
  rootsCreated: number
  rootsUpdated: number
  ordersLinked: number
}

/**
 * Materialize genesis roots from Mercato silver CO lines (pilot mirror, not IFS JDBC).
 */
export async function bootstrapGenesisFromSilver(
  em: EntityManager,
  scope: OrgScope,
): Promise<SilverDemandBootstrapResult> {
  const lines = await em.find(ProductionPlanningIfsSilverCustomerOrderLine, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    isDeleted: false,
  })

  let rootsCreated = 0
  let rootsUpdated = 0
  let ordersLinked = 0

  for (const line of lines) {
    const demandSourceId = `silver:co:${line.contract}:${line.orderNo}:${line.lineNo}`
    const rootId = stableUuidFromString(
      `genesis:root:${scope.tenantId}:${scope.organizationId}:${demandSourceId}`,
    )

    let root = await em.findOne(ProductionPlanningGenesisRoot, { id: rootId })
    const isNew = !root
    if (!root) {
      root = em.create(ProductionPlanningGenesisRoot, {
        id: rootId,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        demandSourceType: 'ifs_silver_customer_order_line',
        demandSourceId,
        salesOrderId: line.salesOrderId ?? null,
        productSku: line.partNo,
        quantity: Number(line.buyQtyDue),
        dueAt: line.wantedDeliveryDate ?? null,
        variantCode: 'default',
        status: 'pending',
      })
      em.persist(root)
      rootsCreated += 1
    } else {
      root.productSku = line.partNo
      root.quantity = Number(line.buyQtyDue)
      root.dueAt = line.wantedDeliveryDate ?? null
      rootsUpdated += 1
    }

    if (line.salesOrderId) {
      const orders = await em.find(ProductionPlanningOrder, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        salesOrderId: line.salesOrderId,
      })
      ordersLinked += orders.length
    }
  }

  await em.flush()

  return {
    silverLinesRead: lines.length,
    rootsCreated,
    rootsUpdated,
    ordersLinked,
  }
}
