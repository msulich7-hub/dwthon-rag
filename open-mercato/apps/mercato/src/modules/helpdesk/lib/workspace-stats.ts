import type { TicketListItem } from './tickets'
import { isSlaBreached } from './sla'

export type WorkspaceStats = {
  total: number
  open: number
  inProgress: number
  waiting: number
  unassigned: number
  customerChannel: number
  internalChannel: number
  urgent: number
  slaBreached: number
}

export function computeWorkspaceStats(tickets: TicketListItem[]): WorkspaceStats {
  const active = tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved')
  return {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    waiting: tickets.filter((t) => t.status === 'waiting').length,
    unassigned: active.filter((t) => !t.assigneeUserId).length,
    customerChannel: tickets.filter((t) => t.visibility === 'customer').length,
    internalChannel: tickets.filter((t) => t.visibility === 'internal').length,
    urgent: tickets.filter((t) => t.priority === 'urgent' && t.status !== 'closed').length,
    slaBreached: tickets.filter((t) => isSlaBreached(t.slaDueAt)).length,
  }
}
