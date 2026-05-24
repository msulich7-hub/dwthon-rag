import type { EntityManager } from '@mikro-orm/postgresql'
import { MesLot, MesMaterialConsumption, MesWorkOrder, MesWorkOrderOperation } from '../data/entities'
import { resolveGenealogyRoot, traceGenealogy } from './genealogy-trace'
import { getLotByNumber } from './lots'

export type MesScope = { tenantId: string; organizationId: string }

export type RecallHit = {
  lot: {
    id: string
    lotNumber: string
    productCode: string
    quantity: number
    status: string
    workOrderId: string | null
  }
  consumptions: Array<{
    id: string
    quantity: number
    consumedAt: string
    operationId: string
    operationCode: string
    operationName: string
    workOrderId: string
    orderNumber: string
  }>
  genealogy: {
    upstreamCount: number
    downstreamCount: number
    upstream: Array<{ relation: string; parentLabel: string; childLabel: string; quantity: number | null }>
    downstream: Array<{ relation: string; parentLabel: string; childLabel: string; quantity: number | null }>
  } | null
}

export async function searchRecallByLotNumber(
  em: EntityManager,
  scope: MesScope,
  lotNumber: string,
): Promise<RecallHit | null> {
  const lot = await getLotByNumber(em, scope, lotNumber)
  if (!lot) return null

  const consumptions = await em.find(MesMaterialConsumption, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    lotId: lot.id,
  })

  const hits: RecallHit['consumptions'] = []

  for (const row of consumptions) {
    const operation = await em.findOne(MesWorkOrderOperation, { id: row.workOrderOperationId })
    if (!operation) continue
    const workOrder = await em.findOne(MesWorkOrder, {
      id: operation.workOrderId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
    hits.push({
      id: row.id,
      quantity: row.quantity,
      consumedAt: row.consumedAt.toISOString(),
      operationId: operation.id,
      operationCode: operation.operationCode,
      operationName: operation.operationName,
      workOrderId: operation.workOrderId,
      orderNumber: workOrder?.orderNumber ?? operation.workOrderId,
    })
  }

  let genealogy: RecallHit['genealogy'] = null
  const root = await resolveGenealogyRoot(em, scope, { lotNumber: lot.lotNumber })
  if (root) {
    const trace = await traceGenealogy(em, scope, root, { direction: 'both', depth: 3 })
    genealogy = {
      upstreamCount: trace.upstream.length,
      downstreamCount: trace.downstream.length,
      upstream: trace.upstream.slice(0, 8).map((edge) => ({
        relation: edge.relation,
        parentLabel: edge.parent.label,
        childLabel: edge.child.label,
        quantity: edge.quantity,
      })),
      downstream: trace.downstream.slice(0, 8).map((edge) => ({
        relation: edge.relation,
        parentLabel: edge.parent.label,
        childLabel: edge.child.label,
        quantity: edge.quantity,
      })),
    }
  }

  return {
    lot: {
      id: lot.id,
      lotNumber: lot.lotNumber,
      productCode: lot.productCode,
      quantity: lot.quantity,
      status: lot.status,
      workOrderId: lot.workOrderId ?? null,
    },
    consumptions: hits,
    genealogy,
  }
}
