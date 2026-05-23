import { createModuleQueue, type Queue } from '@open-mercato/queue'

export const CRM_2027_RISK_SCAN_QUEUE = 'crm_2027:risk-scan'

export type Crm2027RiskScanJobPayload = {
  tenantId: string
  organizationId: string
  stallDays?: number
}

const GLOBAL_KEY = '__crm_2027_queues__' as const

function getQueueCache(): Map<string, Queue<Record<string, unknown>>> {
  const g = globalThis as Record<string, unknown>
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, Queue<Record<string, unknown>>>()
  }
  return g[GLOBAL_KEY] as Map<string, Queue<Record<string, unknown>>>
}

export function getCrm2027Queue<T extends Record<string, unknown>>(queueName: string): Queue<T> {
  const queues = getQueueCache()
  const existing = queues.get(queueName)
  if (existing) return existing as Queue<T>

  const concurrency = Math.max(1, Number.parseInt(process.env.CRM_2027_QUEUE_CONCURRENCY ?? '2', 10) || 2)
  const created = createModuleQueue<T>(queueName, { concurrency })
  queues.set(queueName, created as Queue<Record<string, unknown>>)
  return created
}
