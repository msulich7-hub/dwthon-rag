import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  PRODUCTION_PLANNING_CPSAT_OPTIMIZE_QUEUE,
  type CpsatOptimizeJobPayload,
} from '../lib/queue'
import { runCpsatOptimizeJob } from '../lib/cpsat-optimize-runner'
import { failCpsatOptimizeJob } from '../lib/cpsat-optimize-job'

export const metadata: WorkerMeta = {
  queue: PRODUCTION_PLANNING_CPSAT_OPTIMIZE_QUEUE,
  id: 'production_planning:cpsat-optimize',
  concurrency: 1,
}

type HandlerContext = JobContext & {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(
  job: QueuedJob<CpsatOptimizeJobPayload>,
  ctx: HandlerContext,
): Promise<void> {
  const em = ctx.resolve<EntityManager>('em')
  const {
    jobId,
    tenantId,
    organizationId,
    productionOrderIds,
    horizonHours,
    objective,
    applySync,
    dryRun,
    chunkSize,
  } = job.payload

  try {
    await runCpsatOptimizeJob(
      em,
      { tenantId, organizationId },
      {
        jobId,
        productionOrderIds,
        horizonHours,
        objective,
        applySync,
        dryRun,
        chunkSize,
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CP-SAT optimize worker failed'
    await failCpsatOptimizeJob(em, jobId, message)
    throw error
  }
}
