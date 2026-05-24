import type { EntityManager } from '@mikro-orm/postgresql'
import { MesLot, MesProductionOutput, MesSerial, MesWorkOrder } from '../data/entities'
import type { RecordProductionOutputBody } from '../data/validators'
import { emitMesEvent } from '../events'
import { createGenealogyEdge } from './genealogy-edges'
import { listConsumptionsForWorkOrder } from './material-consumption-query'
import { createLot, getLotByNumber } from './lots'
import { createSerial, getSerialByNumber } from './serials'

export type MesScope = { tenantId: string; organizationId: string }

export type ProductionOutputDto = {
  id: string
  workOrderId: string
  outputLotId: string
  outputLotNumber: string
  serialId: string | null
  serialNumber: string | null
  productCode: string
  quantity: number
  producedAt: string
}

export async function recordProductionOutput(
  em: EntityManager,
  scope: MesScope,
  body: RecordProductionOutputBody,
): Promise<ProductionOutputDto> {
  const workOrder = await em.findOne(MesWorkOrder, {
    id: body.workOrderId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!workOrder) throw new Error('WORK_ORDER_NOT_FOUND')
  if (workOrder.status !== 'completed') throw new Error('WORK_ORDER_NOT_COMPLETED')

  const existing = await em.findOne(MesProductionOutput, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId: workOrder.id,
  })
  if (existing) throw new Error('OUTPUT_ALREADY_RECORDED')

  const qty = body.quantity ?? workOrder.quantity
  const outputLotNumber = body.outputLotNumber?.trim() || `OUT-${workOrder.orderNumber}`

  let outputLotEntity = await getLotByNumber(em, scope, outputLotNumber)
  if (!outputLotEntity) {
    await createLot(em, scope, {
      lotNumber: outputLotNumber,
      productCode: workOrder.productCode,
      quantity: qty,
      workOrderId: workOrder.id,
    })
    outputLotEntity = await getLotByNumber(em, scope, outputLotNumber)
  }
  if (!outputLotEntity) throw new Error('OUTPUT_LOT_FAILED')

  let serialId: string | null = null
  let serialNumber: string | null = null
  if (body.serialNumber?.trim()) {
    const sn = body.serialNumber.trim()
    const existingSerial = await getSerialByNumber(em, scope, sn)
    if (existingSerial) {
      serialId = existingSerial.id
      serialNumber = existingSerial.serialNumber
    } else {
      const created = await createSerial(em, scope, {
        serialNumber: sn,
        productCode: workOrder.productCode,
        workOrderId: workOrder.id,
        outputLotId: outputLotEntity.id,
      })
      serialId = created.id
      serialNumber = created.serialNumber
    }
  }

  const output = em.create(MesProductionOutput, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId: workOrder.id,
    outputLotId: outputLotEntity.id,
    serialId,
    productCode: workOrder.productCode,
    quantity: qty,
  })
  await em.persist(output)

  await createGenealogyEdge(em, scope, {
    relation: 'produce',
    parentType: 'work_order',
    parentId: workOrder.id,
    childType: 'lot',
    childId: outputLotEntity.id,
    workOrderId: workOrder.id,
    quantity: qty,
  })

  const consumptions = await listConsumptionsForWorkOrder(em, scope, workOrder.id)
  for (const row of consumptions) {
    await createGenealogyEdge(em, scope, {
      relation: 'consume',
      parentType: 'lot',
      parentId: row.lotId,
      childType: 'lot',
      childId: outputLotEntity.id,
      workOrderId: workOrder.id,
      quantity: row.quantity,
    })
  }

  await em.flush()

  await emitMesEvent('mes.production.output_recorded', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId: workOrder.id,
    outputLotId: outputLotEntity.id,
    serialId,
  })

  return {
    id: output.id,
    workOrderId: workOrder.id,
    outputLotId: outputLotEntity.id,
    outputLotNumber: outputLotEntity.lotNumber,
    serialId,
    serialNumber,
    productCode: workOrder.productCode,
    quantity: qty,
    producedAt: output.producedAt.toISOString(),
  }
}

export async function getProductionOutputForWorkOrder(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
): Promise<ProductionOutputDto | null> {
  const output = await em.findOne(MesProductionOutput, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workOrderId,
  })
  if (!output) return null

  const lot = await em.findOne(MesLot, { id: output.outputLotId })
  const serial = output.serialId ? await em.findOne(MesSerial, { id: output.serialId }) : null

  return {
    id: output.id,
    workOrderId: output.workOrderId,
    outputLotId: output.outputLotId,
    outputLotNumber: lot?.lotNumber ?? output.outputLotId,
    serialId: output.serialId ?? null,
    serialNumber: serial?.serialNumber ?? null,
    productCode: output.productCode,
    quantity: output.quantity,
    producedAt: output.producedAt.toISOString(),
  }
}
