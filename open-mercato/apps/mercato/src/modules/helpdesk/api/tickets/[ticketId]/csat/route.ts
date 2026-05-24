import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { csatBodySchema } from '../../../../data/extras-validators'
import { recordCsat } from '../../../../lib/ticket-extras'
import { resolveHelpdeskRequestContext } from '../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent'] },
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
    const body = csatBodySchema.parse(json)
    const ticket = await recordCsat(
      em,
      { tenantId, organizationId },
      ticketId,
      body.rating,
      body.comment,
    )
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
