import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listCannedResponses } from '../../lib/canned-responses'
import { resolveHelpdeskRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['helpdesk.agent', 'helpdesk.view'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveHelpdeskRequestContext(request)
    const items = await listCannedResponses(em, { tenantId, organizationId })
    return NextResponse.json({ items })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
