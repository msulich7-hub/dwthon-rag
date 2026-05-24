import { NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { z } from 'zod'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { parseProviderWebhookPayload, webhookPayloadToTranscript } from './webhook-payload'
import { resolveWebhookContext } from './webhook-context'
import {
  verifyInboundWebhookAuth,
  verifyZoomSignature,
} from './webhook-verify'

const zoomChallengeSchema = z.object({
  event: z.literal('endpoint.url_validation'),
  payload: z.object({ plainToken: z.string() }),
})

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export async function handleProviderWebhookPost(
  request: Request,
  provider: 'zoom' | 'gong',
): Promise<Response> {
  try {
    const rawBody = await request.text()
    const json = JSON.parse(rawBody || '{}') as unknown

    if (provider === 'zoom') {
      const challenge = zoomChallengeSchema.safeParse(json)
      if (challenge.success) {
        const plainToken = challenge.data.payload.plainToken
        const secret = readEnv('CALL_TRANSCRIPTS_ZOOM_WEBHOOK_SECRET', 'CRM_2027_ZOOM_WEBHOOK_SECRET') ?? ''
        const encryptedToken = secret
          ? createHmac('sha256', secret).update(plainToken).digest('hex')
          : plainToken
        return NextResponse.json({ plainToken, encryptedToken })
      }

      if (!verifyZoomSignature(request, rawBody)) {
        throw new CrudHttpError(401, { error: 'Invalid Zoom webhook signature' })
      }
    }

    if (!verifyInboundWebhookAuth(request)) {
      throw new CrudHttpError(401, { error: 'Invalid webhook authentication' })
    }

    let payload
    try {
      payload = parseProviderWebhookPayload(json, provider)
    } catch {
      throw new CrudHttpError(400, {
        error: `Unmapped ${provider} payload — include transcript and tenant/org scope`,
      })
    }

    if (!payload.tenantId || !payload.organizationId) {
      throw new CrudHttpError(400, {
        error: 'tenantId and organizationId required in webhook body or custom_fields',
      })
    }

    const ctx = await resolveWebhookContext(request, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })

    const transcript = webhookPayloadToTranscript(payload, provider)
    const { result } = await ctx.commandBus.execute('call_transcripts.ingest', {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      providerKey: provider,
      transcript,
    })

    return NextResponse.json({
      ok: true,
      provider,
      deprecatedRoute: provider === 'zoom' || provider === 'gong',
      ...(result as Record<string, unknown>),
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
