import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import { CRM_2027_EMAIL_SYNC_QUEUE, type Crm2027EmailSyncJobPayload } from '../lib/queue'
import { syncEmailInteractions } from '../lib/email-sync'

export const metadata: WorkerMeta = {
  queue: CRM_2027_EMAIL_SYNC_QUEUE,
  id: 'crm_2027:email-sync',
  concurrency: 1,
}

type HandlerContext = JobContext & {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(
  job: QueuedJob<Crm2027EmailSyncJobPayload>,
  ctx: HandlerContext,
): Promise<void> {
  const em = ctx.resolve<EntityManager>('em')
  const container = ctx.resolve<AwilixContainer>('container')
  const { tenantId, organizationId, days, limit } = job.payload

  await syncEmailInteractions(
    em,
    container,
    { tenantId, organizationId },
    { days: days ?? 14, limit: limit ?? 50 },
  )
}
