import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { internalHelpdeskRequestBodySchema } from '../../../data/validators'
import { submitInternalHelpdeskRequest } from '../../../lib/internal-request'
import { resolveHelpdeskRequestContext } from '../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.submit', 'helpdesk.agent'] },
}

export const openApi = {
  POST: {
    summary: 'Submit an internal support request (staff self-service)',
    tags: ['helpdesk'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = internalHelpdeskRequestBodySchema.parse(json)

    const result = await submitInternalHelpdeskRequest(
      em,
      { tenantId, organizationId },
      body,
      userId,
    )

    return NextResponse.json({ ticket: result.ticket })
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
