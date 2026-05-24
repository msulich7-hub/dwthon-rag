import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningGenesisNode, ProductionPlanningGenesisRoot } from '../../data/entities'
import type { OrgScope } from '../production-order'
import { explodeBom } from './explode'
import { computeNetRequirements } from './net-requirements'
import { buildMercatoSupplySnapshot } from './supply-snapshot'

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
  parentNodeKey: string | null
  grossQty?: number
  supplyQty?: number
  netQty?: number
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
): Promise<{
  root: GenesisRootDto
  nodes: GenesisNodeDto[]
  netRequirements?: ReturnType<typeof computeNetRequirements>
} | null> {
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

  const supplyLines = await buildMercatoSupplySnapshot(em, scope)
  const supplyBySku = new Map(supplyLines.map((s) => [s.productSku, s]))
  const exploded = explodeBom({
    rootSku: root.productSku,
    quantity: Number(root.quantity),
    requestedDate: root.dueAt,
    maxDepth: 6,
  })
  const netReq = computeNetRequirements(exploded, supplyBySku)
  const netByKey = new Map(netReq.map((n) => [n.nodeKey, n]))

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
    nodes: nodes.map((n) => {
      const parent = n.parentNodeId ? nodes.find((p) => p.id === n.parentNodeId) : undefined
      const net = netByKey.get(n.nodeKey)
      return {
        id: n.id,
        nodeKey: n.nodeKey,
        level: n.level,
        nodeType: n.nodeType,
        productSku: n.productSku,
        extendedQty: Number(n.extendedQty),
        parentNodeId: n.parentNodeId ?? null,
        parentNodeKey: parent?.nodeKey ?? null,
        grossQty: net?.grossQty,
        supplyQty: net?.supplyQty,
        netQty: net?.netQty,
      }
    }),
    netRequirements: netReq,
  }
}
