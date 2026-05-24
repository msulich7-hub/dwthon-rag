import type { EntityManager } from '@mikro-orm/postgresql'
import { MesLot, type MesLotStatus } from '../data/entities'
import type { CreateLotBody } from '../data/validators'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type LotDto = {
  id: string
  lotNumber: string
  productCode: string
  quantity: number
  status: MesLotStatus
  workOrderId: string | null
  notes: string | null
  createdAt: string
}

function toDto(lot: MesLot): LotDto {
  return {
    id: lot.id,
    lotNumber: lot.lotNumber,
    productCode: lot.productCode,
    quantity: lot.quantity,
    status: lot.status,
    workOrderId: lot.workOrderId ?? null,
    notes: lot.notes ?? null,
    createdAt: lot.createdAt.toISOString(),
  }
}

export async function listLots(
  em: EntityManager,
  scope: MesScope,
  filters: {
    productCode?: string
    workOrderId?: string
    status?: MesLotStatus
    limit?: number
  },
): Promise<LotDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters.productCode) where.productCode = filters.productCode
  if (filters.workOrderId) where.workOrderId = filters.workOrderId
  if (filters.status) where.status = filters.status

  const lots = await em.find(MesLot, where, {
    orderBy: { createdAt: 'DESC' },
    limit: filters.limit ?? 100,
  })
  return lots.map(toDto)
}

export async function getLotByNumber(
  em: EntityManager,
  scope: MesScope,
  lotNumber: string,
): Promise<MesLot | null> {
  return em.findOne(MesLot, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    lotNumber: lotNumber.trim(),
  })
}

export async function createLot(
  em: EntityManager,
  scope: MesScope,
  body: CreateLotBody,
): Promise<LotDto> {
  const existing = await getLotByNumber(em, scope, body.lotNumber)
  if (existing) throw new Error('LOT_NUMBER_EXISTS')

  const lot = em.create(MesLot, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    lotNumber: body.lotNumber.trim(),
    productCode: body.productCode.trim(),
    quantity: body.quantity,
    status: 'active',
    workOrderId: body.workOrderId ?? null,
    notes: body.notes?.trim() ?? null,
  })
  await em.persistAndFlush(lot)

  await emitMesEvent('mes.lot.created', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    productCode: lot.productCode,
  })

  return toDto(lot)
}
