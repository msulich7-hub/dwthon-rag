import type { EntityManager } from '@mikro-orm/postgresql'
import {
  HelpdeskTicket,
  HelpdeskTicketLink,
  HelpdeskTicketWatcher,
  HelpdeskTimeEntry,
} from '../data/entities'
import { getTicketDetail, type TicketDetail } from './tickets'
import { buildTicketSummary, type TicketSummary } from './ticket-summary'

export type WatcherItem = { id: string; userId: string; createdAt: string }

export type TicketLinkItem = {
  id: string
  linkType: string
  ticket: { id: string; ticketKey: string; subject: string; status: string }
}

export type TimeEntryItem = {
  id: string
  userId: string
  minutes: number
  note: string | null
  createdAt: string
}

export type TicketExtras = {
  watchers: WatcherItem[]
  links: TicketLinkItem[]
  timeEntries: TimeEntryItem[]
  totalMinutes: number
  summary: TicketSummary | null
  csatRating: number | null
  csatComment: string | null
}

export async function loadTicketExtras(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
): Promise<TicketExtras | null> {
  const ticket = await em.findOne(HelpdeskTicket, {
    id: ticketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!ticket) return null

  const watchers = await em.find(HelpdeskTicketWatcher, {
    ticketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  const links = await em.find(HelpdeskTicketLink, {
    $or: [{ sourceTicketId: ticketId }, { targetTicketId: ticketId }],
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  const timeEntries = await em.find(
    HelpdeskTimeEntry,
    {
      ticketId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    },
    { orderBy: { createdAt: 'DESC' } },
  )

  const linkedTickets: TicketLinkItem[] = []
  for (const link of links) {
    const otherId = link.sourceTicketId === ticketId ? link.targetTicketId : link.sourceTicketId
    const other = await em.findOne(HelpdeskTicket, { id: otherId })
    if (other) {
      linkedTickets.push({
        id: link.id,
        linkType: link.linkType,
        ticket: {
          id: other.id,
          ticketKey: other.ticketKey,
          subject: other.subject,
          status: other.status,
        },
      })
    }
  }

  let summary: TicketSummary | null = null
  if (ticket.summaryJson) {
    try {
      summary = JSON.parse(ticket.summaryJson) as TicketSummary
    } catch {
      summary = null
    }
  }

  const totalMinutes = timeEntries.reduce((sum, e) => sum + e.minutes, 0)

  return {
    watchers: watchers.map((w) => ({
      id: w.id,
      userId: w.userId,
      createdAt: w.createdAt.toISOString(),
    })),
    links: linkedTickets,
    timeEntries: timeEntries.map((e) => ({
      id: e.id,
      userId: e.userId,
      minutes: e.minutes,
      note: e.note ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
    totalMinutes,
    summary,
    csatRating: ticket.csatRating ?? null,
    csatComment: ticket.csatComment ?? null,
  }
}

export async function addWatcher(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
  userId: string,
): Promise<WatcherItem> {
  const existing = await em.findOne(HelpdeskTicketWatcher, {
    ticketId,
    userId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (existing) {
    return {
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt.toISOString(),
    }
  }

  const row = em.create(HelpdeskTicketWatcher, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    ticketId,
    userId,
  })
  em.persist(row)
  await em.flush()
  return { id: row.id, userId: row.userId, createdAt: row.createdAt.toISOString() }
}

export async function removeWatcher(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
  userId: string,
): Promise<boolean> {
  const row = await em.findOne(HelpdeskTicketWatcher, {
    ticketId,
    userId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!row) return false
  await em.removeAndFlush(row)
  return true
}

export async function addTicketLink(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  sourceTicketId: string,
  targetTicketId: string,
  linkType: 'related' | 'duplicate' | 'blocks',
): Promise<TicketLinkItem | null> {
  if (sourceTicketId === targetTicketId) return null

  const target = await em.findOne(HelpdeskTicket, {
    id: targetTicketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!target) return null

  const row = em.create(HelpdeskTicketLink, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    sourceTicketId,
    targetTicketId,
    linkType,
  })
  em.persist(row)
  await em.flush()

  return {
    id: row.id,
    linkType: row.linkType,
    ticket: {
      id: target.id,
      ticketKey: target.ticketKey,
      subject: target.subject,
      status: target.status,
    },
  }
}

export async function addTimeEntry(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
  userId: string,
  minutes: number,
  note?: string,
): Promise<TimeEntryItem> {
  const row = em.create(HelpdeskTimeEntry, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    ticketId,
    userId,
    minutes,
    note: note ?? null,
  })
  em.persist(row)
  await em.flush()
  return {
    id: row.id,
    userId: row.userId,
    minutes: row.minutes,
    note: row.note ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function recordCsat(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
  rating: number,
  comment?: string,
): Promise<TicketDetail | null> {
  const ticket = await em.findOne(HelpdeskTicket, {
    id: ticketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!ticket) return null

  ticket.csatRating = rating
  ticket.csatComment = comment ?? null
  ticket.updatedAt = new Date()
  await em.flush()
  return getTicketDetail(em, scope, ticketId)
}

export async function refreshTicketSummary(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
): Promise<TicketSummary | null> {
  const detail = await getTicketDetail(em, scope, ticketId)
  if (!detail) return null

  const summary = buildTicketSummary(detail)
  const ticket = await em.findOne(HelpdeskTicket, { id: ticketId })
  if (ticket) {
    ticket.summaryJson = JSON.stringify(summary)
    ticket.updatedAt = new Date()
    await em.flush()
  }
  return summary
}
