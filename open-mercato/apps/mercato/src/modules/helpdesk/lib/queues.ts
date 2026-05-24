import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskTicket } from '../data/entities'
import type { helpdeskAgentQueueSchema } from '../data/validators'
import type { z } from 'zod'

export type AgentQueueId = z.infer<typeof helpdeskAgentQueueSchema>

export type AgentQueueDefinition = {
  id: AgentQueueId
  labelKey: string
  descriptionKey: string
}

export const AGENT_QUEUES: AgentQueueDefinition[] = [
  { id: 'all', labelKey: 'helpdesk.queues.all', descriptionKey: 'helpdesk.queues.allDesc' },
  { id: 'my_work', labelKey: 'helpdesk.queues.myWork', descriptionKey: 'helpdesk.queues.myWorkDesc' },
  { id: 'unassigned', labelKey: 'helpdesk.queues.unassigned', descriptionKey: 'helpdesk.queues.unassignedDesc' },
  { id: 'internal', labelKey: 'helpdesk.queues.internal', descriptionKey: 'helpdesk.queues.internalDesc' },
  {
    id: 'customer_requests',
    labelKey: 'helpdesk.queues.customerRequests',
    descriptionKey: 'helpdesk.queues.customerRequestsDesc',
  },
  { id: 'it', labelKey: 'helpdesk.queues.it', descriptionKey: 'helpdesk.queues.itDesc' },
  { id: 'ops', labelKey: 'helpdesk.queues.ops', descriptionKey: 'helpdesk.queues.opsDesc' },
  { id: 'billing', labelKey: 'helpdesk.queues.billing', descriptionKey: 'helpdesk.queues.billingDesc' },
]

export type AgentQueueCounts = Record<AgentQueueId, number>

function baseWhere(scope: { tenantId: string; organizationId: string }) {
  return {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
}

export function buildQueueFilter(
  queue: AgentQueueId,
  scope: { tenantId: string; organizationId: string },
  currentUserId: string | null,
): Record<string, unknown> {
  const where: Record<string, unknown> = { ...baseWhere(scope) }

  switch (queue) {
    case 'my_work':
      if (currentUserId) where.assigneeUserId = currentUserId
      break
    case 'unassigned':
      where.assigneeUserId = null
      where.status = { $in: ['open', 'in_progress', 'waiting'] }
      break
    case 'internal':
      where.visibility = 'internal'
      break
    case 'customer_requests':
      where.visibility = 'customer'
      break
    case 'it':
      where.teamQueue = 'it'
      break
    case 'ops':
      where.teamQueue = 'ops'
      break
    case 'billing':
      where.teamQueue = 'billing'
      break
    case 'all':
    default:
      break
  }

  return where
}

export async function countAgentQueues(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  currentUserId: string | null,
): Promise<AgentQueueCounts> {
  const counts = {} as AgentQueueCounts

  for (const queue of AGENT_QUEUES) {
    const where = buildQueueFilter(queue, scope, currentUserId)
    if (queue === 'my_work' && !currentUserId) {
      counts[queue.id] = 0
      continue
    }
    counts[queue.id] = await em.count(HelpdeskTicket, where)
  }

  return counts
}
