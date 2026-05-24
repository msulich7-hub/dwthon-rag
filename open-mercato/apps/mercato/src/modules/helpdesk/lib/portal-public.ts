import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskTicket, HelpdeskTicketComment } from '../data/entities'
import { findTicketByPortalToken } from './portal-token'
import { addTicketComment } from './tickets'
import { recordCsat } from './ticket-extras'

export type PublicTicketView = {
  ticketKey: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  csatRating: number | null
  comments: Array<{
    body: string
    authorName: string | null
    createdAt: string
  }>
}

export async function getPublicTicketView(
  em: EntityManager,
  token: string,
): Promise<PublicTicketView | null> {
  const ticket = await findTicketByPortalToken(em, token)
  if (!ticket || ticket.visibility !== 'customer') return null

  const comments = await em.find(
    HelpdeskTicketComment,
    {
      ticketId: ticket.id,
      tenantId: ticket.tenantId,
      organizationId: ticket.organizationId,
      isInternal: false,
    },
    { orderBy: { createdAt: 'ASC' }, limit: 100 },
  )

  return {
    ticketKey: ticket.ticketKey,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    csatRating: ticket.csatRating ?? null,
    comments: comments.map((c) => ({
      body: c.body,
      authorName: c.authorName ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
  }
}

export async function addCustomerPortalComment(
  em: EntityManager,
  token: string,
  body: string,
  authorName?: string | null,
) {
  const ticket = await findTicketByPortalToken(em, token)
  if (!ticket || ticket.visibility !== 'customer') return null

  return addTicketComment(
    em,
    { tenantId: ticket.tenantId, organizationId: ticket.organizationId },
    ticket.id,
    { body, isInternal: false, authorName: authorName ?? ticket.reporterName ?? 'Customer' },
    null,
  )
}

export async function submitPortalCsat(
  em: EntityManager,
  token: string,
  rating: number,
  comment?: string | null,
): Promise<boolean> {
  const ticket = await findTicketByPortalToken(em, token)
  if (!ticket) return false

  await recordCsat(
    em,
    { tenantId: ticket.tenantId, organizationId: ticket.organizationId },
    ticket.id,
    rating,
    comment ?? null,
  )
  return true
}
