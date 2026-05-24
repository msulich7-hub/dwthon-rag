import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { providerMeetingWebhookSchema } from '../../../data/validators'
import { ingestProviderMeeting } from '../../../lib/webhook-meeting-ingest'
import { resolveWebhookCrmContext } from '../../../lib/webhook-context'
import { verifyCrm2027WebhookSecret } from '../../../lib/webhook-verify'

export const metadata = {
  POST: { requireAuth: false },
}

export async function POST(request: Request) {
  try {
    if (!verifyCrm2027WebhookSecret(request)) {
      throw new CrudHttpError(401, { error: 'Invalid webhook secret' })
    }

    const json = await request.json().catch(() => null)
    const payload = providerMeetingWebhookSchema.parse(json)
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
