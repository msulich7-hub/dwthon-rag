import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import type { EntityManager } from '@mikro-orm/postgresql'
import { CRM_2027_RISK_SCAN_QUEUE, type Crm2027RiskScanJobPayload } from '../lib/queue'
import { scanAtRiskDeals } from '../lib/at-risk-scan'
import { persistAtRiskFlags } from '../lib/persist-risk-flags'

export const metadata: WorkerMeta = {
  queue: CRM_2027_RISK_SCAN_QUEUE,
  id: 'crm_2027:risk-scan',
  concurrency: 1,
}

type HandlerContext = JobContext & {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(
  job: QueuedJob<Crm2027RiskScanJobPayload>,
  ctx: HandlerContext,
): Promise<void> {
  const em = ctx.resolve<EntityManager>('em')
  const { tenantId, organizationId, stallDays } = job.payload

  const items = await scanAtRiskDeals(em, {
    tenantId,
    organizationId,
    stallDays: stallDays ?? 14,
    limit: 100,
  })

  await persistAtRiskFlags(em, { tenantId, organizationId }, items)
}
