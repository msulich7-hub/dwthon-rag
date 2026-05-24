import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listPoolOrdersWorkbench } from '../../../lib/mrp/pegging-service'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: { summary: 'Pool MO workbench rows with pegging members', tags: ['production_planning'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
    const rows = await listPoolOrdersWorkbench(
      em,
      { tenantId, organizationId },
      { limit: Number.isFinite(limit) ? limit : 50 },
    )
    return NextResponse.json({ poolOrders: rows })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
