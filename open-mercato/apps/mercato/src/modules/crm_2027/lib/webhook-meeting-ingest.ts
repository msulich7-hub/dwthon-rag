import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import type { IngestDealMeetingBody } from '../data/validators'
import { ingestDealMeeting } from './ingest-deal-meeting'

export type ProviderWebhookPayload = {
  dealId: string
  transcript: string
  title?: string
  externalId?: string
  occurredAt?: string
}

export async function ingestProviderMeeting(
  em: EntityManager,
  container: AwilixContainer,
  commandBus: CommandBus,
  commandContext: CommandRuntimeContext,
  scope: { tenantId: string; organizationId: string },
  provider: 'zoom' | 'gong',
  payload: ProviderWebhookPayload,
) {
  const body: IngestDealMeetingBody = {
    transcript: payload.transcript,
    title: payload.title,
    source: provider,
  }

  return ingestDealMeeting(
    em,
    container,
    commandBus,
    commandContext,
    scope,
    payload.dealId,
    body,
    {
      externalId: payload.externalId,
      occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : undefined,
      preferLlmSentiment: true,
    },
  )
}
