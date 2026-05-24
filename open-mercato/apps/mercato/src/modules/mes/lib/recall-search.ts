import type { EntityManager } from '@mikro-orm/postgresql'
import { MesLot, MesMaterialConsumption, MesWorkOrder, MesWorkOrderOperation } from '../data/entities'
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
  }
}
