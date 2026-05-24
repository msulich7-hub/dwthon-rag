import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { toneEnhanceBodySchema } from '../../../../data/extras-validators'
import { enhanceReplyTone } from '../../../../lib/tone-enhance'
import { resolveHelpdeskRequestContext } from '../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['helpdesk.agent'] },
}

export async function POST(
  request: Request,
  ctx: { params: { ticketId: string } },
) {
  try {
    await resolveHelpdeskRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = toneEnhanceBodySchema.parse(json)
    const enhanced = enhanceReplyTone(body.draft, body.tone ?? 'professional')
    return NextResponse.json({ enhanced })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
