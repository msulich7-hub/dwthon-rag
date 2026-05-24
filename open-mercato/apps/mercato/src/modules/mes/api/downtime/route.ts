import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listDowntimeQuerySchema, startDowntimeBodySchema } from '../../data/validators'
import { listDowntimeSegments, startDowntime } from '../../lib/downtime'
import { resolveMesRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.quality.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.quality.manage'] },
}

export const openApi = {
  GET: { summary: 'List downtime segments', tags: ['mes'] },
  POST: { summary: 'Start downtime on a work center', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = listDowntimeQuerySchema.parse({
      workCenterCode: url.searchParams.get('workCenterCode') ?? undefined,
      activeOnly: url.searchParams.get('activeOnly') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })
    const segments = await listDowntimeSegments(em, { tenantId, organizationId }, query)
    return NextResponse.json({ segments })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = startDowntimeBodySchema.parse(json)
    const segment = await startDowntime(em, { tenantId, organizationId }, body)
    return NextResponse.json({ segment }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'DOWNTIME_ALREADY_ACTIVE') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
