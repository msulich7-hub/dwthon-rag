import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildFeatureNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { notificationTypes } from '../notifications'

export const metadata = {
  event: 'production_planning.optimize.completed',
  persistent: true,
  id: 'production_planning:optimize-completed-notifier',
}

type OptimizeCompletedPayload = {
  tenantId: string
  organizationId: string
  jobId: string
  operationCount: number
  applied: number
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(payload: OptimizeCompletedPayload, ctx: ResolverContext) {
  try {
    const typeDef = notificationTypes.find((t) => t.type === 'production_planning.optimize.completed')
    if (!typeDef) return

    const notificationService = resolveNotificationService(ctx)
    const input = buildFeatureNotificationFromType(typeDef, {
      requiredFeature: 'production_planning.view',
      bodyVariables: {
        operationCount: String(payload.operationCount),
        applied: String(payload.applied),
      },
      sourceEntityType: 'optimize_job',
      sourceEntityId: payload.jobId,
      linkHref: '/backend/production_planning/schedule',
    })

    await notificationService.createForFeature(input, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
  } catch (err) {
    console.error('[production_planning:optimize-completed-notifier]', err)
  }
}
