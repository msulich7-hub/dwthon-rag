import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { sttTranscribeSchema } from '../../../data/validators'
import { resolveCrm2027RequestContext } from '../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['crm_2027.manage'] },
}

export const openApi = {
  POST: {
    summary: 'STT bridge — accept transcript or defer audio to external provider',
    tags: ['crm_2027'],
  },
}

/**
 * Open Mercato does not run STT in-module. Pass `transcript` from Zoom/Gong/Whisper,
 * or configure upstream `call_transcripts` per platform spec.
 */
export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null)
    const body = sttTranscribeSchema.parse(json)

    if (body.audioUrl && !body.transcript) {
      return NextResponse.json(
        {
          ok: false,
          error: 'STT_NOT_CONFIGURED',
          message:
            'Audio transcription is not performed in CRM 2027. Send transcript text from your provider or enable call_transcripts module.',
          audioUrl: body.audioUrl,
        },
        { status: 501 },
      )
    }

    if (!body.transcript) {
      throw new CrudHttpError(400, { error: 'transcript or audioUrl required' })
    }

    const ctx = await resolveCrm2027RequestContext(request)
    const externalRecordingId = `stt-${body.dealId ?? 'manual'}-${Date.now()}`
    const { result } = await ctx.commandBus.execute('call_transcripts.ingest', {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      providerKey: 'stt',
      transcript: {
        externalRecordingId,
        occurredAt: new Date(),
        title: body.dealId ? 'STT transcript' : 'STT transcript',
        text: body.transcript,
        participants: [{ email: 'stt-bridge@local.invalid', displayName: 'STT bridge' }],
        dealId: body.dealId,
      },
    })

    return NextResponse.json({
      ok: true,
      transcript: body.transcript,
      dealId: body.dealId ?? null,
      ingest: result,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
