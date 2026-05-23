import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { ingestHelpdeskTicketBodySchema } from '../../data/validators'
import { ingestHelpdeskTicket } from '../../lib/ingest-ticket'
import { resolveHelpdeskRequestContext } from '../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.ingest'] },
}

export const openApi = {
  POST: {
    summary: 'Ingest a customer-channel ticket (email, portal, chat webhook)',
    tags: ['helpdesk'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = ingestHelpdeskTicketBodySchema.parse(json)

    const result = await ingestHelpdeskTicket(em, { tenantId, organizationId }, body)

    return NextResponse.json({
      created: result.created,
      ticket: result.ticket,
    })
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
