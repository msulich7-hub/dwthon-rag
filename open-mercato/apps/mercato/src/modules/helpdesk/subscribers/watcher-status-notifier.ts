import type { EntityManager } from '@mikro-orm/postgresql'
import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildBatchNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { HelpdeskTicketWatcher } from '../data/entities'
import { notificationTypes } from '../notifications'
import type { HelpdeskTicketStatusEventPayload } from '../lib/ticket-events'

export const metadata = {
  event: 'helpdesk.ticket.status_changed',
  persistent: true,
  id: 'helpdesk:watcher-status-notifier',
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handle(payload: HelpdeskTicketStatusEventPayload, ctx: ResolverContext) {
  try {
    const em = ctx.resolve<EntityManager>('em')?.fork()
    if (!em) return

    const rows = await em.find(HelpdeskTicketWatcher, {
      ticketId: payload.ticketId,
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
    const recipientUserIds = rows
      .map((r) => r.userId)
      .filter((id) => id !== payload.actorUserId)
    if (!recipientUserIds.length) return

    const typeDef = notificationTypes.find((t) => t.type === 'helpdesk.ticket.status_changed')
    if (!typeDef) return

    const notificationService = resolveNotificationService(ctx)
    const notificationInput = buildBatchNotificationFromType(typeDef, {
      recipientUserIds,
      bodyVariables: {
        ticketKey: payload.ticketKey,
        subject: payload.subject,
        status: payload.status,
      },
      titleVariables: { ticketKey: payload.ticketKey },
      sourceEntityType: 'helpdesk:ticket',
      sourceEntityId: payload.ticketId,
      linkHref: `/backend/helpdesk/tickets/${payload.ticketId}`,
    })

    await notificationService.createBatch(notificationInput, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
    })
  } catch (err) {
    console.error('[helpdesk:watcher-status-notifier] Failed:', err)
  }
}
