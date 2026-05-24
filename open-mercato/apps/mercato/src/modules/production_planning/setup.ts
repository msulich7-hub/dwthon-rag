import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import type { EntityManager } from '@mikro-orm/postgresql'
import { PRODUCTION_PLANNING_CAPACITY_QUEUE } from './lib/queue'
import { seedFactoryFixture, type FactorySeedPreset } from './lib/seed-factory-fixture'
import { stableUuidFromString } from './lib/stable-uuid'

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

    const autoSeed = process.env.PRODUCTION_PLANNING_AUTO_SEED?.trim()
    if (!autoSeed || autoSeed === '0' || autoSeed === 'false') {
      return
    }

    const preset: FactorySeedPreset =
      autoSeed === 'small' || autoSeed === 'medium' || autoSeed === 'benchmark'
        ? autoSeed
        : 'small'

    if (!container.hasRegistration?.('em')) {
      return
    }

    const em = container.resolve('em') as EntityManager
    await seedFactoryFixture(
      em,
      { tenantId, organizationId },
      {
        preset,
        logger: (message) => console.log(`[production_planning] ${message}`),
      },
    )
  },
}

export default setup
