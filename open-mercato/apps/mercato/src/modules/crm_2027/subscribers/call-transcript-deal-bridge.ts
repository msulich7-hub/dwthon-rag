import type { EntityManager } from '@mikro-orm/postgresql'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { ingestDealMeeting } from '../lib/ingest-deal-meeting'

export const metadata = {
  event: 'call_transcripts.transcript.ingested',
  persistent: true,
  id: 'crm_2027:call-transcript-deal-bridge',
}

type TranscriptEventPayload = {
  tenantId: string
  organizationId: string
  transcriptId: string
  providerKey: string
  dealId?: string | null
  interactionId?: string | null
  text?: string
  title?: string | null
  externalRecordingId?: string
}

export default async function handle(payload: TranscriptEventPayload) {
  const dealId = payload.dealId?.trim()
  if (!dealId || !payload.text?.trim()) return

  const container = await createRequestContainer()
  const em = (container.resolve('em') as EntityManager).fork()
  const commandBus = container.resolve('commandBus') as CommandBus

  const commandContext: CommandRuntimeContext = {
    container,
    auth: {
      tenantId: payload.tenantId,
      orgId: payload.organizationId,
    },
    organizationScope: null,
    selectedOrganizationId: payload.organizationId,
    organizationIds: [payload.organizationId],
  }

  const source =
    payload.providerKey === 'gong'
      ? 'gong'
      : payload.providerKey === 'zoom'
        ? 'zoom'
        : 'manual'

  try {
    await ingestDealMeeting(
      em,
      container,
      commandBus,
      commandContext,
      { tenantId: payload.tenantId, organizationId: payload.organizationId },
      dealId,
      {
        transcript: payload.text,
        title: payload.title ?? undefined,
        source,
      },
      {
        externalId: payload.externalRecordingId ?? payload.transcriptId,
        preferLlmSentiment: true,
        skipInteraction: Boolean(payload.interactionId),
      },
    )
  } catch (err) {
    if (err instanceof Error && err.message === 'DEAL_NOT_FOUND') {
      console.warn('[crm_2027:call-transcript-deal-bridge] Deal not found:', dealId)
      return
    }
    console.error('[crm_2027:call-transcript-deal-bridge] Failed:', err)
    throw err
  }
}
