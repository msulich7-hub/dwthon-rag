import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { CRM_2027_RISK_SCAN_QUEUE } from './lib/queue'

import crypto from 'node:crypto'

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

async function registerRiskScanSchedule(
  container: { hasRegistration?: (name: string) => boolean; resolve: (name: string) => unknown },
  tenantId: string,
  organizationId: string,
): Promise<void> {
  if (typeof container.hasRegistration !== 'function' || !container.hasRegistration('schedulerService')) {
    return
  }
  const schedulerService = container.resolve('schedulerService') as SchedulerServiceLike
  const scheduleId = stableUuidFromString(`crm_2027:risk-scan:${tenantId}:${organizationId}`)

  await schedulerService.register({
    id: scheduleId,
    name: 'CRM 2027 at-risk scan',
    description: 'Scans stalled deals and refreshes CRM 2027 risk flags every 6 hours.',
    scopeType: 'organization',
    organizationId,
    tenantId,
    scheduleType: 'interval',
    scheduleValue: '6h',
    timezone: 'UTC',
    targetType: 'queue',
    targetQueue: CRM_2027_RISK_SCAN_QUEUE,
    targetPayload: {
      tenantId,
      organizationId,
      stallDays: 14,
    },
    requireFeature: 'crm_2027.manage',
    sourceType: 'module',
    sourceModule: 'crm_2027',
    isEnabled: true,
  })
}

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['crm_2027.*', 'customers.*', 'ai_assistant.*', 'perspectives.use'],
    admin: [
      'crm_2027.*',
      'customers.deals.view',
      'customers.deals.manage',
      'customers.interactions.manage',
      'ai_assistant.view',
      'perspectives.use',
    ],
    employee: [
      'crm_2027.view',
      'crm_2027.ai',
      'crm_2027.voice',
      'customers.deals.view',
      'customers.interactions.manage',
      'ai_assistant.view',
      'perspectives.use',
    ],
  },

  async seedDefaults({ container, tenantId, organizationId }) {
    await registerRiskScanSchedule(container, tenantId, organizationId)
  },
}

export default setup
