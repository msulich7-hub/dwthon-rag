import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { getPlanScenario } from '../../../lib/plan-scenario-service'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export async function GET(
  request: Request,
  context: { params: Promise<{ scenarioId: string }> },
) {
  try {
    const { scenarioId } = await context.params
    const { tenantId, organizationId, em } =
      await resolveProductionPlanningRequestContext(request)

    const scenario = await getPlanScenario(em, { tenantId, organizationId }, scenarioId)
    if (!scenario) {
      throw new CrudHttpError(404, { error: 'Scenario not found' })
    }
    return NextResponse.json({ scenario })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
