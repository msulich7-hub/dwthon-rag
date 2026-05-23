import type { HelpdeskTicketPriority } from '../data/entities'
import { slaRemainingLabel } from '../lib/sla'

export function priorityStyles(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'border-l-4 border-l-destructive bg-destructive/5'
    case 'high':
      return 'border-l-4 border-l-amber-500 bg-amber-500/5'
    case 'low':
      return 'border-l-4 border-l-muted-foreground/40'
    default:
      return 'border-l-4 border-l-primary/50'
  }
}

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-destructive/15 text-destructive border-destructive/30'
    case 'high':
      return 'bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30'
    case 'low':
      return 'bg-muted text-muted-foreground border-muted'
    default:
      return 'bg-primary/10 text-primary border-primary/20'
  }
}

export function visibilityBadgeClass(visibility: string): string {
  return visibility === 'customer'
    ? 'bg-sky-500/10 text-sky-800 dark:text-sky-200 border-sky-500/25'
    : 'bg-violet-500/10 text-violet-800 dark:text-violet-200 border-violet-500/25'
}

export function slaBadgeClass(slaDueAt: string | null | undefined): string | null {
  const state = slaRemainingLabel(slaDueAt)
  if (!state) return null
  if (state === 'breached') return 'bg-destructive/15 text-destructive border-destructive/40'
  if (state === 'due_soon') return 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40'
  return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30'
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export type BoardTicket = {
  id: string
  ticketKey: string
  subject: string
  status: string
  priority: HelpdeskTicketPriority | string
  visibility: string
  teamQueue: string
  assigneeUserId: string | null
  slaDueAt: string | null
  updatedAt: string
  reporterName?: string | null
}
