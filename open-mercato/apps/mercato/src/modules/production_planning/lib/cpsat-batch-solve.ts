import {
  deriveWorkCenterFloorsFromSchedule,
  mergeCpsatSchedules,
  type CpsatScheduleBatch,
} from './cpsat-chunking'
import {
  requestOrtoolsOptimization,
  type CpsatFixedOperation,
  type CpsatScheduleRequest,
  type OrtoolsBatchOptimizeResult,
  type OrtoolsOptimizeResult,
} from './ortools-bridge'

export async function runSequentialBatchSchedule(
  batch: CpsatScheduleBatch,
): Promise<OrtoolsBatchOptimizeResult> {
  const chunkResults: OrtoolsOptimizeResult[] = []
  const fixedOperations: CpsatFixedOperation[] = []
  let workCenterFloors: Array<{ workCenterCode: string; earliestStartAt: string }> = []
  let totalObjective = 0
  let objectiveChunks = 0

  for (const baseChunk of batch.chunks) {
    const payload: CpsatScheduleRequest = {
      ...baseChunk,
      fixedOperations: [...fixedOperations],
      workCenterFloors: [...workCenterFloors],
    }

    const result = await requestOrtoolsOptimization(payload)
    chunkResults.push(result)

    if (result.status !== 'completed' || !result.schedule?.length) {
      return {
        batchId: batch.batchId,
        status: 'failed',
        chunkResults,
        schedule: mergeCpsatSchedules(chunkResults.flatMap((r) => r.schedule ?? [])),
        message: result.message ?? `Chunk ${baseChunk.chunk?.chunkIndex ?? '?'} failed`,
      }
    }

    for (const row of result.schedule) {
      fixedOperations.push({
        operationId: row.operationId,
        workCenterCode: row.workCenterCode,
        plannedStartAt: row.plannedStartAt,
        plannedEndAt: row.plannedEndAt,
      })
    }

    workCenterFloors = deriveWorkCenterFloorsFromSchedule(
      chunkResults.flatMap((r) => r.schedule ?? []),
    )

    if (result.objectiveValue != null) {
      totalObjective += result.objectiveValue
      objectiveChunks += 1
    }
  }

  const schedule = mergeCpsatSchedules(chunkResults.flatMap((r) => r.schedule ?? []))

  return {
    batchId: batch.batchId,
    status: 'completed',
    chunkResults,
    schedule,
    totalObjectiveValue: objectiveChunks > 0 ? totalObjective : null,
    message: `Scheduled ${schedule.length} operations in ${batch.chunkCount} chunk(s)`,
  }
}
