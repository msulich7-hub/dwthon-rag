import type { EntityManager } from '@mikro-orm/postgresql'
import type { InternalHelpdeskRequestBody } from '../data/validators'
import { createTicket, type TicketDetail } from './tickets'

export type InternalHelpdeskRequestResult = {
  ticket: TicketDetail
}

/**
 * Employee self-service: internal visibility, staff requester (Zammad Agent desk pattern).
 */
export async function submitInternalHelpdeskRequest(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  body: InternalHelpdeskRequestBody,
  requesterUserId: string | null,
): Promise<InternalHelpdeskRequestResult> {
  const ticket = await createTicket(
    em,
    scope,
    {
      ...body,
      source: 'manual',
      teamQueue: body.teamQueue ?? 'general',
    },
    {
      initialStatus: 'open',
      visibility: 'internal',
      requesterType: 'staff',
      requesterUserId,
    },
  )

  return { ticket }
}
