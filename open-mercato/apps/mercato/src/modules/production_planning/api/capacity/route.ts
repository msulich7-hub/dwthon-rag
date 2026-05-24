import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { buildCapacitySnapshot } from '../../lib/capacity-snapshot'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'Work-center capacity utilization snapshot',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const horizonHours = Number.parseInt(url.searchParams.get('horizonHours') ?? '168', 10)

    const snapshot = await buildCapacitySnapshot(
      em,
      { tenantId, organizationId },
      { horizonHours: Number.isFinite(horizonHours) ? horizonHours : 168 },
    )

    return NextResponse.json(snapshot)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
