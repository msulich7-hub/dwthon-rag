import type { EntityManager } from '@mikro-orm/postgresql'
import { MesQualityHold } from '../data/entities'
import type { CreateQualityHoldBody } from '../data/validators'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type QualityHoldDto = {
  id: string
  targetType: string
  targetId: string
  reasonCode: string
  reasonText: string | null
  status: string
  createdAt: string
  releasedAt: string | null
}

function toDto(row: MesQualityHold): QualityHoldDto {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    reasonCode: row.reasonCode,
    reasonText: row.reasonText ?? null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    releasedAt: row.releasedAt?.toISOString() ?? null,
  }
}

export async function listQualityHolds(
  em: EntityManager,
  scope: MesScope,
  filters: {
    targetType?: string
    targetId?: string
    status?: 'active' | 'released'
    limit?: number
  },
): Promise<QualityHoldDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters.targetType) where.targetType = filters.targetType
  if (filters.targetId) where.targetId = filters.targetId
  if (filters.status) where.status = filters.status

  const rows = await em.find(MesQualityHold, where, {
    orderBy: { createdAt: 'DESC' },
    limit: filters.limit ?? 100,
  })
  return rows.map(toDto)
}

export async function countActiveHolds(em: EntityManager, scope: MesScope): Promise<number> {
  return em.count(MesQualityHold, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: 'active',
  })
}

export async function hasActiveHoldOnWorkOrder(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
): Promise<boolean> {
  const count = await em.count(MesQualityHold, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: 'active',
    targetType: 'work_order',
    targetId: workOrderId,
  })
  return count > 0
}

export async function assertWorkOrderNotOnHold(
  em: EntityManager,
  scope: MesScope,
  workOrderId: string,
): Promise<void> {
  if (await hasActiveHoldOnWorkOrder(em, scope, workOrderId)) {
    throw new Error('WORK_ORDER_ON_HOLD')
  }
}

export async function createQualityHold(
  em: EntityManager,
  scope: MesScope,
  body: CreateQualityHoldBody,
  createdBy?: string | null,
): Promise<QualityHoldDto> {
  const existing = await em.findOne(MesQualityHold, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    targetType: body.targetType,
    targetId: body.targetId,
    status: 'active',
  })
  if (existing) throw new Error('HOLD_ALREADY_ACTIVE')

  const row = em.create(MesQualityHold, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    targetType: body.targetType,
    targetId: body.targetId,
    reasonCode: body.reasonCode.trim(),
    reasonText: body.reasonText?.trim() ?? null,
    status: 'active',
    createdBy: createdBy ?? null,
  })
  await em.persistAndFlush(row)

  await emitMesEvent('mes.quality.hold_created', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    holdId: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
  })

  return toDto(row)
}

export async function releaseQualityHold(
  em: EntityManager,
  scope: MesScope,
  holdId: string,
  releasedBy?: string | null,
): Promise<QualityHoldDto> {
  const row = await em.findOne(MesQualityHold, {
    id: holdId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!row) throw new Error('HOLD_NOT_FOUND')
  if (row.status !== 'active') throw new Error('HOLD_NOT_ACTIVE')

  row.status = 'released'
  row.releasedAt = new Date()
  row.releasedBy = releasedBy ?? null
  await em.flush()

  await emitMesEvent('mes.quality.hold_released', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    holdId: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
  })

  return toDto(row)
}
