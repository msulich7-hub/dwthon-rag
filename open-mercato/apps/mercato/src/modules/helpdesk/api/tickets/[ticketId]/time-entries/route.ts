import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { timeEntryBodySchema } from '../../../../data/extras-validators'
import { addTimeEntry, loadTicketExtras } from '../../../../lib/ticket-extras'
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
    return NextResponse.json({
      entries: extras.timeEntries,
      totalMinutes: extras.totalMinutes,
    })
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
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const ticketId = ctx.params?.ticketId?.trim()
    if (!ticketId || !userId) {
      return NextResponse.json({ error: 'Missing ticket or user' }, { status: 400 })
    }
    const json = await request.json().catch(() => null)
    const body = timeEntryBodySchema.parse(json)
    const entry = await addTimeEntry(
      em,
      { tenantId, organizationId },
      ticketId,
      userId,
      body.minutes,
      body.note,
    )
    return NextResponse.json({ entry })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
