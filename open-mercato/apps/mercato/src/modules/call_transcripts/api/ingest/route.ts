import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { callTranscriptIngestSchema } from '../../data/validators'
import { resolveCallTranscriptsRequestContext } from '../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['call_transcripts.ingest'] },
}

export const openApi = {
  POST: {
    summary: 'Ingest a normalized call transcript',
    tags: ['call_transcripts'],
  },
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveCallTranscriptsRequestContext(request)
    const json = await request.json().catch(() => null)
    const parsed = callTranscriptIngestSchema.parse({
      ...json,
      tenantId: (json as { tenantId?: string })?.tenantId ?? ctx.tenantId,
      organizationId:
        (json as { organizationId?: string })?.organizationId ?? ctx.organizationId,
    })

    const { result } = await ctx.commandBus.execute('call_transcripts.ingest', parsed)

    return NextResponse.json({ ok: true, ...(result as Record<string, unknown>) })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
