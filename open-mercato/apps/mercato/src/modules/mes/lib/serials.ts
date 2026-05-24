import type { EntityManager } from '@mikro-orm/postgresql'
import { MesSerial } from '../data/entities'
import type { CreateSerialBody } from '../data/validators'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type SerialDto = {
  id: string
  serialNumber: string
  productCode: string
  workOrderId: string | null
  outputLotId: string | null
  status: string
}

function toDto(row: MesSerial): SerialDto {
  return {
    id: row.id,
    serialNumber: row.serialNumber,
    productCode: row.productCode,
    workOrderId: row.workOrderId ?? null,
    outputLotId: row.outputLotId ?? null,
    status: row.status,
  }
}

export async function getSerialByNumber(
  em: EntityManager,
  scope: MesScope,
  serialNumber: string,
): Promise<MesSerial | null> {
  return em.findOne(MesSerial, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    serialNumber: serialNumber.trim(),
  })
}

export async function createSerial(
  em: EntityManager,
  scope: MesScope,
  body: CreateSerialBody,
): Promise<SerialDto> {
  const existing = await getSerialByNumber(em, scope, body.serialNumber)
  if (existing) throw new Error('SERIAL_NUMBER_EXISTS')

  const row = em.create(MesSerial, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    serialNumber: body.serialNumber.trim(),
    productCode: body.productCode.trim(),
    workOrderId: body.workOrderId ?? null,
    outputLotId: body.outputLotId ?? null,
    status: 'active',
  })
  await em.persistAndFlush(row)

  await emitMesEvent('mes.serial.created', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    serialId: row.id,
    serialNumber: row.serialNumber,
  })

  return toDto(row)
}
