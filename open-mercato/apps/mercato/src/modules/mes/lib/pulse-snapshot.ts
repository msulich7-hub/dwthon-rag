import type { EntityManager } from '@mikro-orm/postgresql'
import { listDispatchQueue } from './dispatch-queue'
import { aggregateWorkOrderDashboard } from './work-order-status'
import { listWorkOrderStatusesForDashboard } from './work-orders'

export type MesScope = { tenantId: string; organizationId: string }

export type PulseWorkCenterStat = {
  workCenterCode: string
  ready: number
  inProgress: number
}

export type PulseSnapshot = {
  dashboard: {
    total: number
    active: number
    completed: number
    byStatus: Record<string, number>
  }
  queue: {
    ready: number
    inProgress: number
    total: number
  }
  workCenters: PulseWorkCenterStat[]
  andon: 'green' | 'amber' | 'red'
  generatedAt: string
}

export async function buildPulseSnapshot(
  em: EntityManager,
  scope: MesScope,
): Promise<PulseSnapshot> {
  const statuses = await listWorkOrderStatusesForDashboard(em, scope)
  const dashboard = aggregateWorkOrderDashboard(statuses)

  const queueItems = await listDispatchQueue(em, scope, { limit: 200 })
  const ready = queueItems.filter((item) => item.operation.status === 'ready').length
  const inProgress = queueItems.filter((item) => item.operation.status === 'in_progress').length

  const centerMap = new Map<string, PulseWorkCenterStat>()
  for (const item of queueItems) {
    const code = item.operation.workCenterCode?.trim() || '__unassigned__'
    const entry = centerMap.get(code) ?? { workCenterCode: code, ready: 0, inProgress: 0 }
    if (item.operation.status === 'ready') entry.ready += 1
    if (item.operation.status === 'in_progress') entry.inProgress += 1
    centerMap.set(code, entry)
  }

  const workCenters = [...centerMap.values()].sort((a, b) =>
    a.workCenterCode.localeCompare(b.workCenterCode),
  )

  let andon: PulseSnapshot['andon'] = 'green'
  if (inProgress > 8 || ready > 15) andon = 'red'
  else if (inProgress > 3 || ready > 5 || dashboard.active > dashboard.completed) andon = 'amber'

  return {
    dashboard,
    queue: { ready, inProgress, total: queueItems.length },
    workCenters,
    andon,
    generatedAt: new Date().toISOString(),
  }
}
