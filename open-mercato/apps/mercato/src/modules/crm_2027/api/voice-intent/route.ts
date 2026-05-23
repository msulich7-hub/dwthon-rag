import { z } from 'zod'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { parseVoiceIntent } from '../../lib/voice-intent'
import { resolveCrm2027RequestContext } from '../../lib/request-context'

const bodySchema = z.object({
  transcript: z.string().min(1).max(4000),
  locale: z.enum(['pl', 'en']).optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['crm_2027.voice'] },
}

export async function POST(request: Request) {
  try {
    await resolveCrm2027RequestContext(request)
    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'invalid_body', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const result = parseVoiceIntent(parsed.data.transcript)

    return Response.json({
      ok: true,
      locale: parsed.data.locale ?? 'pl',
      ...result,
      executeUrl: '/api/crm_2027/voice-execute',
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return Response.json(error.body, { status: error.status })
    }
    throw error
  }
}
