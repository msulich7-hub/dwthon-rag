import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { endDowntime } from '../../../../lib/downtime'
import { resolveMesRequestContext } from '../../../../lib/request-context'

export const metadata = {
  PATCH: { requireAuth: true, requireFeatures: ['mes.quality.manage'] },
}

export const openApi = {
  PATCH: { summary: 'End a downtime segment', tags: ['mes'] },
}

export async function PATCH(
  request: Request,
  ctx: { params: { segmentId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const segmentId = ctx.params?.segmentId?.trim()
    if (!segmentId) {
      return NextResponse.json({ error: 'Missing segment id' }, { status: 400 })
    }
    const segment = await endDowntime(em, { tenantId, organizationId }, segmentId)
    return NextResponse.json({ segment })
  } catch (error) {
    if (error instanceof Error) {
      const statusByCode: Record<string, number> = {
        DOWNTIME_NOT_FOUND: 404,
        DOWNTIME_ALREADY_ENDED: 409,
      }
      const status = statusByCode[error.message]
      if (status) {
        return NextResponse.json({ error: error.message }, { status })
      }
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
