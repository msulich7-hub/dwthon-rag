import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { buildGanttPayload } from '../../../lib/gantt-payload'
import { mergeGanttForCompare, resolveSharedPlanningStartAt } from '../../../lib/gantt-compare'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'Dual Gantt compare (baseline vs scenario, shared time axis)',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const baselineScenarioId = url.searchParams.get('baselineScenarioId')
    const scenarioId = url.searchParams.get('scenarioId')
    if (!baselineScenarioId || !scenarioId) {
      return NextResponse.json(
        { error: 'baselineScenarioId and scenarioId are required' },
        { status: 400 },
      )
    }

    const horizonHours = Number.parseInt(url.searchParams.get('horizonHours') ?? '72', 10)
    const maxWorkCenters = Number.parseInt(url.searchParams.get('maxWorkCenters') ?? '50', 10)
    const planningStartAtParam = url.searchParams.get('planningStartAt') ?? undefined
    const sharedStart = resolveSharedPlanningStartAt(null, null, planningStartAtParam)
    const planningStartAt = sharedStart.toISOString()

    const scope = { tenantId, organizationId }
    const ganttOpts = {
      horizonHours: Number.isFinite(horizonHours) ? Math.min(horizonHours, 168) : 72,
      maxWorkCenters: Number.isFinite(maxWorkCenters) ? Math.min(maxWorkCenters, 50) : 50,
      planningStartAt,
    }

    const [baseline, scenario] = await Promise.all([
      buildGanttPayload(em, scope, { ...ganttOpts, scenarioId: baselineScenarioId }),
      buildGanttPayload(em, scope, { ...ganttOpts, scenarioId }),
    ])

    const compare = mergeGanttForCompare(
      baseline,
      scenario,
      baselineScenarioId,
      scenarioId,
    )

    return NextResponse.json(compare)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
