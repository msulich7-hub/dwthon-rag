import type { AwilixContainer } from 'awilix'

export const HELPDESK_TICKET_COMMENT_EVENT = 'helpdesk.ticket.comment'
export const HELPDESK_TICKET_ASSIGNED_EVENT = 'helpdesk.ticket.assigned'
export const HELPDESK_TICKET_STATUS_EVENT = 'helpdesk.ticket.status_changed'

export type HelpdeskTicketCommentEventPayload = {
  tenantId: string
  organizationId: string
  ticketId: string
  ticketKey: string
  subject: string
  actorUserId: string | null
  isInternal: boolean
  commentPreview: string
}

export type HelpdeskTicketAssignedEventPayload = {
  tenantId: string
  organizationId: string
  ticketId: string
  ticketKey: string
  subject: string
  actorUserId: string | null
  assigneeUserId: string
}

export type HelpdeskTicketStatusEventPayload = {
  tenantId: string
  organizationId: string
  ticketId: string
  ticketKey: string
  subject: string
  actorUserId: string | null
  status: string
}

export async function emitHelpdeskTicketEvent(
  container: AwilixContainer | undefined,
  eventId: string,
  payload: unknown,
): Promise<void> {
  if (!container) return
  try {
    const eventBus = container.resolve<{ emitEvent: (id: string, payload: unknown, opts?: { persistent?: boolean }) => Promise<void> }>('eventBus')
    await eventBus.emitEvent(eventId, payload, { persistent: true })
  } catch {
    // event bus optional in tests
  }
}
