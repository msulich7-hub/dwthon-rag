import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { notificationTypes } from '../notifications'
import type { HelpdeskTicketAssignedEventPayload } from '../lib/ticket-events'

export const metadata = {
  event: 'helpdesk.ticket.assigned',
  persistent: true,
  id: 'helpdesk:assignee-ticket-notifier',
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(payload: HelpdeskTicketAssignedEventPayload, ctx: ResolverContext) {
  if (!payload.assigneeUserId) return
  if (payload.actorUserId && payload.actorUserId === payload.assigneeUserId) return

  try {
    const typeDef = notificationTypes.find((t) => t.type === 'helpdesk.ticket.assigned')
    if (!typeDef) return

    const notificationService = resolveNotificationService(ctx)
    const notificationInput = buildNotificationFromType(typeDef, {
      recipientUserId: payload.assigneeUserId,
      bodyVariables: {
        ticketKey: payload.ticketKey,
        subject: payload.subject,
      },
      titleVariables: { ticketKey: payload.ticketKey },
      sourceEntityType: 'helpdesk:ticket',
      sourceEntityId: payload.ticketId,
      linkHref: `/backend/helpdesk/tickets/${payload.ticketId}`,
    })

    await notificationService.create(notificationInput, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
  } catch (err) {
    console.error('[helpdesk:assignee-ticket-notifier] Failed:', err)
  }
}
