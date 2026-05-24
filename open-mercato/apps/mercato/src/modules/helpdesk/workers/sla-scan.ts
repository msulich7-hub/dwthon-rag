import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import { HELPDESK_SLA_SCAN_QUEUE, type HelpdeskSlaScanJobPayload } from '../lib/job-queue'
import { emitSlaBreachEvents } from '../lib/emit-sla-breach-events'
import { markSlaBreachNotified, scanNewSlaBreaches } from '../lib/sla-breach-scan'

export const metadata: WorkerMeta = {
  queue: HELPDESK_SLA_SCAN_QUEUE,
  id: 'helpdesk:sla-scan',
  concurrency: 1,
}

type HandlerContext = JobContext & {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(
  job: QueuedJob<HelpdeskSlaScanJobPayload>,
  ctx: HandlerContext,
): Promise<void> {
  const em = ctx.resolve<EntityManager>('em')
  const container = ctx.resolve<AwilixContainer>('container')
  const scope = { tenantId: job.payload.tenantId, organizationId: job.payload.organizationId }

  const alerts = await scanNewSlaBreaches(em, scope)
  if (!alerts.length) return

  await emitSlaBreachEvents(container, scope, alerts)
  await markSlaBreachNotified(
    em,
    scope,
    alerts.map((a) => a.ticketId),
  )
}
