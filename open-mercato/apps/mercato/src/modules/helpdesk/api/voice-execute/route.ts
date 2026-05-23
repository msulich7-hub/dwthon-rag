import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { voiceExecuteBodySchema } from '../../data/extras-validators'
import { executeHelpdeskVoiceIntent } from '../../lib/voice-execute'
import { resolveHelpdeskRequestContext } from '../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.voice', 'helpdesk.agent'] },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em, userId } = await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = voiceExecuteBodySchema.parse(json)
    const result = await executeHelpdeskVoiceIntent(
      em,
      { tenantId, organizationId },
      { transcript: body.transcript, ticketId: body.ticketId, userId },
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
