import type { EntityManager } from '@mikro-orm/postgresql'
import { applyCpsatSchedule } from './apply-cpsat-schedule'
import { buildCpsatScheduleBatchFromDb } from './build-cpsat-payload'
import { runSequentialBatchSchedule } from './cpsat-batch-solve'
import {
  mergeChunkSchedules,
  partitionProductionOrderChunks,
  resolveCpsatChunkOrderLimit,
} from './cpsat-chunking'
import {
  completeCpsatOptimizeJob,
  failCpsatOptimizeJob,
  markCpsatOptimizeJobRunning,
  updateCpsatOptimizeJobProgress,
} from './cpsat-optimize-job'
import {
  requestOrtoolsOptimization,
  type CpsatObjective,
  type CpsatObjectiveWeights,
  type CpsatScheduleEntry,
  type OrtoolsOptimizeResult,
} from './ortools-bridge'
import type { OrgScope } from './production-order'
import { emitProductionPlanningEvent } from '../events'

export type RunCpsatOptimizeInput = {
  jobId: string
  productionOrderIds: string[]
  horizonHours?: number
  objective?: CpsatObjective
  objectiveWeights?: CpsatObjectiveWeights | Record<string, number> | null
  warmStartScenarioId?: string | null
  scenarioOverrides?: Record<string, unknown> | null
  applySync?: boolean
  dryRun?: boolean
  chunkSize?: number
}

export type RunCpsatOptimizeResult = {
  jobId: string
  optimization: OrtoolsOptimizeResult
  schedule: CpsatScheduleEntry[]
  chunkCount: number
  apply?: Awaited<ReturnType<typeof applyCpsatSchedule>>
}

export async function runCpsatOptimizeJob(
  em: EntityManager,
  scope: OrgScope,
  input: RunCpsatOptimizeInput,
): Promise<RunCpsatOptimizeResult> {
  const {
    jobId,
    productionOrderIds,
    horizonHours,
    objective,
    objectiveWeights,
    warmStartScenarioId,
    scenarioOverrides,
    applySync = true,
    dryRun = false,
    chunkSize = resolveCpsatChunkOrderLimit(),
  } = input

  await markCpsatOptimizeJobRunning(em, jobId)

  const chunks = partitionProductionOrderChunks(productionOrderIds, chunkSize)
  const planningStartAt = new Date()
  const chunkSchedules: CpsatScheduleEntry[][] = []
  let lastOptimization: OrtoolsOptimizeResult = {
    jobId,
    status: 'failed',
    message: 'No chunks to optimize',
  }
  let aggregateObjective: number | null = null

  await emitProductionPlanningEvent(
    'production_planning.optimize.requested',
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      jobId,
      productionOrderIds,
      objective: objective ?? 'minimize_lateness',
      horizonHours: horizonHours ?? 168,
      chunkCount: chunks.length,
    },
    { persistent: true },
  )

  for (const chunk of chunks) {
    const batch = await buildCpsatScheduleBatchFromDb(em, scope, {
      productionOrderIds: chunk.productionOrderIds,
      horizonHours,
      objective,
      objectiveWeights,
      warmStartScenarioId,
      scenarioOverrides,
      planningStartAt,
    })

    const batchResult =
      batch.chunkCount > 1
        ? await runSequentialBatchSchedule(batch)
        : await requestOrtoolsOptimization(batch.chunks[0]!)

    const optimization: OrtoolsOptimizeResult = {
      jobId,
      status: batchResult.status === 'completed' ? 'completed' : 'failed',
      schedule: batchResult.schedule,
      message: batchResult.message,
      solverStatus:
        'chunkResults' in batchResult
          ? batchResult.chunkResults.at(-1)?.solverStatus ?? null
          : batchResult.solverStatus ?? null,
      objectiveValue:
        'totalObjectiveValue' in batchResult
          ? (batchResult.totalObjectiveValue ?? null)
          : (batchResult.objectiveValue ?? null),
      strategy:
        'chunkResults' in batchResult
          ? batchResult.chunkResults.at(-1)?.strategy
          : batchResult.strategy,
    }
    lastOptimization = optimization

    if (optimization.status !== 'completed' || !optimization.schedule?.length) {
      const message = optimization.message ?? `Chunk ${chunk.index + 1}/${chunks.length} failed`
      await failCpsatOptimizeJob(em, jobId, message)
      await emitProductionPlanningEvent(
        'production_planning.optimize.failed',
        {
          tenantId: scope.tenantId,
          organizationId: scope.organizationId,
          jobId,
          status: optimization.status,
          message,
          chunkIndex: chunk.index,
          chunkCount: chunks.length,
        },
        { persistent: true },
      )
      return {
        jobId,
        optimization: lastOptimization,
        schedule: mergeChunkSchedules(chunkSchedules, planningStartAt),
        chunkCount: chunks.length,
      }
    }

    chunkSchedules.push(optimization.schedule)
    if (typeof optimization.objectiveValue === 'number') {
      aggregateObjective = (aggregateObjective ?? 0) + optimization.objectiveValue
    }

    await updateCpsatOptimizeJobProgress(em, jobId, {
      chunksCompleted: chunk.index + 1,
      chunkCount: chunks.length,
    })

    await emitProductionPlanningEvent(
      'production_planning.optimize.chunk.completed',
      {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        jobId,
        chunkIndex: chunk.index,
        chunkCount: chunks.length,
        operationCount: optimization.schedule.length,
      },
      { persistent: true },
    )
  }

  const schedule = mergeChunkSchedules(chunkSchedules, planningStartAt)
  const optimization: OrtoolsOptimizeResult = {
    ...lastOptimization,
    jobId,
    status: 'completed',
    schedule,
    objectiveValue: aggregateObjective,
  }

  let applyResult: Awaited<ReturnType<typeof applyCpsatSchedule>> | undefined
  if (applySync && !dryRun && schedule.length > 0) {
    applyResult = await applyCpsatSchedule(em, scope, schedule, { jobId, dryRun })
  }

  await completeCpsatOptimizeJob(em, jobId, {
    solverStatus: optimization.solverStatus ?? null,
    objectiveValue: optimization.objectiveValue ?? null,
    message: optimization.message ?? null,
    operationCount: schedule.length,
    schedule: dryRun ? schedule : undefined,
    applyResult,
  })

  await emitProductionPlanningEvent(
    'production_planning.optimize.completed',
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      jobId,
      solverStatus: optimization.solverStatus,
      objectiveValue: optimization.objectiveValue,
      operationCount: schedule.length,
      chunkCount: chunks.length,
      applied: applyResult?.applied ?? 0,
    },
    { persistent: true },
  )

  return {
    jobId,
    optimization,
    schedule,
    chunkCount: chunks.length,
    apply: applyResult,
  }
}
