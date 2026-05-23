import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createHelpdeskTicketBodySchema } from '../../../../../data/validators'
import { assertCustomerLink } from '../../../../../lib/customer-context'
import { createTicket, listTickets } from '../../../../../lib/tickets'
import { resolveHelpdeskRequestContext } from '../../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.view', 'customers.people.view'] },
  POST: { requireAuth: true, requireFeatures: ['helpdesk.manage', 'customers.people.view'] },
}

export const openApi = {
  GET: { summary: 'List helpdesk tickets linked to a person', tags: ['helpdesk'] },
  POST: { summary: 'Create a ticket for a person', tags: ['helpdesk'] },
}

export async function GET(
  request: Request,
  ctx: { params: { customerId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const customerId = ctx.params?.customerId?.trim()
    if (!customerId) {
      return NextResponse.json({ error: 'Missing person id' }, { status: 400 })
    }

    await assertCustomerLink(em, { tenantId, organizationId }, 'person', customerId)
    const tickets = await listTickets(em, { tenantId, organizationId }, { personId: customerId })

    return NextResponse.json({ personId: customerId, tickets })
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(
  request: Request,
  ctx: { params: { customerId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const customerId = ctx.params?.customerId?.trim()
    if (!customerId) {
      return NextResponse.json({ error: 'Missing person id' }, { status: 400 })
    }

    await assertCustomerLink(em, { tenantId, organizationId }, 'person', customerId)
    const json = await request.json().catch(() => null)
    const body = createHelpdeskTicketBodySchema.parse(json)
    const ticket = await createTicket(em, { tenantId, organizationId }, {
      ...body,
      personId: customerId,
    })

    return NextResponse.json({ personId: customerId, ticket })
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
