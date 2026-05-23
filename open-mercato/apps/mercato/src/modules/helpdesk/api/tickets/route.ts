import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createHelpdeskTicketBodySchema, helpdeskTicketStatusSchema } from '../../data/validators'
import { createTicket, listTickets } from '../../lib/tickets'
import { resolveHelpdeskRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.view'] },
  POST: { requireAuth: true, requireFeatures: ['helpdesk.manage'] },
}

export const openApi = {
  GET: { summary: 'List helpdesk tickets', tags: ['helpdesk'] },
  POST: { summary: 'Create a helpdesk ticket', tags: ['helpdesk'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const url = new URL(request.url)
    const statusRaw = url.searchParams.get('status')
    const companyId = url.searchParams.get('companyId') ?? undefined
    const personId = url.searchParams.get('personId') ?? undefined
    const status = statusRaw ? helpdeskTicketStatusSchema.parse(statusRaw) : undefined

    const tickets = await listTickets(em, { tenantId, organizationId }, {
      status,
      companyId,
      personId,
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = createHelpdeskTicketBodySchema.parse(json)
    const ticket = await createTicket(em, { tenantId, organizationId }, body)
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
