import type { EntityManager } from '@mikro-orm/postgresql'
import { CustomerInteraction } from '@open-mercato/core/modules/customers/data/entities'

export type UpcomingCalendarItem = {
  id: string
  dealId: string | null
  interactionType: string
  title: string | null
  scheduledAt: string
  status: string
  source: string | null
}

export async function listUpcomingCalendar(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  options?: { days?: number; dealId?: string; limit?: number },
): Promise<UpcomingCalendarItem[]> {
  const days = options?.days ?? 30
  const limit = options?.limit ?? 50
  const now = new Date()
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    interactionType: { $in: ['meeting', 'call'] },
    status: { $in: ['planned', 'scheduled'] },
    scheduledAt: { $gte: now, $lte: until },
    deletedAt: null,
  }
  if (options?.dealId) {
    where.dealId = options.dealId
  }

  const rows = await em.find(CustomerInteraction, where, {
    orderBy: { scheduledAt: 'ASC' },
    limit,
  })

  return rows.map((row) => ({
    id: row.id,
    dealId: row.dealId ?? null,
    interactionType: row.interactionType,
    title: row.title ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? '',
    status: row.status,
    source: row.source ?? null,
  }))
}
