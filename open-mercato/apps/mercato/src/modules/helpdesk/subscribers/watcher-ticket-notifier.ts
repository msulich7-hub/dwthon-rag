import type { EntityManager } from '@mikro-orm/postgresql'
import { resolveNotificationService } from '@open-mercato/core/modules/notifications/lib/notificationService'
import { buildBatchNotificationFromType } from '@open-mercato/core/modules/notifications/lib/notificationBuilder'
import { HelpdeskTicketWatcher } from '../data/entities'
import { notificationTypes } from '../notifications'
import type { HelpdeskTicketCommentEventPayload } from '../lib/ticket-events'

export const metadata = {
  event: 'helpdesk.ticket.comment',
  persistent: true,
  id: 'helpdesk:watcher-comment-notifier',
}

type ResolverContext = {
  resolve: <T = unknown>(name: string) => T
}

async function watcherUserIds(
  em: EntityManager,
  payload: { tenantId: string; organizationId: string; ticketId: string; actorUserId: string | null },
): Promise<string[]> {
  const rows = await em.find(HelpdeskTicketWatcher, {
    ticketId: payload.ticketId,
    tenantId: payload.tenantId,
    organizationId: payload.organizationId,
  })
  const ids = rows.map((r) => r.userId)
  if (payload.actorUserId) {
    return ids.filter((id) => id !== payload.actorUserId)
  }
  return ids
}

export default async function handle(payload: HelpdeskTicketCommentEventPayload, ctx: ResolverContext) {
  try {
    const em = ctx.resolve<EntityManager>('em')?.fork()
    if (!em) return

    const recipientUserIds = await watcherUserIds(em, payload)
    if (!recipientUserIds.length) return

    const typeDef = notificationTypes.find((t) => t.type === 'helpdesk.ticket.comment')
    if (!typeDef) return

    const bodyVariables = {
      ticketKey: payload.ticketKey,
      subject: payload.subject,
      preview: payload.commentPreview.slice(0, 120),
      internal: payload.isInternal ? ' (internal)' : '',
    }

    const notificationService = resolveNotificationService(ctx)
    const notificationInput = buildBatchNotificationFromType(typeDef, {
      recipientUserIds,
      bodyVariables,
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
    console.error('[helpdesk:watcher-ticket-notifier] Failed:', err)
  }
}
