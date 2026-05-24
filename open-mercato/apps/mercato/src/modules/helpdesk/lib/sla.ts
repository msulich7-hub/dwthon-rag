import type { HelpdeskTicketPriority } from '../data/entities'

const SLA_HOURS: Record<HelpdeskTicketPriority, number> = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168,
}

export function computeSlaDueAt(priority: HelpdeskTicketPriority, from: Date = new Date()): Date {
  const hours = SLA_HOURS[priority] ?? SLA_HOURS.medium
  return new Date(from.getTime() + hours * 60 * 60 * 1000)
}

export function isSlaBreached(slaDueAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!slaDueAt) return false
  const due = typeof slaDueAt === 'string' ? new Date(slaDueAt) : slaDueAt
  return due.getTime() < now.getTime()
}

export function slaRemainingLabel(
  slaDueAt: Date | string | null | undefined,
  now: Date = new Date(),
): 'breached' | 'due_soon' | 'ok' | null {
  if (!slaDueAt) return null
  const due = typeof slaDueAt === 'string' ? new Date(slaDueAt) : slaDueAt
  const ms = due.getTime() - now.getTime()
  if (ms < 0) return 'breached'
  if (ms < 2 * 60 * 60 * 1000) return 'due_soon'
  return 'ok'
}
