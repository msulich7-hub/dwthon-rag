import type { HelpdeskTicketStatus } from '../data/entities'
import type { TicketListItem } from './tickets'

export type KanbanColumnDef = {
  status: HelpdeskTicketStatus
  labelKey: string
  accentClass: string
  headerClass: string
}

/** Active workflow columns (Jira-style board). */
export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    status: 'open',
    labelKey: 'helpdesk.status.open',
    accentClass: 'bg-sky-500',
    headerClass: 'border-sky-500/30 bg-sky-500/5',
  },
  {
    status: 'in_progress',
    labelKey: 'helpdesk.status.in_progress',
    accentClass: 'bg-violet-500',
    headerClass: 'border-violet-500/30 bg-violet-500/5',
  },
  {
    status: 'waiting',
    labelKey: 'helpdesk.status.waiting',
    accentClass: 'bg-amber-500',
    headerClass: 'border-amber-500/30 bg-amber-500/5',
  },
  {
    status: 'resolved',
    labelKey: 'helpdesk.status.resolved',
    accentClass: 'bg-emerald-500',
    headerClass: 'border-emerald-500/30 bg-emerald-500/5',
  },
]

export const KANBAN_DONE_COLUMN: KanbanColumnDef = {
  status: 'closed',
  labelKey: 'helpdesk.status.closed',
  accentClass: 'bg-muted-foreground',
  headerClass: 'border-muted bg-muted/30',
}

export function groupTicketsByStatus(
  tickets: TicketListItem[],
  includeClosed: boolean,
): Map<HelpdeskTicketStatus, TicketListItem[]> {
  const columns = includeClosed ? [...KANBAN_COLUMNS, KANBAN_DONE_COLUMN] : KANBAN_COLUMNS
  const map = new Map<HelpdeskTicketStatus, TicketListItem[]>()
  for (const col of columns) {
    map.set(col.status, [])
  }
  for (const ticket of tickets) {
    const bucket = map.get(ticket.status)
    if (bucket) bucket.push(ticket)
    else if (includeClosed && ticket.status === 'closed') {
      map.get('closed')!.push(ticket)
    } else if (ticket.status === 'closed') {
      continue
    } else {
      map.get('open')!.push(ticket)
    }
  }
  for (const [, list] of map) {
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  return map
}
