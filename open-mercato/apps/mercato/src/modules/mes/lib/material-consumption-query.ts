import type { EntityManager } from '@mikro-orm/postgresql'
import { MesLot, MesMaterialConsumption, MesWorkOrderOperation } from '../data/entities'

export type MesScope = { tenantId: string; organizationId: string }

export type ConsumptionRow = {
  id: string
  lotId: string
  lotNumber: string
  quantity: number
  workOrderOperationId: string
}

export async function listConsumptionsForWorkOrder(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
): Promise<ConsumptionRow[]> {
  const operations = await em.find(MesWorkOrderOperation, {
    workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const opIds = operations.map((op) => op.id)
  if (opIds.length === 0) return []

  const consumptions = await em.find(MesMaterialConsumption, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderOperationId: { $in: opIds },
  })

  const rows: ConsumptionRow[] = []
  for (const c of consumptions) {
    const lot = await em.findOne(MesLot, { id: c.lotId })
    rows.push({
      id: c.id,
      lotId: c.lotId,
      lotNumber: lot?.lotNumber ?? c.lotId,
      quantity: c.quantity,
      workOrderOperationId: c.workOrderOperationId,
    })
  }
  return rows
}
