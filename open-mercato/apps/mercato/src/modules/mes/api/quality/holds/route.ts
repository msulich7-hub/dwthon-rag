import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createQualityHoldBodySchema, listQualityHoldsQuerySchema } from '../../../data/validators'
import { createQualityHold, listQualityHolds } from '../../../lib/quality-holds'
import { resolveMesRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.quality.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.quality.manage'] },
}

export const openApi = {
  GET: { summary: 'List quality holds', tags: ['mes'] },
  POST: { summary: 'Create a quality hold', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = listQualityHoldsQuerySchema.parse({
      targetType: url.searchParams.get('targetType') ?? undefined,
      targetId: url.searchParams.get('targetId') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })
    const holds = await listQualityHolds(em, { tenantId, organizationId }, query)
    return NextResponse.json({ holds })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveMesRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = createQualityHoldBodySchema.parse(json)
    const userId = ctx.commandContext.auth?.sub ?? null
    const hold = await createQualityHold(
      ctx.em,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      body,
      userId,
    )
    return NextResponse.json({ hold }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'HOLD_ALREADY_ACTIVE') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
