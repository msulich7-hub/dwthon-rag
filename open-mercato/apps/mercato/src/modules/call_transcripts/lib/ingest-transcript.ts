import { randomUUID } from 'node:crypto'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import {
  CallTranscript,
  CallTranscriptParticipant,
  CallTranscriptUnmatched,
} from '../data/entities'
import type { CallTranscriptIngestInput } from '../data/validators'
import { emitCallTranscriptsEvent } from '../events'
import { matchParticipants, pickPrimaryEntityId } from './match-participants'
import { projectCallInteraction } from './project-interaction'

export type IngestTranscriptResult = {
  status: 'created' | 'duplicate'
  transcriptId: string
  projectionStatus: 'projected' | 'unmatched'
  interactionId: string | null
  dealId: string | null
}

export async function ingestTranscript(
  em: EntityManager,
  container: AwilixContainer,
  commandBus: CommandBus,
  commandContext: CommandRuntimeContext,
  input: CallTranscriptIngestInput,
): Promise<IngestTranscriptResult> {
  const { tenantId, organizationId, providerKey } = input
  const transcript = input.transcript
  const externalRecordingId = transcript.externalRecordingId
  const dealId = transcript.dealId ?? null

  const existing = await em.findOne(CallTranscript, {
    tenantId,
    providerKey,
    externalRecordingId,
  })

  if (existing) {
    return {
      status: 'duplicate',
      transcriptId: existing.id,
      projectionStatus:
        existing.projectionStatus === 'projected' ? 'projected' : 'unmatched',
      interactionId: existing.interactionId ?? null,
      dealId: existing.dealId ?? null,
    }
  }

  const matches = await matchParticipants(em, { tenantId, organizationId }, transcript.participants)
  const primaryEntityId = pickPrimaryEntityId(matches, dealId)

  const record = em.create(CallTranscript, {
    id: randomUUID(),
    tenantId,
    organizationId,
    providerKey,
    externalRecordingId,
    sourceMeetingUrl: transcript.sourceMeetingUrl ?? null,
    occurredAt: transcript.occurredAt,
    durationSec: transcript.durationSec ?? null,
    language: transcript.language ?? null,
    title: transcript.title ?? null,
    text: transcript.text,
    segmentsJson: transcript.segments ? JSON.stringify(transcript.segments) : null,
    providerMetadataJson: transcript.providerMetadata
      ? JSON.stringify(transcript.providerMetadata)
      : null,
    projectionStatus: 'pending',
    dealId,
  })
  em.persist(record)

  for (const match of matches) {
    em.persist(
      em.create(CallTranscriptParticipant, {
        tenantId,
        organizationId,
        callTranscriptId: record.id,
        email: match.email ?? null,
        phone: match.phone ?? null,
        displayName: match.displayName ?? null,
        role: match.role ?? null,
        customerEntityId: match.customerEntityId,
        matchedVia: match.matchedVia,
      }),
    )
  }

  let interactionId: string | null = null
  let projectionStatus: 'projected' | 'unmatched' = 'unmatched'

  if (primaryEntityId) {
    interactionId = await projectCallInteraction(commandBus, commandContext, { tenantId, organizationId }, {
      entityId: primaryEntityId,
      dealId,
      providerKey,
      title: transcript.title ?? `${providerKey} call`,
      transcriptText: transcript.text,
      occurredAt: transcript.occurredAt,
      transcriptId: record.id,
    })

    if (interactionId) {
      record.projectionStatus = 'projected'
      record.interactionId = interactionId
      record.primaryEntityId = primaryEntityId
      projectionStatus = 'projected'
    } else {
      record.projectionStatus = 'projection_failed'
    }
  } else {
    record.projectionStatus = 'unmatched'
    em.persist(
      em.create(CallTranscriptUnmatched, {
        tenantId,
        organizationId,
        callTranscriptId: record.id,
        participantsSummaryJson: JSON.stringify(
          matches.map((m) => ({
            email: m.email,
            displayName: m.displayName,
            customerEntityId: m.customerEntityId,
          })),
        ),
      }),
    )
  }

  await em.flush()

  const eventBase = {
    tenantId,
    organizationId,
    transcriptId: record.id,
    providerKey,
    projectionStatus,
    interactionId,
    dealId,
    primaryEntityId,
    externalRecordingId,
    title: record.title,
    text: record.text,
  }

  await emitCallTranscriptsEvent('call_transcripts.transcript.ingested', eventBase, {
    persistent: true,
  })

  if (projectionStatus === 'unmatched') {
    await emitCallTranscriptsEvent('call_transcripts.transcript.unmatched', eventBase, {
      persistent: true,
    })
  } else {
    await emitCallTranscriptsEvent('call_transcripts.transcript.matched', eventBase, {
      persistent: true,
    })
  }

  return {
    status: 'created',
    transcriptId: record.id,
    projectionStatus,
    interactionId,
    dealId,
  }
}
