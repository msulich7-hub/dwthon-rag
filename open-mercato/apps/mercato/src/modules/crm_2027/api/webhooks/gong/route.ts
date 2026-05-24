import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { ingestProviderMeeting } from '../../../lib/webhook-meeting-ingest'
import { parseProviderWebhookPayload } from '../../../lib/webhook-payload'
import { resolveWebhookCrmContext } from '../../../lib/webhook-context'
import { verifyInboundWebhookAuth } from '../../../lib/webhook-verify'

export const metadata = {
  POST: { requireAuth: false },
}

export async function POST(request: Request) {
  try {
    if (!verifyInboundWebhookAuth(request)) {
      throw new CrudHttpError(401, { error: 'Invalid webhook authentication' })
    }

    const json = await request.json().catch(() => null)

    let payload
    try {
      payload = parseProviderWebhookPayload(json, 'gong')
    } catch {
      throw new CrudHttpError(400, {
        error: 'Unmapped Gong payload — include dealId and transcript (or custom_fields)',
      })
    }

    const ctx = await resolveWebhookCrmContext(request, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })

    const result = await ingestProviderMeeting(
      ctx.em,
      ctx.container,
      ctx.commandBus,
      ctx.commandContext,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      'gong',
      payload,
    )

    return NextResponse.json({ ok: true, provider: 'gong', ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
