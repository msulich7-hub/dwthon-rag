import type { EntityManager } from '@mikro-orm/postgresql'
import { HelpdeskTicketCounter } from '../data/entities'

export async function allocateTicketKey(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<string> {
  let counter = await em.findOne(HelpdeskTicketCounter, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })

  if (!counter) {
    counter = em.create(HelpdeskTicketCounter, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      nextNumber: 1,
    })
    em.persist(counter)
  }

  const number = counter.nextNumber
  counter.nextNumber = number + 1
  await em.flush()

  return `HD-${String(number).padStart(4, '0')}`
}
