import type { EntityManager } from '@mikro-orm/postgresql'
import {
  HelpdeskTicket,
  HelpdeskTicketComment,
  type HelpdeskTicketPriority,
  type HelpdeskTicketStatus,
} from '../data/entities'
import type {
  CreateHelpdeskTicketBody,
  CreateTicketCommentBody,
  UpdateHelpdeskTicketBody,
} from '../data/validators'
import { assertCustomerLink } from './customer-context'
import { allocateTicketKey } from './ticket-key'
import { triageHelpdeskMessage, type HelpdeskTriageResult } from './triage'

export type TicketListItem = {
  id: string
  ticketKey: string
  subject: string
  status: HelpdeskTicketStatus
  priority: HelpdeskTicketPriority
  category: string | null
  source: string
  companyId: string | null
  personId: string | null
  assigneeUserId: string | null
  reporterEmail: string | null
  reporterName: string | null
  triage: HelpdeskTriageResult | null
  createdAt: string
  updatedAt: string
}

export type TicketDetail = TicketListItem & {
  description: string
  dealId: string | null
  resolvedAt: string | null
  comments: Array<{
    id: string
    body: string
    authorName: string | null
    authorUserId: string | null
    isInternal: boolean
    createdAt: string
  }>
}

function parseTriage(raw: string | null | undefined): HelpdeskTriageResult | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as HelpdeskTriageResult
  } catch {
    return null
  }
}

function mapTicketListItem(record: HelpdeskTicket): TicketListItem {
  return {
    id: record.id,
    ticketKey: record.ticketKey,
    subject: record.subject,
    status: record.status,
    priority: record.priority,
    category: record.category ?? null,
    source: record.source,
    companyId: record.companyId ?? null,
    personId: record.personId ?? null,
    assigneeUserId: record.assigneeUserId ?? null,
    reporterEmail: record.reporterEmail ?? null,
    reporterName: record.reporterName ?? null,
    triage: parseTriage(record.triageJson),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export async function listTickets(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  filters: {
    status?: HelpdeskTicketStatus
    companyId?: string
    personId?: string
    limit?: number
  },
): Promise<TicketListItem[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (filters.status) where.status = filters.status
  if (filters.companyId) where.companyId = filters.companyId
  if (filters.personId) where.personId = filters.personId

  const records = await em.find(HelpdeskTicket, where, {
    orderBy: { updatedAt: 'DESC' },
    limit: filters.limit ?? 100,
  })

  return records.map(mapTicketListItem)
}

export async function getTicketDetail(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
): Promise<TicketDetail | null> {
  const record = await em.findOne(HelpdeskTicket, {
    id: ticketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!record) return null

  const comments = await em.find(
    HelpdeskTicketComment,
    {
      ticketId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    },
    { orderBy: { createdAt: 'ASC' }, limit: 200 },
  )

  return {
    ...mapTicketListItem(record),
    description: record.description,
    dealId: record.dealId ?? null,
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      authorName: comment.authorName ?? null,
      authorUserId: comment.authorUserId ?? null,
      isInternal: comment.isInternal,
      createdAt: comment.createdAt.toISOString(),
    })),
  }
}

async function validateCustomerLinks(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  body: CreateHelpdeskTicketBody,
): Promise<void> {
  if (body.companyId) {
    await assertCustomerLink(em, scope, 'company', body.companyId)
  }
  if (body.personId) {
    await assertCustomerLink(em, scope, 'person', body.personId)
  }
}

export async function createTicket(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  body: CreateHelpdeskTicketBody,
  options?: { initialStatus?: HelpdeskTicketStatus },
): Promise<TicketDetail> {
  await validateCustomerLinks(em, scope, body)

  const triage = triageHelpdeskMessage(body.subject, body.body)
  const ticketKey = await allocateTicketKey(em, scope)
  const now = new Date()

  const record = em.create(HelpdeskTicket, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    ticketKey,
    subject: body.subject.trim(),
    description: body.body.trim(),
    status: body.status ?? options?.initialStatus ?? 'open',
    priority: body.priority ?? triage.priority,
    category: body.category ?? triage.category,
    source: body.source ?? 'manual',
    reporterEmail: body.reporterEmail ?? null,
    reporterName: body.reporterName ?? null,
    assigneeUserId: body.assigneeUserId ?? null,
    companyId: body.companyId ?? null,
    personId: body.personId ?? null,
    dealId: body.dealId ?? null,
    triageJson: JSON.stringify(triage),
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  })

  em.persist(record)
  await em.flush()

  const detail = await getTicketDetail(em, scope, record.id)
  if (!detail) {
    throw new Error('TICKET_CREATE_FAILED')
  }
  return detail
}

export async function updateTicket(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
  body: UpdateHelpdeskTicketBody,
): Promise<TicketDetail | null> {
  const record = await em.findOne(HelpdeskTicket, {
    id: ticketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!record) return null

  if (body.status !== undefined) {
    record.status = body.status
    if (body.status === 'resolved' || body.status === 'closed') {
      record.resolvedAt = new Date()
    } else {
      record.resolvedAt = null
    }
  }
  if (body.priority !== undefined) record.priority = body.priority
  if (body.assigneeUserId !== undefined) {
    record.assigneeUserId = body.assigneeUserId
  }
  if (body.category !== undefined) record.category = body.category

  record.updatedAt = new Date()
  await em.flush()

  return getTicketDetail(em, scope, ticketId)
}

export async function addTicketComment(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
  body: CreateTicketCommentBody,
  authorUserId: string | null,
): Promise<TicketDetail | null> {
  const ticket = await em.findOne(HelpdeskTicket, {
    id: ticketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!ticket) return null

  const comment = em.create(HelpdeskTicketComment, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    ticketId,
    authorUserId,
    authorName: body.authorName ?? null,
    body: body.body.trim(),
    isInternal: body.isInternal ?? false,
  })
  em.persist(comment)

  ticket.updatedAt = new Date()
  if (ticket.status === 'waiting' && !body.isInternal) {
    ticket.status = 'open'
  }

  await em.flush()
  return getTicketDetail(em, scope, ticketId)
}
