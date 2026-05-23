import { createHash, randomUUID } from 'node:crypto'
import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskTicket } from '../data/entities'

export function hashPortalToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex')
}

export async function issuePortalToken(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  ticketId: string,
): Promise<{ token: string; portalPath: string } | null> {
  const ticket = await em.findOne(HelpdeskTicket, {
    id: ticketId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  if (!ticket || ticket.visibility !== 'customer') {
    return null
  }

  const token = randomUUID()
  ticket.portalTokenHash = hashPortalToken(token)
  ticket.updatedAt = new Date()
  await em.flush()

  return {
    token,
    portalPath: `/ticket/${token}`,
  }
}

export async function findTicketByPortalToken(
  em: EntityManager,
  token: string,
): Promise<HelpdeskTicket | null> {
  const hash = hashPortalToken(token)
  return em.findOne(HelpdeskTicket, { portalTokenHash: hash })
}
