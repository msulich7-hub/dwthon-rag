import type { EntityManager } from '@mikro-orm/postgresql'
import { MesGenealogyEdge, MesLot, MesSerial, MesWorkOrder } from '../data/entities'
import { getLotByNumber } from './lots'
import { getSerialByNumber } from './serials'

export type MesScope = { tenantId: string; organizationId: string }

export type GenealogyNodeRef = {
  type: 'lot' | 'serial' | 'work_order'
  id: string
  label: string
  productCode?: string | null
}

export type GenealogyEdgeView = {
  id: string
  relation: string
  parent: GenealogyNodeRef
  child: GenealogyNodeRef
  quantity: number | null
  workOrderId: string | null
}

export type GenealogyTraceResult = {
  root: GenealogyNodeRef
  upstream: GenealogyEdgeView[]
  downstream: GenealogyEdgeView[]
}

async function resolveNode(
  em: EntityManager,
  scope: MesScope,
  type: 'lot' | 'serial' | 'work_order',
  id: string,
): Promise<GenealogyNodeRef> {
  if (type === 'lot') {
    const lot = await em.findOne(MesLot, {
      id,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
    return {
      type: 'lot',
      id,
      label: lot?.lotNumber ?? id,
      productCode: lot?.productCode ?? null,
    }
  }
  if (type === 'serial') {
    const serial = await em.findOne(MesSerial, {
      id,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
    return {
      type: 'serial',
      id,
      label: serial?.serialNumber ?? id,
      productCode: serial?.productCode ?? null,
    }
  }
  const wo = await em.findOne(MesWorkOrder, {
    id,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  return {
    type: 'work_order',
    id,
    label: wo?.orderNumber ?? id,
    productCode: wo?.productCode ?? null,
  }
}

async function edgeToView(
  em: EntityManager,
  scope: MesScope,
  edge: MesGenealogyEdge,
): Promise<GenealogyEdgeView> {
  const [parent, child] = await Promise.all([
    resolveNode(em, scope, edge.parentType, edge.parentId),
    resolveNode(em, scope, edge.childType, edge.childId),
  ])
  return {
    id: edge.id,
    relation: edge.relation,
    parent,
    child,
    quantity: edge.quantity ?? null,
    workOrderId: edge.workOrderId ?? null,
  }
}

export async function resolveGenealogyRoot(
  em: EntityManager,
  scope: MesScope,
  input: { lotNumber?: string; serialNumber?: string },
): Promise<GenealogyNodeRef | null> {
  if (input.lotNumber?.trim()) {
    const lot = await getLotByNumber(em, scope, input.lotNumber)
    if (!lot) return null
    return { type: 'lot', id: lot.id, label: lot.lotNumber, productCode: lot.productCode }
  }
  if (input.serialNumber?.trim()) {
    const serial = await getSerialByNumber(em, scope, input.serialNumber)
    if (!serial) return null
    return {
      type: 'serial',
      id: serial.id,
      label: serial.serialNumber,
      productCode: serial.productCode,
    }
  }
  return null
}

export async function traceGenealogy(
  em: EntityManager,
  scope: MesScope,
  root: GenealogyNodeRef,
  options: { direction?: 'upstream' | 'downstream' | 'both'; depth?: number },
): Promise<GenealogyTraceResult> {
  const depth = options.depth ?? 5
  const direction = options.direction ?? 'both'
  const upstream: GenealogyEdgeView[] = []
  const downstream: GenealogyEdgeView[] = []
  const seenUp = new Set<string>()
  const seenDown = new Set<string>()

  async function walkUpstream(nodeType: string, nodeId: string, level: number) {
    if (level > depth) return
    const key = `${nodeType}:${nodeId}`
    if (seenUp.has(key)) return
    seenUp.add(key)

    const edges = await em.find(MesGenealogyEdge, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      childType: nodeType as 'lot' | 'serial' | 'work_order',
      childId: nodeId,
    })

    for (const edge of edges) {
      upstream.push(await edgeToView(em, scope, edge))
      await walkUpstream(edge.parentType, edge.parentId, level + 1)
    }
  }

  async function walkDownstream(nodeType: string, nodeId: string, level: number) {
    if (level > depth) return
    const key = `${nodeType}:${nodeId}`
    if (seenDown.has(key)) return
    seenDown.add(key)

    const edges = await em.find(MesGenealogyEdge, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      parentType: nodeType as 'lot' | 'serial' | 'work_order',
      parentId: nodeId,
    })

    for (const edge of edges) {
      downstream.push(await edgeToView(em, scope, edge))
      await walkDownstream(edge.childType, edge.childId, level + 1)
    }
  }

  if (direction === 'upstream' || direction === 'both') {
    await walkUpstream(root.type, root.id, 1)
  }
  if (direction === 'downstream' || direction === 'both') {
    await walkDownstream(root.type, root.id, 1)
  }

  return { root, upstream, downstream }
}
