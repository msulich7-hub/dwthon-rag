import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { PRODUCTION_PLANNING_CAPACITY_QUEUE } from './lib/queue'
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

async function registerCapacityRefreshSchedule(
  container: { hasRegistration?: (name: string) => boolean; resolve: (name: string) => unknown },
  tenantId: string,
  organizationId: string,
): Promise<void> {
  if (typeof container.hasRegistration !== 'function' || !container.hasRegistration('schedulerService')) {
    return
  }
  const schedulerService = container.resolve('schedulerService') as SchedulerServiceLike
  const scheduleId = stableUuidFromString(
    `production_planning:capacity:${tenantId}:${organizationId}`,
  )

  await schedulerService.register({
    id: scheduleId,
    name: 'Production planning capacity refresh',
    description: 'Recomputes work-center utilization and flags late production orders every 4 hours.',
    scopeType: 'organization',
    organizationId,
    tenantId,
    scheduleType: 'interval',
    scheduleValue: '4h',
    timezone: 'UTC',
    targetType: 'queue',
    targetQueue: PRODUCTION_PLANNING_CAPACITY_QUEUE,
    targetPayload: { tenantId, organizationId },
    requireFeature: 'production_planning.manage',
    sourceType: 'module',
    sourceModule: 'production_planning',
    isEnabled: true,
  })
}

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['production_planning.*', 'sales.*', 'ai_assistant.view'],
    admin: [
      'production_planning.*',
      'production_planning.scenarios',
      'sales.orders.view',
      'sales.orders.manage',
      'ai_assistant.view',
    ],
    employee: [
      'production_planning.view',
      'sales.orders.view',
    ],
  },

  async seedDefaults({ container, tenantId, organizationId }) {
    await registerCapacityRefreshSchedule(container, tenantId, organizationId)
  },
}

export default setup
