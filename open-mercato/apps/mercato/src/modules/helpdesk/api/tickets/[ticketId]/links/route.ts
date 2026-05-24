import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { ticketLinkBodySchema } from '../../../../data/extras-validators'
import { addTicketLink, loadTicketExtras } from '../../../../lib/ticket-extras'
import { resolveHelpdeskRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view'] },
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent'] },
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
    const extras = await loadTicketExtras(em, { tenantId, organizationId }, ticketId)
    if (!extras) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    return NextResponse.json({ links: extras.links })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(
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
    const body = ticketLinkBodySchema.parse(json)
    const link = await addTicketLink(
      em,
      { tenantId, organizationId },
      ticketId,
      body.targetTicketId,
      body.linkType ?? 'related',
    )
    if (!link) {
      return NextResponse.json({ error: 'Could not link tickets' }, { status: 400 })
    }
    return NextResponse.json({ link })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
