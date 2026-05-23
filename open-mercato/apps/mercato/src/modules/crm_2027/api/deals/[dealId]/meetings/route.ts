import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { ingestDealMeetingBodySchema } from '../../../../data/validators'
import { ingestDealMeeting, listDealMeetings } from '../../../../lib/ingest-deal-meeting'
import { resolveCrm2027RequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.deals.view'] },
  POST: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.deals.view'] },
}

export const openApi = {
  GET: {
    summary: 'List ingested CRM 2027 deal meetings and current risk snapshot',
    tags: ['crm_2027'],
  },
  POST: {
    summary: 'Ingest a meeting transcript, analyze sentiment, and refresh deal risk',
    tags: ['crm_2027'],
  },
}

export async function GET(
  request: Request,
  ctx: { params: { dealId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveCrm2027RequestContext(request)
    const dealId = ctx.params?.dealId?.trim()
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal id' }, { status: 400 })
    }

    const { meetings, risk } = await listDealMeetings(
      em,
      { tenantId, organizationId },
      dealId,
    )

    return NextResponse.json({ dealId, meetings, risk })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(
  request: Request,
  ctx: { params: { dealId: string } },
) {
  try {
    const { tenantId, organizationId, em, container } = await resolveCrm2027RequestContext(request)
    const dealId = ctx.params?.dealId?.trim()
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal id' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const body = ingestDealMeetingBodySchema.parse(json)

    const result = await ingestDealMeeting(
      em,
      container,
      { tenantId, organizationId },
      dealId,
      body,
    )

    return NextResponse.json({
      dealId,
      meeting: result.meeting,
      risk: result.risk,
      alerts: result.alerts,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'DEAL_NOT_FOUND') {
      throw new CrudHttpError(404, { error: 'Deal not found' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
