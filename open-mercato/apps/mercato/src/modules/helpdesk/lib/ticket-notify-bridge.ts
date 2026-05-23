import type { AwilixContainer } from 'awilix'
import type { TicketDetail } from './tickets'
import {
  emitHelpdeskTicketEvent,
  HELPDESK_TICKET_ASSIGNED_EVENT,
  HELPDESK_TICKET_COMMENT_EVENT,
  HELPDESK_TICKET_STATUS_EVENT,
} from './ticket-events'
import { notifyReporterOnPublicReply } from './customer-notify'

type HelpdeskScope = { tenantId: string; organizationId: string }

export async function notifyAfterTicketComment(
  container: AwilixContainer | undefined,
  scope: HelpdeskScope,
  ticket: TicketDetail,
  opts: {
    actorUserId: string | null
    isInternal: boolean
    body: string
    portalUrl?: string | null
  },
): Promise<void> {
  await emitHelpdeskTicketEvent(container, HELPDESK_TICKET_COMMENT_EVENT, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    ticketId: ticket.id,
    ticketKey: ticket.ticketKey,
    subject: ticket.subject,
    actorUserId: opts.actorUserId,
    isInternal: opts.isInternal,
    commentPreview: opts.body,
  })

  if (!opts.isInternal) {
    await notifyReporterOnPublicReply(ticket, opts.body, opts.portalUrl)
  }
}

export async function notifyAfterTicketAssigned(
  container: AwilixContainer | undefined,
  scope: HelpdeskScope,
  ticket: TicketDetail,
  actorUserId: string | null,
  assigneeUserId: string,
): Promise<void> {
  if (!assigneeUserId) return
  await emitHelpdeskTicketEvent(container, HELPDESK_TICKET_ASSIGNED_EVENT, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    ticketId: ticket.id,
    ticketKey: ticket.ticketKey,
    subject: ticket.subject,
    actorUserId,
    assigneeUserId,
  })
}

export async function notifyAfterStatusChange(
  container: AwilixContainer | undefined,
  scope: HelpdeskScope,
  ticket: TicketDetail,
  actorUserId: string | null,
  status: string,
): Promise<void> {
  await emitHelpdeskTicketEvent(container, HELPDESK_TICKET_STATUS_EVENT, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    ticketId: ticket.id,
    ticketKey: ticket.ticketKey,
    subject: ticket.subject,
    actorUserId,
    status,
  })
}
