import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildFeatureNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { notificationTypes } from '../notifications'
import type { Crm2027HighRiskEventPayload } from '../lib/emit-high-risk-events'

export const metadata = {
  event: 'crm_2027.deal.high_risk',
  persistent: true,
  id: 'crm_2027:high-risk-deal-notifier',
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(payload: Crm2027HighRiskEventPayload, ctx: ResolverContext) {
  try {
    const notificationService = resolveNotificationService(ctx)
    const typeDef = notificationTypes.find((t) => t.type === 'crm_2027.deal.high_risk')
    if (!typeDef) return

    const notificationInput = buildFeatureNotificationFromType(typeDef, {
      requiredFeature: 'crm_2027.view',
      bodyVariables: {
        dealTitle: payload.dealTitle,
      },
      sourceEntityType: 'customers:deal',
      sourceEntityId: payload.dealId,
      linkHref: `/backend/customers/deals/${payload.dealId}`,
    })

    await notificationService.createForFeature(notificationInput, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
  } catch (err) {
    console.error('[crm_2027:high-risk-deal-notifier] Failed:', err)
    throw err
  }
}
