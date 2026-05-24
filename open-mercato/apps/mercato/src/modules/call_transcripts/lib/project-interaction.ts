import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'

const INTERACTION_SOURCE_PREFIX = 'call_transcripts'

export async function projectCallInteraction(
  commandBus: CommandBus,
  commandContext: CommandRuntimeContext,
  scope: { tenantId: string; organizationId: string },
  input: {
    entityId: string
    dealId?: string | null
    providerKey: string
    title: string
    transcriptText: string
    occurredAt: Date
    transcriptId: string
  },
): Promise<string | null> {
  const { result } = await commandBus.execute('customers.interactions.create', {
    input: {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      entityId: input.entityId,
      dealId: input.dealId ?? undefined,
      interactionType: 'call',
      title: input.title.slice(0, 500),
      body: input.transcriptText.slice(0, 10_000),
      status: 'completed',
      occurredAt: input.occurredAt,
      source: `${INTERACTION_SOURCE_PREFIX}:${input.providerKey}:${input.transcriptId}`,
      appearanceIcon: 'phone',
    },
    ctx: commandContext,
  })

  if (result && typeof result === 'object' && 'interactionId' in result) {
    return String((result as { interactionId: string }).interactionId)
  }
  return null
}
