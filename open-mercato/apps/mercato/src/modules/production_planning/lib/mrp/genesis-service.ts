import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningGenesisNode, ProductionPlanningGenesisRoot } from '../../data/entities'
import type { OrgScope } from '../production-order'

export type GenesisRootDto = {
  id: string
  demandSourceType: string
  demandSourceId: string
  salesOrderId: string | null
  productSku: string
  quantity: number
  dueAt: string | null
  status: string
  nodeCount: number
}

export type GenesisNodeDto = {
  id: string
  nodeKey: string
  level: number
  nodeType: string
  productSku: string
  extendedQty: number
  parentNodeId: string | null
}

export async function listGenesisRoots(
  em: EntityManager,
  scope: OrgScope,
  options?: { limit?: number; status?: string },
): Promise<GenesisRootDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (options?.status) where.status = options.status

  const roots = await em.find(ProductionPlanningGenesisRoot, where, {
    orderBy: { dueAt: 'ASC' },
    limit: options?.limit ?? 50,
  })

  const result: GenesisRootDto[] = []
  for (const root of roots) {
    const nodeCount = await em.count(ProductionPlanningGenesisNode, {
      genesisRootId: root.id,
    })
    result.push({
      id: root.id,
      demandSourceType: root.demandSourceType,
      demandSourceId: root.demandSourceId,
      salesOrderId: root.salesOrderId ?? null,
      productSku: root.productSku,
      quantity: Number(root.quantity),
      dueAt: root.dueAt?.toISOString() ?? null,
      status: root.status,
      nodeCount,
    })
  }
  return result
}

export async function getGenesisTree(
  em: EntityManager,
  scope: OrgScope,
  rootId: string,
): Promise<{ root: GenesisRootDto; nodes: GenesisNodeDto[] } | null> {
  const root = await em.findOne(ProductionPlanningGenesisRoot, {
    id: rootId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!root) return null

  const nodes = await em.find(
    ProductionPlanningGenesisNode,
    { genesisRootId: rootId },
    { orderBy: { level: 'ASC', nodeKey: 'ASC' } },
  )

  return {
    root: {
      id: root.id,
      demandSourceType: root.demandSourceType,
      demandSourceId: root.demandSourceId,
      salesOrderId: root.salesOrderId ?? null,
      productSku: root.productSku,
      quantity: Number(root.quantity),
      dueAt: root.dueAt?.toISOString() ?? null,
      status: root.status,
      nodeCount: nodes.length,
    },
    nodes: nodes.map((n) => ({
      id: n.id,
      nodeKey: n.nodeKey,
      level: n.level,
      nodeType: n.nodeType,
      productSku: n.productSku,
      extendedQty: Number(n.extendedQty),
      parentNodeId: n.parentNodeId ?? null,
    })),
  }
}
