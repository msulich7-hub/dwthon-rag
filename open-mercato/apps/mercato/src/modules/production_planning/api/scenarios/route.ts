import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listPlanScenarios } from '../../lib/plan-scenario-service'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } =
      await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const bundleId = url.searchParams.get('bundleId') ?? undefined
    const templateId = url.searchParams.get('templateId') ?? undefined
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 30), 100)

    const scenarios = await listPlanScenarios(
      em,
      { tenantId, organizationId },
      { bundleId, templateId, limit },
    )
    return NextResponse.json({ scenarios })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
