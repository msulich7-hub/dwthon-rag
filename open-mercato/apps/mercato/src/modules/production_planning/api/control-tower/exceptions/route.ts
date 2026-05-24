import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listControlTowerExceptions } from '../../../lib/control-tower'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'Planning exception queue with severity (control tower)',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const horizonHours = Number.parseInt(url.searchParams.get('horizonHours') ?? '168', 10)
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10)

    const exceptions = await listControlTowerExceptions(
      em,
      { tenantId, organizationId },
      {
        horizonHours: Number.isFinite(horizonHours) ? horizonHours : 168,
        limit: Number.isFinite(limit) ? Math.min(limit, 200) : 100,
      },
    )

    return NextResponse.json({ items: exceptions, count: exceptions.length })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
