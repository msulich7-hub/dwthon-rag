import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { voiceIntentBodySchema } from '../../data/extras-validators'
import { parseHelpdeskVoiceIntent } from '../../lib/voice-intent'
import { resolveHelpdeskRequestContext } from '../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.voice', 'helpdesk.agent'] },
}

export async function POST(request: Request) {
  try {
    await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = voiceIntentBodySchema.parse(json)
    const result = parseHelpdeskVoiceIntent(body.transcript)
    return NextResponse.json({
      ok: true,
      locale: body.locale ?? 'pl',
      ...result,
      executeUrl: '/api/helpdesk/voice-execute',
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
