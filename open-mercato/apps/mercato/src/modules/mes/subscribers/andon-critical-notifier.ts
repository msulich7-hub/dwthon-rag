import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildFeatureNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { notificationTypes } from '../notifications'

export const metadata = {
  event: 'mes.andon.critical',
  persistent: true,
  id: 'mes:andon-critical-notifier',
}

export type MesAndonCriticalPayload = {
  tenantId: string
  organizationId: string
  escalationLevel: number
  alertCode: string
  andon: string
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(payload: MesAndonCriticalPayload, ctx: ResolverContext) {
  try {
    const notificationService = resolveNotificationService(ctx)
    const typeDef = notificationTypes.find((t) => t.type === 'mes.andon.critical')
    if (!typeDef) return

    const notificationInput = buildFeatureNotificationFromType(typeDef, {
      requiredFeature: 'mes.view',
      bodyVariables: {
        alertCode: payload.alertCode,
        level: payload.escalationLevel,
      },
      linkHref: '/backend/mes/pulse',
    })

    await notificationService.createForFeature(notificationInput, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
  } catch (err) {
    console.error('[mes:andon-critical-notifier] Failed:', err)
    throw err
  }
}
