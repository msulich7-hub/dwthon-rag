import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskTicket } from '../data/entities'
import { isSlaBreached } from './sla'

export type SlaBreachAlert = {
  ticketId: string
  ticketKey: string
  subject: string
  assigneeUserId: string | null
  slaDueAt: string
}

export async function scanNewSlaBreaches(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  now = new Date(),
  limit = 50,
): Promise<SlaBreachAlert[]> {
  const openStatuses = ['open', 'in_progress', 'waiting'] as const
  const candidates = await em.find(
    HelpdeskTicket,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: { $in: [...openStatuses] },
      slaDueAt: { $ne: null },
      slaBreachNotifiedAt: null,
    },
    { limit: 200, orderBy: { slaDueAt: 'ASC' } },
  )

  const alerts: SlaBreachAlert[] = []
  for (const row of candidates) {
    if (!row.slaDueAt || !isSlaBreached(row.slaDueAt, now)) continue
    alerts.push({
      ticketId: row.id,
      ticketKey: row.ticketKey,
      subject: row.subject,
      assigneeUserId: row.assigneeUserId ?? null,
      slaDueAt: row.slaDueAt.toISOString(),
    })
    if (alerts.length >= limit) break
  }
  return alerts
}

export async function markSlaBreachNotified(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketIds: string[],
  notifiedAt = new Date(),
): Promise<void> {
  if (!ticketIds.length) return
  const rows = await em.find(HelpdeskTicket, {
    id: { $in: ticketIds },
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  for (const row of rows) {
    row.slaBreachNotifiedAt = notifiedAt
    row.updatedAt = new Date()
  }
  await em.flush()
}
