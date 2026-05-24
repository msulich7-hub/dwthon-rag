import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { applyCpsatSchedule } from '../../lib/apply-cpsat-schedule'
import { createCpsatJobId } from '../../lib/build-cpsat-payload'
import { shouldRunCpsatAsync, partitionProductionOrderChunks } from '../../lib/cpsat-chunking'
import { createCpsatOptimizeJob } from '../../lib/cpsat-optimize-job'
import { runCpsatOptimizeJob } from '../../lib/cpsat-optimize-runner'
import { buildCapacitySnapshot } from '../../lib/capacity-snapshot'
import {
  isOrtoolsBridgeConfigured,
  type CpsatObjective,
} from '../../lib/ortools-bridge'
import { listProductionOrders } from '../../lib/production-order'
import {
  getProductionPlanningQueue,
  PRODUCTION_PLANNING_CPSAT_OPTIMIZE_QUEUE,
  type CpsatOptimizeJobPayload,
} from '../../lib/queue'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'
import { runTemplateScenario } from '../../lib/what-if-scenario-runner'

const optimizeBodySchema = z.object({
  productionOrderIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  horizonHours: z.number().int().min(24).max(24 * 30).optional(),
  objective: z.enum(['minimize_lateness', 'minimize_changeover', 'balance_load']).optional(),
  applySync: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  mode: z.enum(['sync', 'async', 'auto']).default('auto'),
  chunkSize: z.number().int().min(1).max(100).optional(),
  scenarioLabel: z.string().min(1).max(200).optional(),
  parentScenarioId: z.string().uuid().optional(),
  baselineScenarioId: z.string().uuid().optional(),
  templateId: z.string().regex(/^(T|WIF)-\d{2}$/).optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  POST: {
    summary: 'Run CP-SAT production scheduling (sync or async via queue)',
    tags: ['production_planning'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em, commandContext } =
      await resolveProductionPlanningRequestContext(request)
    const requestedByUserId = commandContext.auth?.userId ?? null
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

    if (orderIds.length === 0) {
      return NextResponse.json({
        cpsatConfigured: isOrtoolsBridgeConfigured(),
        mode: body.mode,
        snapshot,
        optimization: {
          jobId: 'local-heuristic',
          status: 'completed',
          message: 'No order ids to optimize',
        },
      })
    }

    if (body.templateId) {
      const scenarioRun = await runTemplateScenario(
        em,
        { tenantId, organizationId },
        {
          templateId: body.templateId,
          productionOrderIds: orderIds,
          scenarioLabel: body.scenarioLabel ?? `Optimize ${body.templateId}`,
          parentScenarioId: body.parentScenarioId,
          baselineScenarioId: body.baselineScenarioId,
          dryRun: body.dryRun ?? true,
          applySync: body.applySync,
          proposeOnly: !(body.applySync === true),
          horizonHours: body.horizonHours,
          requestedByUserId,
        },
      )
      return NextResponse.json({
        cpsatConfigured: isOrtoolsBridgeConfigured(),
        mode: 'scenario',
        snapshot,
        scenario: scenarioRun.scenario,
        optimization: scenarioRun.optimization,
        chunkCount: scenarioRun.chunkCount,
        wallMs: scenarioRun.wallMs,
      })
    }

    const runAsync = shouldRunCpsatAsync(orderIds.length, body.mode)

    if (runAsync) {
      const jobId = createCpsatJobId()
      const chunks = partitionProductionOrderChunks(orderIds, body.chunkSize)
      const payload: CpsatOptimizeJobPayload = {
        jobId,
        tenantId,
        organizationId,
        productionOrderIds: orderIds,
        horizonHours: body.horizonHours,
        objective: body.objective,
        applySync: body.applySync,
        dryRun: body.dryRun,
        chunkSize: body.chunkSize,
        requestedByUserId,
      }

      const queue = getProductionPlanningQueue<CpsatOptimizeJobPayload>(
        PRODUCTION_PLANNING_CPSAT_OPTIMIZE_QUEUE,
      )
      const queueJobId = await queue.enqueue(payload)

      await createCpsatOptimizeJob(
        em,
        { tenantId, organizationId },
        {
          id: jobId,
          productionOrderIds: orderIds,
          horizonHours: body.horizonHours,
          objective: body.objective,
          applySync: body.applySync,
          dryRun: body.dryRun,
          chunkCount: chunks.length,
          queueJobId,
          requestedByUserId,
        },
      )

      return NextResponse.json(
        {
          cpsatConfigured: isOrtoolsBridgeConfigured(),
          mode: 'async',
          jobId,
          queue: PRODUCTION_PLANNING_CPSAT_OPTIMIZE_QUEUE,
          queueJobId,
          status: 'queued',
          chunkCount: chunks.length,
          snapshot,
          pollUrl: `/api/production_planning/optimize/jobs/${jobId}`,
        },
        { status: 202 },
      )
    }

    const jobId = createCpsatJobId()
    let applyResult: Awaited<ReturnType<typeof applyCpsatSchedule>> | undefined

    try {
      const result = await runCpsatOptimizeJob(
        em,
        { tenantId, organizationId },
        {
          jobId,
          productionOrderIds: orderIds,
          horizonHours: body.horizonHours,
          objective: body.objective as CpsatObjective | undefined,
          applySync: body.applySync,
          dryRun: body.dryRun,
          chunkSize: body.chunkSize,
        },
      )
      applyResult = result.apply

      return NextResponse.json({
        cpsatConfigured: isOrtoolsBridgeConfigured(),
        mode: 'sync',
        jobId,
        snapshot,
        optimization: result.optimization,
        apply: applyResult,
        chunkCount: result.chunkCount,
      })
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
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
