import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import {
  createHelpdeskTicketBodySchema,
  helpdeskAgentQueueSchema,
  helpdeskTicketStatusSchema,
} from '../../data/validators'
import { createTicket, listTickets } from '../../lib/tickets'
import { resolveHelpdeskRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view'] },
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.manage'] },
}

export const openApi = {
  GET: { summary: 'List tickets for agent workspace queues', tags: ['helpdesk'] },
  POST: { summary: 'Create a ticket as an agent', tags: ['helpdesk'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const url = new URL(request.url)
    const statusRaw = url.searchParams.get('status')
    const queueRaw = url.searchParams.get('queue') ?? 'all'
    const companyId = url.searchParams.get('companyId') ?? undefined
    const personId = url.searchParams.get('personId') ?? undefined
    const status = statusRaw ? helpdeskTicketStatusSchema.parse(statusRaw) : undefined
    const queue = helpdeskAgentQueueSchema.parse(queueRaw)

    const tickets = await listTickets(em, { tenantId, organizationId }, {
      status,
      companyId,
      personId,
      queue,
      currentUserId: userId,
    })

    return NextResponse.json({ queue, tickets })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = createHelpdeskTicketBodySchema.parse(json)
    const ticket = await createTicket(
      em,
      { tenantId, organizationId },
      body,
      {
        visibility: body.visibility ?? 'internal',
        requesterType: body.requesterType ?? 'staff',
        requesterUserId: userId,
      },
    )
    return NextResponse.json({ ticket })
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
