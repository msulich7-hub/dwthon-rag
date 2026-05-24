import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { buildGanttPayload } from '../../lib/gantt-payload'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'Finite Gantt payload (up to 150 work centers)',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const horizonHours = Number.parseInt(url.searchParams.get('horizonHours') ?? '168', 10)
    const scenarioId = url.searchParams.get('scenarioId') ?? undefined
    const maxWorkCenters = Number.parseInt(url.searchParams.get('maxWorkCenters') ?? '150', 10)
    const planningStartAt = url.searchParams.get('planningStartAt') ?? undefined

    const payload = await buildGanttPayload(
      em,
      { tenantId, organizationId },
      {
        horizonHours: Number.isFinite(horizonHours) ? horizonHours : 168,
        scenarioId,
        maxWorkCenters: Number.isFinite(maxWorkCenters) ? Math.min(maxWorkCenters, 150) : 150,
        planningStartAt,
      },
    )

    return NextResponse.json(payload)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
