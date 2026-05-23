import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { updateHelpdeskTicketBodySchema } from '../../../data/validators'
import { getTicketDetail, updateTicket } from '../../../lib/tickets'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'
import {
  notifyAfterStatusChange,
  notifyAfterTicketAssigned,
} from '../../../lib/ticket-notify-bridge'

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
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })
    }

    const ticket = await getTicketDetail(em, { tenantId, organizationId }, ticketId)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ ticket, viewerUserId: userId })
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
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })
    }

    const before = await getTicketDetail(em, { tenantId, organizationId }, ticketId)
    const json = await request.json().catch(() => null)
    const body = updateHelpdeskTicketBodySchema.parse(json)
    const ticket = await updateTicket(em, { tenantId, organizationId }, ticketId, body)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const container = await createRequestContainer()
    const scope = { tenantId, organizationId }
    if (before && body.assigneeUserId !== undefined && body.assigneeUserId !== before.assigneeUserId && body.assigneeUserId) {
      await notifyAfterTicketAssigned(container, scope, ticket, userId, body.assigneeUserId)
    }
    if (before && body.status !== undefined && body.status !== before.status) {
      await notifyAfterStatusChange(container, scope, ticket, userId, body.status)
    }

    return NextResponse.json({ ticket })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
