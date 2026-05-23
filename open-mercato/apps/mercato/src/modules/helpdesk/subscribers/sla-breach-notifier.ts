import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildFeatureNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { notificationTypes } from '../notifications'
import type { HelpdeskSlaBreachEventPayload } from '../lib/emit-sla-breach-events'

export const metadata = {
  event: 'helpdesk.ticket.sla_breached',
  persistent: true,
  id: 'helpdesk:sla-breach-notifier',
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(payload: HelpdeskSlaBreachEventPayload, ctx: ResolverContext) {
  try {
    const typeDef = notificationTypes.find((t) => t.type === 'helpdesk.ticket.sla_breached')
    if (!typeDef) return

    const notificationService = resolveNotificationService(ctx)
    const notificationInput = buildFeatureNotificationFromType(typeDef, {
      requiredFeature: 'helpdesk.agent',
      bodyVariables: {
        ticketKey: payload.ticketKey,
        subject: payload.subject,
        slaDueAt: payload.slaDueAt,
      },
      titleVariables: { ticketKey: payload.ticketKey },
      sourceEntityType: 'helpdesk:ticket',
      sourceEntityId: payload.ticketId,
      linkHref: `/backend/helpdesk/tickets/${payload.ticketId}`,
    })

    await notificationService.createForFeature(notificationInput, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
  } catch (err) {
    console.error('[helpdesk:sla-breach-notifier] Failed:', err)
  }
}
