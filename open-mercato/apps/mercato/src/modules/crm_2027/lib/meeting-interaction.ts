import type { EntityManager } from '@mikro-orm/postgresql'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import {
  CustomerDealPersonLink,
} from '@open-mercato/core/modules/customers/data/entities'
import { CRM_2027_MEETING_SOURCE } from './constants'

export async function resolveEntityIdForDeal(
  em: EntityManager,
  dealId: string,
): Promise<string | null> {
  const links = await em.find(
    CustomerDealPersonLink,
    { deal: dealId },
    { populate: ['person'], limit: 1 },
  )
  const first = links[0]
  if (!first?.person) return null
  return typeof first.person === 'string' ? first.person : first.person.id
}

export type CreateMeetingInteractionInput = {
  dealId: string
  title: string
  body: string
  source: string
  occurredAt?: Date
}

export async function createMeetingInteraction(
  commandBus: CommandBus,
  commandContext: CommandRuntimeContext,
  scope: { tenantId: string; organizationId: string },
  entityId: string,
  input: CreateMeetingInteractionInput,
): Promise<string | undefined> {
  const { result } = await commandBus.execute('customers.interactions.create', {
    input: {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      entityId,
      dealId: input.dealId,
      interactionType: 'meeting',
      title: input.title.slice(0, 500),
      body: input.body.slice(0, 10_000),
      status: 'completed',
      occurredAt: input.occurredAt ?? new Date(),
      source: `${CRM_2027_MEETING_SOURCE}:${input.source}`,
      appearanceIcon: 'video',
    },
    ctx: commandContext,
  })

  if (result && typeof result === 'object' && 'interactionId' in result) {
    return String((result as { interactionId: string }).interactionId)
  }
  return undefined
}
