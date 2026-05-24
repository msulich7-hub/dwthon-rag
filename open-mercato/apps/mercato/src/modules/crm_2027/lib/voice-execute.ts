import type { EntityManager } from '@mikro-orm/postgresql'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import {
  CustomerDeal,
  CustomerDealPersonLink,
  CustomerEntity,
} from '@open-mercato/core/modules/customers/data/entities'
import { CUSTOMER_INTERACTION_TASK_SOURCE } from '@open-mercato/core/modules/customers/lib/interactionCompatibility'
import { parseVoiceIntent, type VoiceIntentResult } from './voice-intent'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'

export const CRM_2027_VOICE_SOURCE = 'crm_2027:voice'

export type VoiceExecuteInput = {
  transcript: string
  dealId?: string
  entityId?: string
}

export type VoiceExecuteResult = {
  intent: VoiceIntentResult
  executed: boolean
  resourceType?: 'interaction' | 'suggestion'
  resourceId?: string
  message: string
}

async function resolveEntityId(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  input: VoiceExecuteInput,
  intent: VoiceIntentResult,
): Promise<string | null> {
  if (input.entityId) return input.entityId

  const contactName = intent.parameters.contactName?.trim()
  if (contactName) {
    const people = await findWithDecryption(em, CustomerEntity, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      kind: 'person',
      deletedAt: null,
    })
    const match = people.find((p) =>
      p.displayName.toLowerCase().includes(contactName.toLowerCase()),
    )
    if (match) return match.id
  }

  if (input.dealId) {
    const links = await em.find(
      CustomerDealPersonLink,
      { deal: input.dealId },
      { populate: ['person'] },
    )
    const first = links[0]
    if (first?.person) {
      return typeof first.person === 'string' ? first.person : first.person.id
    }
  }

  return null
}

export async function executeVoiceIntent(
  em: EntityManager,
  commandBus: CommandBus,
  commandContext: CommandRuntimeContext,
  scope: { tenantId: string; organizationId: string },
  input: VoiceExecuteInput,
): Promise<VoiceExecuteResult> {
  const intent = parseVoiceIntent(input.transcript)

  if (intent.intent === 'unknown') {
    return {
      intent,
      executed: false,
      message: 'Could not map transcript to a supported voice intent.',
    }
  }

  if (intent.intent === 'update_deal') {
    return {
      intent,
      executed: false,
      resourceType: 'suggestion',
      message:
        'Deal updates require CRM 2027 copilot approval. Open the deal and ask the copilot to suggest stage changes.',
    }
  }

  if (intent.intent === 'search_contact') {
    return {
      intent,
      executed: false,
      message: 'Use Customers search or ask CRM 2027 copilot to find contacts.',
    }
  }

  const entityId = await resolveEntityId(em, scope, input, intent)
  if (!entityId) {
    return {
      intent,
      executed: false,
      message: 'Provide entityId or a recognizable contact name linked to a deal.',
    }
  }

  if (intent.intent === 'create_task' || intent.intent === 'log_note') {
    const title =
      intent.intent === 'create_task'
        ? intent.parameters.title?.slice(0, 200) ?? 'Voice task'
        : 'Voice note'

    const body =
      intent.intent === 'log_note'
        ? intent.parameters.body ?? input.transcript
        : input.transcript

    const { result } = await commandBus.execute('customers.interactions.create', {
      input: {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        entityId,
        dealId: input.dealId ?? null,
        interactionType: intent.intent === 'create_task' ? 'task' : 'note',
        title,
        body,
        status: 'planned',
        source: CRM_2027_VOICE_SOURCE,
      },
      ctx: commandContext,
    })

    const interactionId =
      result && typeof result === 'object' && 'interactionId' in result
        ? String((result as { interactionId: string }).interactionId)
        : undefined

    return {
      intent,
      executed: true,
      resourceType: 'interaction',
      resourceId: interactionId,
      message:
        intent.intent === 'create_task'
          ? 'Task interaction created from voice command.'
          : 'Note interaction created from voice command.',
    }
  }

  return { intent, executed: false, message: 'Unsupported intent.' }
}

export async function assertDealInScope(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  dealId: string,
): Promise<boolean> {
  const deals = await findWithDecryption(em, CustomerDeal, {
    id: dealId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    deletedAt: null,
  })
  return deals.length > 0
}
