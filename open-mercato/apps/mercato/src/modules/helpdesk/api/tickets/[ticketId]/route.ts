import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { updateHelpdeskTicketBodySchema } from '../../../data/validators'
import { getTicketDetail, updateTicket } from '../../../lib/tickets'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view'] },
  PATCH: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.manage'] },
}

export const openApi = {
  GET: { summary: 'Get helpdesk ticket with comments', tags: ['helpdesk'] },
  PATCH: { summary: 'Update ticket status, priority, or assignee', tags: ['helpdesk'] },
}

export async function GET(
  request: Request,
  ctx: { params: { ticketId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })
    }

    const ticket = await getTicketDetail(em, { tenantId, organizationId }, ticketId)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: { ticketId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const body = updateHelpdeskTicketBodySchema.parse(json)
    const ticket = await updateTicket(em, { tenantId, organizationId }, ticketId, body)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
