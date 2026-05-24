import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import crypto from 'node:crypto'
import { HELPDESK_SLA_SCAN_QUEUE } from './lib/job-queue'
import { seedHelpdeskDefaults } from './lib/seed-defaults'
import { seedHelpdeskExamples } from './lib/seed-examples'

function stableUuidFromString(input: string): string {
  const bytes = crypto.createHash('sha256').update(input).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Buffer.from(bytes).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

type SchedulerServiceLike = {
  register: (registration: Record<string, unknown>) => Promise<void>
}

async function registerHelpdeskSlaSchedule(
  container: { hasRegistration?: (name: string) => boolean; resolve: (name: string) => unknown },
  tenantId: string,
  organizationId: string,
): Promise<void> {
  if (typeof container.hasRegistration !== 'function' || !container.hasRegistration('schedulerService')) {
    return
  }
  const schedulerService = container.resolve('schedulerService') as SchedulerServiceLike
  const scheduleId = stableUuidFromString(`helpdesk:sla-scan:${tenantId}:${organizationId}`)

  await schedulerService.register({
    id: scheduleId,
    name: 'Helpdesk SLA breach scan',
    description: 'Notifies agents when open tickets exceed SLA due time.',
    scopeType: 'organization',
    organizationId,
    tenantId,
    scheduleType: 'interval',
    scheduleValue: '15m',
    timezone: 'UTC',
    targetType: 'queue',
    targetQueue: HELPDESK_SLA_SCAN_QUEUE,
    targetPayload: { tenantId, organizationId },
    requireFeature: 'helpdesk.agent',
    sourceType: 'module',
    sourceModule: 'helpdesk',
    isEnabled: true,
  })
}

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['helpdesk.*', 'customers.*'],
    admin: ['helpdesk.*', 'helpdesk.voice', 'helpdesk.ingest', 'customers.companies.view', 'customers.people.view'],
    employee: [
      'helpdesk.submit',
      'helpdesk.view',
      'helpdesk.voice',
      'customers.companies.view',
      'customers.people.view',
    ],
  },
  async seedDefaults({ container, tenantId, organizationId }) {
    const em = container.resolve<{ fork: () => import('@mikro-orm/postgresql').EntityManager }>('em').fork()
    await seedHelpdeskDefaults(em, { tenantId, organizationId })
    await registerHelpdeskSlaSchedule(container, tenantId, organizationId)
  },
  async seedExamples({ container, tenantId, organizationId }) {
    const em = container.resolve<{ fork: () => import('@mikro-orm/postgresql').EntityManager }>('em').fork()
    await seedHelpdeskExamples(em, { tenantId, organizationId })
  },
}

export default setup
