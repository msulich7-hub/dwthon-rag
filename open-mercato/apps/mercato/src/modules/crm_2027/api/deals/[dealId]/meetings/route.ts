import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { ingestDealMeetingBodySchema } from '../../../../data/validators'
import { ingestDealMeeting, listDealMeetings } from '../../../../lib/ingest-deal-meeting'
import { resolveCrm2027RequestContext } from '../../../../lib/request-context'
import { assertDealInScope } from '../../../../lib/voice-execute'
import {
  completeCrm2027MutationGuard,
  runCrm2027MutationGuard,
} from '../../../../lib/crm-mutation-guard'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.deals.view'] },
  POST: {
    requireAuth: true,
    requireFeatures: ['crm_2027.view', 'customers.deals.view', 'customers.interactions.manage'],
  },
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
    const crmCtx = await resolveCrm2027RequestContext(request)
    const dealId = ctx.params?.dealId?.trim()
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal id' }, { status: 400 })
    }

    const inScope = await assertDealInScope(crmCtx.em, crmCtx, dealId)
    if (!inScope) {
      throw new CrudHttpError(404, { error: 'Deal not found' })
    }

    const guard = await runCrm2027MutationGuard(request, {
      tenantId: crmCtx.tenantId,
      organizationId: crmCtx.organizationId,
      auth: crmCtx.commandContext.auth,
    })
    if (!guard.ok) {
      return NextResponse.json(guard.body, { status: guard.status })
    }

    const json = await request.json().catch(() => null)
    const body = ingestDealMeetingBodySchema.parse(json)

    const result = await ingestDealMeeting(
      crmCtx.em,
      crmCtx.container,
      crmCtx.commandBus,
      crmCtx.commandContext,
      { tenantId: crmCtx.tenantId, organizationId: crmCtx.organizationId },
      dealId,
      body,
      {
        preferLlmSentiment: body.preferLlmSentiment ?? true,
        entityId: body.entityId,
      },
    )

    await completeCrm2027MutationGuard(request, {
      tenantId: crmCtx.tenantId,
      organizationId: crmCtx.organizationId,
      auth: crmCtx.commandContext.auth,
    })

    return NextResponse.json({
      dealId,
      meeting: result.meeting,
      risk: result.risk,
      alerts: result.alerts,
      interactionId: result.interactionId,
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
