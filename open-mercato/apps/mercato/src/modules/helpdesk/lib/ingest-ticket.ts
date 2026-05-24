import type { EntityManager } from '@mikro-orm/postgresql'
import type { IngestHelpdeskTicketBody } from '../data/validators'
import { createTicket, type TicketDetail } from './tickets'

export type IngestHelpdeskTicketResult = {
  ticket: TicketDetail
  created: boolean
}

/**
 * Customer channel ingest (email, portal, chat) — external visibility.
 * Agents work these in the service desk workspace; requesters do not see internal notes.
 */
export async function ingestHelpdeskTicket(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  body: IngestHelpdeskTicketBody,
): Promise<IngestHelpdeskTicketResult> {
  const ticket = await createTicket(
    em,
    scope,
    {
      ...body,
      source: body.source ?? 'email',
      teamQueue: body.teamQueue ?? 'general',
    },
    {
      initialStatus: 'open',
      visibility: 'customer',
      requesterType: 'customer',
      requesterUserId: null,
    },
  )

  return { ticket, created: true }
}
