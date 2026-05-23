import type { MesWorkOrderStatus } from '../data/entities'

const TRANSITIONS: Record<MesWorkOrderStatus, MesWorkOrderStatus[]> = {
  draft: ['planned', 'cancelled'],
  planned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function canTransitionWorkOrderStatus(
  from: MesWorkOrderStatus,
  to: MesWorkOrderStatus,
): boolean {
  if (from === to) return true
  return TRANSITIONS[from]?.includes(to) ?? false
}

export type WorkOrderStatusCounts = Record<MesWorkOrderStatus, number>

export function aggregateWorkOrderDashboard(
  statuses: MesWorkOrderStatus[],
): {
  total: number
  byStatus: WorkOrderStatusCounts
  active: number
  completed: number
} {
  const byStatus: WorkOrderStatusCounts = {
    draft: 0,
    planned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  }

  for (const status of statuses) {
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }

  return {
    total: statuses.length,
    byStatus,
    active: byStatus.planned + byStatus.in_progress,
    completed: byStatus.completed,
  }
}
