import { createModuleQueue, type Queue } from '@open-mercato/queue'

export const PRODUCTION_PLANNING_CAPACITY_QUEUE = 'production_planning:capacity-refresh'

export type ProductionPlanningCapacityJobPayload = {
  tenantId: string
  organizationId: string
}

const GLOBAL_KEY = '__production_planning_queues__' as const

function getQueueCache(): Map<string, Queue<Record<string, unknown>>> {
  const g = globalThis as Record<string, unknown>
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, Queue<Record<string, unknown>>>()
  }
  return g[GLOBAL_KEY] as Map<string, Queue<Record<string, unknown>>>
}

export function getProductionPlanningQueue<T extends Record<string, unknown>>(
  queueName: string,
): Queue<T> {
  const queues = getQueueCache()
  const existing = queues.get(queueName)
  if (existing) return existing as Queue<T>

  const concurrency = Math.max(
    1,
    Number.parseInt(process.env.PRODUCTION_PLANNING_QUEUE_CONCURRENCY ?? '2', 10) || 2,
  )
  const created = createModuleQueue<T>(queueName, { concurrency })
  queues.set(queueName, created as Queue<Record<string, unknown>>)
  return created
}
