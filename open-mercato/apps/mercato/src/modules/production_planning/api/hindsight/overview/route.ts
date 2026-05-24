import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { buildHindsightOverview } from '../../../lib/hindsight/hindsight-service'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'Hindsight chaos premium overview (Mercato scenarios, no IFS actuals)',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const baselineScenarioId = url.searchParams.get('baselineScenarioId') ?? undefined
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '20', 10)

    const overview = await buildHindsightOverview(
      em,
      { tenantId, organizationId },
      {
        baselineScenarioId,
        limit: Number.isFinite(limit) ? limit : 20,
      },
    )

    return NextResponse.json(overview)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
