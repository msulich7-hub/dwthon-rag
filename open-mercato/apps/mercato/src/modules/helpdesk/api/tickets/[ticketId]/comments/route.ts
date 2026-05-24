import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createTicketCommentBodySchema } from '../../../../data/validators'
import { addTicketComment } from '../../../../lib/tickets'
import { resolveHelpdeskRequestContext } from '../../../../lib/request-context'
import { notifyAfterTicketComment } from '../../../../lib/ticket-notify-bridge'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view', 'helpdesk.manage'] },
}

export const openApi = {
  POST: { summary: 'Add a public or internal comment to a ticket', tags: ['helpdesk'] },
}

export async function POST(
  request: Request,
  ctx: { params: { ticketId: string } },
) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const body = createTicketCommentBodySchema.parse(json)
    const ticket = await addTicketComment(
      em,
      { tenantId, organizationId },
      ticketId,
      body,
      userId,
    )
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const container = await createRequestContainer()
    await notifyAfterTicketComment(
      container,
      { tenantId, organizationId },
      ticket,
      {
        actorUserId: userId,
        isInternal: body.isInternal ?? false,
        body: body.body,
      },
    )

    return NextResponse.json({ ticket })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
