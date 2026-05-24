import type { EntityManager } from '@mikro-orm/postgresql'
import { MesDowntimeSegment } from '../data/entities'
import type { StartDowntimeBody } from '../data/validators'
import { emitMesEvent } from '../events'

export type MesScope = { tenantId: string; organizationId: string }

export type DowntimeDto = {
  id: string
  workCenterCode: string
  reasonCode: string
  reasonLabel: string
  startedAt: string
  endedAt: string | null
  notes: string | null
}

function toDto(row: MesDowntimeSegment): DowntimeDto {
  return {
    id: row.id,
    workCenterCode: row.workCenterCode,
    reasonCode: row.reasonCode,
    reasonLabel: row.reasonLabel,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    notes: row.notes ?? null,
  }
}

export async function listDowntimeSegments(
  em: EntityManager,
  scope: MesScope,
  filters: { workCenterCode?: string; activeOnly?: boolean; limit?: number },
): Promise<DowntimeDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters.workCenterCode) where.workCenterCode = filters.workCenterCode
  if (filters.activeOnly) where.endedAt = null

  const rows = await em.find(MesDowntimeSegment, where, {
    orderBy: { startedAt: 'DESC' },
    limit: filters.limit ?? 100,
  })
  return rows.map(toDto)
}

export async function countActiveDowntime(em: EntityManager, scope: MesScope): Promise<number> {
  return em.count(MesDowntimeSegment, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    endedAt: null,
  })
}

export async function startDowntime(
  em: EntityManager,
  scope: MesScope,
  body: StartDowntimeBody,
): Promise<DowntimeDto> {
  const active = await em.findOne(MesDowntimeSegment, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workCenterCode: body.workCenterCode.trim(),
    endedAt: null,
  })
  if (active) throw new Error('DOWNTIME_ALREADY_ACTIVE')

  const row = em.create(MesDowntimeSegment, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    workCenterCode: body.workCenterCode.trim(),
    reasonCode: body.reasonCode.trim(),
    reasonLabel: body.reasonLabel.trim(),
    notes: body.notes?.trim() ?? null,
  })
  await em.persistAndFlush(row)

  await emitMesEvent('mes.downtime.started', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    segmentId: row.id,
    workCenterCode: row.workCenterCode,
  })

  return toDto(row)
}

export async function endDowntime(
  em: EntityManager,
  scope: MesScope,
  segmentId: string,
): Promise<DowntimeDto> {
  const row = await em.findOne(MesDowntimeSegment, {
    id: segmentId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!row) throw new Error('DOWNTIME_NOT_FOUND')
  if (row.endedAt) throw new Error('DOWNTIME_ALREADY_ENDED')

  row.endedAt = new Date()
  await em.flush()

  await emitMesEvent('mes.downtime.ended', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    segmentId: row.id,
    workCenterCode: row.workCenterCode,
  })

  return toDto(row)
}
