import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { providerMeetingWebhookSchema } from '../../../data/validators'
import { ingestProviderMeeting } from '../../../lib/webhook-meeting-ingest'
import { resolveCrm2027RequestContext } from '../../../lib/request-context'
import { verifyZoomSignature } from '../../../lib/webhook-verify'
import { resolveWebhookCrmContext } from '../../../lib/webhook-context'
import { createHmac } from 'node:crypto'

const zoomChallengeSchema = z.object({
  event: z.literal('endpoint.url_validation'),
  payload: z.object({ plainToken: z.string() }),
})

export const metadata = {
  POST: { requireAuth: false },
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const json = JSON.parse(rawBody || '{}') as unknown

    const challenge = zoomChallengeSchema.safeParse(json)
    if (challenge.success) {
      const plainToken = challenge.data.payload.plainToken
      const secret = process.env.CRM_2027_ZOOM_WEBHOOK_SECRET?.trim() ?? ''
      const encryptedToken = secret
        ? createHmac('sha256', secret).update(plainToken).digest('hex')
        : plainToken
      return NextResponse.json({ plainToken, encryptedToken })
    }

    if (!verifyZoomSignature(request, rawBody)) {
      throw new CrudHttpError(401, { error: 'Invalid webhook signature' })
    }

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
      'zoom',
      payload,
    )

    return NextResponse.json({ ok: true, provider: 'zoom', ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
