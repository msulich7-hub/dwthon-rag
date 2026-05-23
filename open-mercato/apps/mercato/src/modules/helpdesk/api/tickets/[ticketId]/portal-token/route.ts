import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { issuePortalToken } from '../../../../lib/portal-token'
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

    const issued = await issuePortalToken(em, { tenantId, organizationId }, ticketId)
    if (!issued) {
      return NextResponse.json(
        { error: 'Portal link is only available for customer-channel tickets' },
        { status: 400 },
      )
    }

    const origin = new URL(request.url).origin
    const portalUrl = `${origin}${issued.portalPath}`

    return NextResponse.json({ token: issued.token, portalPath: issued.portalPath, portalUrl })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
