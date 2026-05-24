import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { runAntiFantasyChecks } from '../../../lib/anti-fantasy'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'Anti-fantasy schedule validation (finite capacity, no ETL)',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const horizonHours = Number.parseInt(url.searchParams.get('horizonHours') ?? '168', 10)
    const report = await runAntiFantasyChecks(
      em,
      { tenantId, organizationId },
      { horizonHours: Number.isFinite(horizonHours) ? horizonHours : 168 },
    )
    return NextResponse.json(report)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
