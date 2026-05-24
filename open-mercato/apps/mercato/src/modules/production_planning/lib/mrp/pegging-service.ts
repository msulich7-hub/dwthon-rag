import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningGenesisRoot,
  ProductionPlanningOrder,
  ProductionPlanningPeggingLink,
} from '../../data/entities'
import { FACTORY_ORDER_CODE_PREFIX } from '../seed-factory-fixture'
import type { OrgScope } from '../production-order'

export type PoolOrderWorkbenchRow = {
  poolOrderId: string
  poolOrderCode: string
  productSku: string | null
  quantity: number
  dueAt: string | null
  memberCount: number
  peggingLinks: Array<{
    genesisRootId: string
    demandSku: string
    quantity: number
    demandSourceId: string
  }>
}

export async function listPoolOrdersWorkbench(
  em: EntityManager,
  scope: OrgScope,
  options?: { limit?: number },
): Promise<PoolOrderWorkbenchRow[]> {
  const limit = options?.limit ?? 50
  const poolOrders = await em.find(
    ProductionPlanningOrder,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      code: { $like: `%${FACTORY_ORDER_CODE_PREFIX}POOL-NET-%` },
    },
    { orderBy: { dueAt: 'ASC' }, limit },
  )

  const rows: PoolOrderWorkbenchRow[] = []
  for (const pool of poolOrders) {
    const links = await em.find(ProductionPlanningPeggingLink, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      productionOrderId: pool.id,
    })
    const peggingLinks: PoolOrderWorkbenchRow['peggingLinks'] = []
    for (const link of links) {
      const root = await em.findOne(ProductionPlanningGenesisRoot, { id: link.genesisRootId })
      peggingLinks.push({
        genesisRootId: link.genesisRootId,
        demandSku: root?.productSku ?? '—',
        quantity: Number(link.quantity),
        demandSourceId: root?.demandSourceId ?? '—',
      })
    }
    rows.push({
      poolOrderId: pool.id,
      poolOrderCode: pool.code,
      productSku: pool.productSku ?? null,
      quantity: Number(pool.quantity),
      dueAt: pool.dueAt?.toISOString() ?? null,
      memberCount: peggingLinks.length,
      peggingLinks,
    })
  }
  return rows
}
