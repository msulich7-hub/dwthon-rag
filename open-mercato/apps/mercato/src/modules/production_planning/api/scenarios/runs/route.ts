import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { listProductionOrders } from '../../../lib/production-order'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'
import { runTemplateScenario } from '../../../lib/what-if-scenario-runner'
import { getWhatIfTemplate } from '../../../lib/what-if-registry'

const runBodySchema = z.object({
  templateId: z.string().regex(/^(T|WIF)-\d{2}$/),
  productionOrderIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  scenarioLabel: z.string().min(1).max(200).optional(),
  parentScenarioId: z.string().uuid().nullable().optional(),
  baselineScenarioId: z.string().uuid().nullable().optional(),
  extraOverrides: z.record(z.unknown()).optional(),
  dryRun: z.boolean().optional(),
  applySync: z.boolean().optional(),
  proposeOnly: z.boolean().optional(),
  horizonHours: z.number().int().min(24).max(24 * 26).optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em, commandContext } =
      await resolveProductionPlanningRequestContext(request)
    const body = runBodySchema.parse(await request.json())

    if (!getWhatIfTemplate(body.templateId)) {
      throw new CrudHttpError(404, { error: `Unknown scenario template: ${body.templateId}` })
    }

    const orders = await listProductionOrders(em, { tenantId, organizationId }, { limit: 500 })
    const productionOrderIds =
      body.productionOrderIds ?? orders.map((o) => o.id).slice(0, 100)

    if (productionOrderIds.length === 0) {
      throw new CrudHttpError(400, { error: 'No production orders in scope' })
    }

    const result = await runTemplateScenario(em, { tenantId, organizationId }, {
      templateId: body.templateId,
      productionOrderIds,
      scenarioLabel: body.scenarioLabel,
      parentScenarioId: body.parentScenarioId,
      baselineScenarioId: body.baselineScenarioId,
      extraOverrides: body.extraOverrides,
      dryRun: body.dryRun,
      applySync: body.applySync,
      proposeOnly: body.proposeOnly,
      horizonHours: body.horizonHours,
      requestedByUserId: commandContext.auth?.userId ?? null,
    })

    return NextResponse.json({
      scenario: result.scenario,
      optimization: {
        status: result.optimization.status,
        solverStatus: result.optimization.solverStatus,
        objectiveValue: result.optimization.objectiveValue,
        message: result.optimization.message,
      },
      chunkCount: result.chunkCount,
      wallMs: result.wallMs,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    if (error instanceof Error && error.message.startsWith('UNKNOWN_SCENARIO_TEMPLATE')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}
