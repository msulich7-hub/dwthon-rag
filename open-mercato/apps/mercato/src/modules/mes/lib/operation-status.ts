import type { MesWorkOrderOperationStatus } from '../data/entities'

const TRANSITIONS: Record<MesWorkOrderOperationStatus, MesWorkOrderOperationStatus[]> = {
  pending: ['ready', 'cancelled'],
  ready: ['in_progress', 'skipped', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  skipped: [],
  cancelled: [],
}

export function canTransitionOperationStatus(
  from: MesWorkOrderOperationStatus,
  to: MesWorkOrderOperationStatus,
): boolean {
  if (from === to) return true
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function isOperationQtyComplete(
  plannedQty: number,
  completedQty: number,
  scrapQty: number,
): boolean {
  return completedQty + scrapQty >= plannedQty
}
