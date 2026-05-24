import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  PRODUCTION_PLANNING_CAPACITY_QUEUE,
  type ProductionPlanningCapacityJobPayload,
} from '../lib/queue'
import { buildCapacitySnapshot } from '../lib/capacity-snapshot'
import { emitLateOrderEvents } from '../lib/production-order'
import { emitProductionPlanningEvent } from '../events'

export const metadata: WorkerMeta = {
  queue: PRODUCTION_PLANNING_CAPACITY_QUEUE,
  id: 'production_planning:capacity-refresh',
  concurrency: 1,
}

type HandlerContext = JobContext & {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(
  job: QueuedJob<ProductionPlanningCapacityJobPayload>,
  ctx: HandlerContext,
): Promise<void> {
  const em = ctx.resolve<EntityManager>('em')
  const { tenantId, organizationId } = job.payload
  const scope = { tenantId, organizationId }

  const snapshot = await buildCapacitySnapshot(em, scope)
  const lateCount = await emitLateOrderEvents(em, scope)

  await emitProductionPlanningEvent('production_planning.schedule.refreshed', {
    tenantId,
    organizationId,
    openOrders: snapshot.openOrders,
    lateOrders: snapshot.lateOrders,
    lateEventsEmitted: lateCount,
    workCenterCount: snapshot.workCenters.length,
  })
}
