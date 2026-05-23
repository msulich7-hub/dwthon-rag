import type { EntityManager } from '@mikro-orm/postgresql'
import type { IngestHelpdeskTicketBody } from '../data/validators'
import { createTicket, type TicketDetail } from './tickets'

export type IngestHelpdeskTicketResult = {
  ticket: TicketDetail
  created: boolean
}

/**
 * Ingest path for email/webhook style payloads (Jira Service Management–like).
 * Always creates a new ticket; deduplication can be added later via external id.
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
    },
    { initialStatus: 'open' },
  )

  return { ticket, created: true }
}
