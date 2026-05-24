import type { EntityManager } from '@mikro-orm/postgresql'
import { MesWorkOrder } from '../data/entities'

export type MesScope = { tenantId: string; organizationId: string }

export type PulseTrendPoint = {
  date: string
  completed: number
  created: number
  activeEndOfDay: number
}

export async function buildWorkOrderActivityTrend(
  em: EntityManager,
  scope: MesScope,
  days = 14,
): Promise<PulseTrendPoint[]> {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  start.setUTCHours(0, 0, 0, 0)

  const orders = await em.find(MesWorkOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    updatedAt: { $gte: start },
  })

  const buckets = new Map<string, PulseTrendPoint>()

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, completed: 0, created: 0, activeEndOfDay: 0 })
  }

  for (const order of orders) {
    const createdKey = order.createdAt.toISOString().slice(0, 10)
    const updatedKey = order.updatedAt.toISOString().slice(0, 10)
    const createdBucket = buckets.get(createdKey)
    if (createdBucket) createdBucket.created += 1
    if (order.status === 'completed') {
      const completedBucket = buckets.get(updatedKey)
      if (completedBucket) completedBucket.completed += 1
    }
    if (['planned', 'in_progress'].includes(order.status)) {
      const activeBucket = buckets.get(updatedKey)
      if (activeBucket) activeBucket.activeEndOfDay += 1
    }
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date))
}
