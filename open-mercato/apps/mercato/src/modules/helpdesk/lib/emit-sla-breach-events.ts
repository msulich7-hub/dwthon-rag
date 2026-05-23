import type { AwilixContainer } from 'awilix'
import type { SlaBreachAlert } from './sla-breach-scan'

export const HELPDESK_SLA_BREACH_EVENT = 'helpdesk.ticket.sla_breached'

export type HelpdeskSlaBreachEventPayload = {
  tenantId: string
  organizationId: string
  ticketId: string
  ticketKey: string
  subject: string
  assigneeUserId: string | null
  slaDueAt: string
}

export async function emitSlaBreachEvents(
  container: AwilixContainer | undefined,
  scope: { tenantId: string; organizationId: string },
  alerts: SlaBreachAlert[],
): Promise<void> {
  if (!alerts.length || !container) return

  let eventBus: { emitEvent: (id: string, payload: unknown, opts?: { persistent?: boolean }) => Promise<void> }
  try {
    eventBus = container.resolve('eventBus')
  } catch {
    return
  }

  for (const alert of alerts) {
    const payload: HelpdeskSlaBreachEventPayload = {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      ...alert,
    }
    await eventBus.emitEvent(HELPDESK_SLA_BREACH_EVENT, payload, { persistent: true })
  }
}
