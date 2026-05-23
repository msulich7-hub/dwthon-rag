import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createHelpdeskTicketBodySchema } from '../../../../../data/validators'
import { assertCustomerLink } from '../../../../../lib/customer-context'
import { createTicket, listTickets } from '../../../../../lib/tickets'
import { resolveHelpdeskRequestContext } from '../../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view', 'customers.companies.view'] },
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.manage', 'customers.companies.view'] },
}

export const openApi = {
  GET: { summary: 'List helpdesk tickets linked to a company', tags: ['helpdesk'] },
  POST: { summary: 'Create a ticket for a company', tags: ['helpdesk'] },
}

export async function GET(
  request: Request,
  ctx: { params: { customerId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const customerId = ctx.params?.customerId?.trim()
    if (!customerId) {
      return NextResponse.json({ error: 'Missing company id' }, { status: 400 })
    }

    await assertCustomerLink(em, { tenantId, organizationId }, 'company', customerId)
    const tickets = await listTickets(em, { tenantId, organizationId }, { companyId: customerId })

    return NextResponse.json({ companyId: customerId, tickets })
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
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
      return NextResponse.json({ error: 'Missing company id' }, { status: 400 })
    }

    await assertCustomerLink(em, { tenantId, organizationId }, 'company', customerId)
    const json = await request.json().catch(() => null)
    const body = createHelpdeskTicketBodySchema.parse(json)
    const ticket = await createTicket(
      em,
      { tenantId, organizationId },
      { ...body, companyId: customerId, source: body.source ?? 'manual' },
      { visibility: 'customer', requesterType: 'customer' },
    )

    return NextResponse.json({ companyId: customerId, ticket })
  } catch (error) {
    if (error instanceof Error && error.message === 'CUSTOMER_NOT_FOUND') {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
