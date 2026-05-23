import { z } from 'zod'
import { parseVoiceIntent } from '../../lib/voice-intent'

const bodySchema = z.object({
  transcript: z.string().min(1).max(4000),
  locale: z.enum(['pl', 'en']).optional(),
})

export const metadata = {
  requireAuth: true,
  requiredFeatures: ['crm_2027.voice'],
}

export async function POST(request: Request) {
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
    hint: 'Phase 1 returns structured intent only; wire execution via activities/deals commands in Phase 2.',
  })
}
