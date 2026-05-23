import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { applyCpsatSchedule } from '../../lib/apply-cpsat-schedule'
import { buildCpsatScheduleRequest } from '../../lib/build-cpsat-payload'
import { buildCapacitySnapshot } from '../../lib/capacity-snapshot'
import {
  isOrtoolsBridgeConfigured,
  requestOrtoolsOptimization,
  type CpsatObjective,
} from '../../lib/ortools-bridge'
import { listProductionOrders } from '../../lib/production-order'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'
import { emitProductionPlanningEvent } from '../../events'

const optimizeBodySchema = z.object({
  productionOrderIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  horizonHours: z.number().int().min(24).max(24 * 30).optional(),
  objective: z.enum(['minimize_lateness', 'minimize_changeover', 'balance_load']).optional(),
  applySync: z.boolean().optional(),
  dryRun: z.boolean().optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  POST: {
    summary: 'Run CP-SAT production scheduling (OR-Tools bridge) and optionally apply results',
    tags: ['production_planning'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const json = await request.json().catch(() => ({}))
    const body = optimizeBodySchema.parse(json)

    const orders = await listProductionOrders(em, { tenantId, organizationId }, { limit: 500 })
    const orderIds =
      body.productionOrderIds ?? orders.map((o) => o.id).slice(0, 100)

    const snapshot = await buildCapacitySnapshot(
      em,
      { tenantId, organizationId },
      { horizonHours: body.horizonHours },
    )

    let optimization: Awaited<ReturnType<typeof requestOrtoolsOptimization>> = {
      jobId: 'local-heuristic',
      status: 'completed',
      message: 'No order ids to optimize',
    }

    let applyResult: Awaited<ReturnType<typeof applyCpsatSchedule>> | undefined

    if (orderIds.length > 0) {
      try {
        const payload = await buildCpsatScheduleRequest(em, { tenantId, organizationId }, {
          productionOrderIds: orderIds,
          horizonHours: body.horizonHours,
          objective: body.objective as CpsatObjective | undefined,
        })

        await emitProductionPlanningEvent(
          'production_planning.optimize.requested',
          {
            tenantId,
            organizationId,
            jobId: payload.planningStartAt,
            productionOrderIds: orderIds,
            objective: payload.objective,
            horizonHours: payload.horizonHours,
          },
          { persistent: true },
        )

        optimization = await requestOrtoolsOptimization(payload)

        if (optimization.status === 'completed' && optimization.schedule?.length) {
          await emitProductionPlanningEvent(
            'production_planning.optimize.completed',
            {
              tenantId,
              organizationId,
              jobId: optimization.jobId,
              solverStatus: optimization.solverStatus,
              objectiveValue: optimization.objectiveValue,
              operationCount: optimization.schedule.length,
            },
            { persistent: true },
          )

          if (body.applySync !== false && !body.dryRun) {
            applyResult = await applyCpsatSchedule(
              em,
              { tenantId, organizationId },
              optimization.schedule,
              { jobId: optimization.jobId, dryRun: body.dryRun },
            )
          }
        } else if (optimization.status === 'failed') {
          await emitProductionPlanningEvent(
            'production_planning.optimize.failed',
            {
              tenantId,
              organizationId,
              jobId: optimization.jobId,
              status: optimization.status,
              message: optimization.message,
            },
            { persistent: true },
          )
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'NO_SCHEDULABLE_ORDERS') {
          throw new CrudHttpError(400, { error: 'No schedulable production orders' })
        }
        if (error instanceof Error && error.message === 'NO_SCHEDULABLE_OPERATIONS') {
          throw new CrudHttpError(400, {
            error: 'Production orders have no routing operations to schedule',
          })
        }
        throw error
      }
    }

    return NextResponse.json({
      cpsatConfigured: isOrtoolsBridgeConfigured(),
      snapshot,
      optimization,
      apply: applyResult,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
