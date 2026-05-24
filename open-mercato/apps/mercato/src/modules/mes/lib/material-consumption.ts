import type { EntityManager } from '@mikro-orm/postgresql'
import { MesMaterialConsumption, MesWorkOrder, MesWorkOrderOperation } from '../data/entities'
import { emitMesEvent } from '../events'
import { getLotByNumber } from './lots'

export type MesScope = { tenantId: string; organizationId: string }

export type ConsumptionDto = {
  id: string
  lotId: string
  lotNumber: string
  workOrderOperationId: string
  quantity: number
  consumedAt: string
}

export async function recordMaterialConsumption(
  em: EntityManager,
  scope: MesScope,
  operationId: string,
  lotNumber: string,
  quantity: number,
): Promise<ConsumptionDto> {
  const operation = await em.findOne(MesWorkOrderOperation, {
    id: operationId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!operation) throw new Error('OPERATION_NOT_FOUND')

  const lot = await getLotByNumber(em, scope, lotNumber)
  if (!lot) throw new Error('LOT_NOT_FOUND')
  if (lot.status !== 'active') throw new Error('LOT_NOT_ACTIVE')
  if (quantity > lot.quantity) throw new Error('INSUFFICIENT_LOT_QTY')

  const consumption = em.create(MesMaterialConsumption, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderOperationId: operation.id,
    lotId: lot.id,
    quantity,
  })

  lot.quantity -= quantity
  if (lot.quantity <= 0) {
    lot.quantity = 0
    lot.status = 'consumed'
  }

  await emitMesEvent('mes.material.consumed', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    workOrderOperationId: operation.id,
    workOrderId: operation.workOrderId,
    quantity,
  })

  return {
    id: consumption.id,
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    workOrderOperationId: operation.id,
    quantity,
    consumedAt: consumption.consumedAt.toISOString(),
  }
}
