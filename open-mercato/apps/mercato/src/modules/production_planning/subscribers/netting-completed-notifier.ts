import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildFeatureNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { notificationTypes } from '../notifications'

export const metadata = {
  event: 'production_planning.netting.completed',
  persistent: true,
  id: 'production_planning:netting-completed-notifier',
}

type NettingCompletedPayload = {
  tenantId: string
  organizationId: string
  runId: string
  rootsProcessed: number
  poolMoCreated: number
  consolidationPct: number
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(payload: NettingCompletedPayload, ctx: ResolverContext) {
  try {
    const typeDef = notificationTypes.find((t) => t.type === 'production_planning.netting.completed')
    if (!typeDef) return

    const notificationService = resolveNotificationService(ctx)
    const input = buildFeatureNotificationFromType(typeDef, {
      requiredFeature: 'production_planning.view',
      bodyVariables: {
        rootsProcessed: String(payload.rootsProcessed),
        poolMoCreated: String(payload.poolMoCreated),
        consolidationPct: String(payload.consolidationPct),
      },
      sourceEntityType: 'netting_run',
      sourceEntityId: payload.runId,
      linkHref: '/backend/production_planning/genesis',
    })

    await notificationService.createForFeature(input, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
  } catch (err) {
    console.error('[production_planning:netting-completed-notifier]', err)
  }
}
