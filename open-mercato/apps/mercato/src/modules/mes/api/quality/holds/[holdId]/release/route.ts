import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { releaseQualityHold } from '../../../../../lib/quality-holds'
import { resolveMesRequestContext } from '../../../../../lib/request-context'

export const metadata = {
  PATCH: { requireAuth: true, requireFeatures: ['mes.quality.manage'] },
}

export const openApi = {
  PATCH: { summary: 'Release a quality hold', tags: ['mes'] },
}

export async function PATCH(
  request: Request,
  ctx: { params: { holdId: string } },
) {
  try {
    const mesCtx = await resolveMesRequestContext(request)
    const holdId = ctx.params?.holdId?.trim()
    if (!holdId) {
      return NextResponse.json({ error: 'Missing hold id' }, { status: 400 })
    }
    const userId = mesCtx.commandContext.auth?.sub ?? null
    const hold = await releaseQualityHold(
      mesCtx.em,
      { tenantId: mesCtx.tenantId, organizationId: mesCtx.organizationId },
      holdId,
      userId,
    )
    return NextResponse.json({ hold })
  } catch (error) {
    if (error instanceof Error) {
      const statusByCode: Record<string, number> = {
        HOLD_NOT_FOUND: 404,
        HOLD_NOT_ACTIVE: 409,
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
