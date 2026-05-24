import { createModuleQueue, type Queue } from '@open-mercato/queue'

export const PRODUCTION_PLANNING_CAPACITY_QUEUE = 'production_planning:capacity-refresh'
export const PRODUCTION_PLANNING_CPSAT_OPTIMIZE_QUEUE = 'production_planning:cpsat-optimize'

export type ProductionPlanningCapacityJobPayload = {
  tenantId: string
  organizationId: string
}

/** Enqueued by POST /api/production_planning/optimize when mode is async or auto exceeds threshold. */
export type CpsatOptimizeJobPayload = {
  /** Stable optimize job id returned to the API client (also PK in optimize_jobs when persisted). */
  jobId: string
  tenantId: string
  organizationId: string
  productionOrderIds: string[]
  horizonHours?: number
  objective?: 'minimize_lateness' | 'minimize_changeover' | 'balance_load'
  applySync?: boolean
  dryRun?: boolean
  chunkSize?: number
  requestedByUserId?: string | null
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
