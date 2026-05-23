import type { TicketDetail } from './tickets'
import { isSlaBreached } from './sla'

export type TicketSummary = {
  headline: string
  bullets: string[]
  suggestedNextSteps: string[]
  generatedAt: string
}

export function buildTicketSummary(ticket: TicketDetail): TicketSummary {
  const bullets: string[] = [
    `${ticket.ticketKey} · ${ticket.visibility} · ${ticket.priority} priority · queue ${ticket.teamQueue}`,
    `Status: ${ticket.status.replace('_', ' ')}`,
  ]

  if (ticket.reporterName || ticket.reporterEmail) {
    bullets.push(`Requester: ${ticket.reporterName ?? ticket.reporterEmail}`)
  }
  if (!ticket.assigneeUserId) {
    bullets.push('Unassigned — needs an owner')
  }
  if (isSlaBreached(ticket.slaDueAt)) {
    bullets.push('SLA breached')
  } else if (ticket.slaDueAt) {
    bullets.push(`SLA due ${new Date(ticket.slaDueAt).toLocaleString()}`)
  }

  const publicCount = ticket.comments.filter((c) => !c.isInternal).length
  const internalCount = ticket.comments.filter((c) => c.isInternal).length
  bullets.push(`${publicCount} public reply(ies), ${internalCount} internal note(s)`)

  const suggestedNextSteps: string[] = []
  if (!ticket.assigneeUserId) suggestedNextSteps.push('Assign an agent')
  if (ticket.status === 'open') suggestedNextSteps.push('Move to In progress after triage')
  if (ticket.status === 'waiting') suggestedNextSteps.push('Follow up with requester')
  if (ticket.status === 'resolved') suggestedNextSteps.push('Confirm CSAT and close')
  if (ticket.triage?.category === 'billing') {
    suggestedNextSteps.push('Check billing KB articles')
  }

  const excerpt = ticket.description.trim().slice(0, 160)
  return {
    headline: ticket.subject,
    bullets,
    suggestedNextSteps,
    generatedAt: new Date().toISOString(),
  }
}
