import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { getWhatIfBundle } from '../../../../../lib/what-if-registry'
import { listProductionOrders } from '../../../../../lib/production-order'
import { resolveProductionPlanningRequestContext } from '../../../../../lib/request-context'
import { runWhatIfBundle } from '../../../../../lib/what-if-scenario-runner'

const runBodySchema = z.object({
  productionOrderIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  baselineScenarioId: z.string().uuid().nullable().optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export async function POST(
  request: Request,
  context: { params: Promise<{ bundleId: string }> },
) {
  try {
    const { bundleId } = await context.params
    if (!getWhatIfBundle(bundleId)) {
      throw new CrudHttpError(404, { error: `Unknown scenario bundle: ${bundleId}` })
    }

    const { tenantId, organizationId, em, commandContext } =
      await resolveProductionPlanningRequestContext(request)
    const body = runBodySchema.parse(await request.json().catch(() => ({})))

    const orders = await listProductionOrders(em, { tenantId, organizationId }, { limit: 500 })
    const productionOrderIds =
      body.productionOrderIds ?? orders.map((o) => o.id).slice(0, 100)

    if (productionOrderIds.length === 0) {
      throw new CrudHttpError(400, { error: 'No production orders in scope' })
    }

    const result = await runWhatIfBundle(em, { tenantId, organizationId }, {
      bundleId,
      productionOrderIds,
      baselineScenarioId: body.baselineScenarioId,
      requestedByUserId: commandContext.auth?.userId ?? null,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    if (error instanceof Error && error.message.startsWith('UNKNOWN_SCENARIO_BUNDLE')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}
