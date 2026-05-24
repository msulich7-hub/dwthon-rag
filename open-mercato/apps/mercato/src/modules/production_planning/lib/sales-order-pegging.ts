import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningGenesisRoot,
  ProductionPlanningOrder,
  ProductionPlanningPeggingLink,
} from '../data/entities'
import type { OrgScope } from '../production-order'

export type SalesOrderPeggingView = {
  salesOrderId: string
  productionOrders: Array<{
    id: string
    code: string
    status: string
    productSku: string | null
    poolOrderId: string | null
  }>
  genesisRoots: Array<{
    id: string
    productSku: string
    quantity: number
    status: string
    demandSourceId: string
  }>
  peggingLinks: Array<{
    genesisRootId: string
    productionOrderId: string
    poolOrderCode: string | null
    quantity: number
  }>
}

export async function buildSalesOrderPeggingView(
  em: EntityManager,
  scope: OrgScope,
  salesOrderId: string,
): Promise<SalesOrderPeggingView> {
  const productionOrders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    salesOrderId,
  })

  const genesisRoots = await em.find(ProductionPlanningGenesisRoot, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    salesOrderId,
  })

  const rootIds = genesisRoots.map((r) => r.id)
  const peggingLinks =
    rootIds.length > 0
      ? await em.find(ProductionPlanningPeggingLink, {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          genesisRootId: { $in: rootIds },
        })
      : []

  const poolById = new Map<string, ProductionPlanningOrder>()
  for (const link of peggingLinks) {
    if (!poolById.has(link.productionOrderId)) {
      const pool = await em.findOne(ProductionPlanningOrder, { id: link.productionOrderId })
      if (pool) poolById.set(link.productionOrderId, pool)
    }
  }

  return {
    salesOrderId,
    productionOrders: productionOrders.map((o) => {
      let poolOrderId: string | null = null
      if (o.notesJson) {
        try {
          const n = JSON.parse(o.notesJson) as { poolOrderId?: string }
          poolOrderId = n.poolOrderId ?? null
        } catch {
          poolOrderId = null
        }
      }
      return {
        id: o.id,
        code: o.code,
        status: o.status,
        productSku: o.productSku ?? null,
        poolOrderId,
      }
    }),
    genesisRoots: genesisRoots.map((r) => ({
      id: r.id,
      productSku: r.productSku,
      quantity: Number(r.quantity),
      status: r.status,
      demandSourceId: r.demandSourceId,
    })),
    peggingLinks: peggingLinks.map((l) => ({
      genesisRootId: l.genesisRootId,
      productionOrderId: l.productionOrderId,
      poolOrderCode: poolById.get(l.productionOrderId)?.code ?? null,
      quantity: Number(l.quantity),
    })),
  }
}
