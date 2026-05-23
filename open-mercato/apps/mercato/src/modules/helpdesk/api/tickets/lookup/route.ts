import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { HelpdeskTicket } from '../../../data/entities'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent'] },
}

const querySchema = z.object({
  key: z.string().min(1),
})

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const url = new URL(request.url)
    const { key } = querySchema.parse({ key: url.searchParams.get('key') ?? '' })

    const row = await em.findOne(HelpdeskTicket, {
      ticketKey: key.trim(),
      tenantId,
      organizationId,
    })
    if (!row) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({
      ticket: { id: row.id, ticketKey: row.ticketKey, subject: row.subject, status: row.status },
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
