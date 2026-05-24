import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import { Crm2027DealMeeting, Crm2027DealRiskFlag } from '../data/entities'
import type { IngestDealMeetingBody } from '../data/validators'
import { emitCrm2027Event } from '../events'
import type { AtRiskDealItem } from './at-risk-scan'
import { loadDealContext } from './deal-context'
import { suggestDealProgression } from './deal-progression'
import { emitHighRiskDealEvents } from './emit-high-risk-events'
import { persistAtRiskFlags } from './persist-risk-flags'
import { analyzeSentimentSmart, type SentimentAnalysis } from './sentiment-analyze'
import type { DealProgressionSuggestion } from './deal-progression'
import { createMeetingInteraction, resolveEntityIdForDeal } from './meeting-interaction'

const TRANSCRIPT_EXCERPT_LEN = 240

export type MeetingSentimentPayload = SentimentAnalysis & { engine?: 'heuristic' | 'llm' }

export type MeetingProgressionPayload = Pick<
  DealProgressionSuggestion,
  'summary' | 'suggestedStageChange' | 'followUpActions' | 'riskLevel'
>

export type MeetingRiskPayload = {
  atRisk: boolean
  riskLevel: 'medium' | 'high'
  reasons: string[]
}

export type DealMeetingListItem = {
  id: string
  dealId: string
  title: string | null
  source: string | null
  transcriptExcerpt: string
  sentiment: MeetingSentimentPayload
  progression: MeetingProgressionPayload
  risk: MeetingRiskPayload | null
  interactionId: string | null
  ingestedAt: string
}

export type DealRiskSummary = {
  atRisk: boolean
  riskLevel: 'medium' | 'high'
  reasons: string[]
  lastScannedAt: string
}

export type IngestDealMeetingResult = {
  meeting: DealMeetingListItem
  risk: DealRiskSummary | null
  alerts: number
  interactionId: string | null
}

export type IngestDealMeetingOptions = {
  externalId?: string
  occurredAt?: Date
  preferLlmSentiment?: boolean
  skipInteraction?: boolean
  entityId?: string
}

function excerpt(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= TRANSCRIPT_EXCERPT_LEN) return trimmed
  return `${trimmed.slice(0, TRANSCRIPT_EXCERPT_LEN)}…`
}

export function buildAtRiskItemFromMeetingAnalysis(
  deal: { id: string; title: string },
  sentiment: SentimentAnalysis,
  progression: DealProgressionSuggestion,
): AtRiskDealItem | null {
  const reasons: string[] = []
  let riskLevel: 'medium' | 'high' | null = null

  if (sentiment.atRisk) {
    reasons.push(`negative_sentiment:${sentiment.label}`)
    riskLevel = 'high'
  }
  if (progression.riskLevel === 'high') {
    reasons.push('progression:high')
    riskLevel = 'high'
  } else if (progression.riskLevel === 'medium') {
    reasons.push('progression:medium')
    riskLevel = riskLevel ?? 'medium'
  }

  if (!riskLevel) return null

  return {
    dealId: deal.id,
    title: deal.title,
    riskLevel,
    reasons,
    daysSinceLastActivity: 0,
    sentimentLabel: sentiment.label,
  }
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function mapMeetingRecord(record: Crm2027DealMeeting): DealMeetingListItem {
  const sentiment = parseJson<MeetingSentimentPayload>(record.sentimentJson, {
    label: 'neutral',
    score: 0,
    confidence: 0,
    signals: [],
    atRisk: false,
  })
  const progression = parseJson<MeetingProgressionPayload>(record.progressionJson, {
    summary: '',
    suggestedStageChange: null,
    followUpActions: [],
    riskLevel: 'low',
  })
  const risk = record.riskJson
    ? parseJson<MeetingRiskPayload | null>(record.riskJson, null)
    : null

  return {
    id: record.id,
    dealId: record.dealId,
    title: record.title ?? null,
    source: record.source ?? null,
    transcriptExcerpt: excerpt(record.transcript),
    sentiment,
    progression,
    risk,
    interactionId: record.interactionId ?? null,
    ingestedAt: record.ingestedAt.toISOString(),
  }
}

export async function loadDealRiskSummary(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  dealId: string,
): Promise<DealRiskSummary | null> {
  const flag = await em.findOne(Crm2027DealRiskFlag, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    dealId,
  })
  if (!flag) return null

  let reasons: string[] = []
  try {
    const parsed = JSON.parse(flag.reasonsJson)
    reasons = Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    reasons = []
  }

  return {
    atRisk: true,
    riskLevel: flag.riskLevel,
    reasons,
    lastScannedAt: flag.lastScannedAt.toISOString(),
  }
}

export async function listDealMeetings(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  dealId: string,
  limit = 50,
): Promise<{ meetings: DealMeetingListItem[]; risk: DealRiskSummary | null }> {
  const records = await em.find(
    Crm2027DealMeeting,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      dealId,
    },
    { orderBy: { ingestedAt: 'DESC' }, limit },
  )

  const risk = await loadDealRiskSummary(em, scope, dealId)
  return {
    meetings: records.map(mapMeetingRecord),
    risk,
  }
}

export async function ingestDealMeeting(
  em: EntityManager,
  container: AwilixContainer,
  commandBus: CommandBus,
  commandContext: CommandRuntimeContext,
  scope: { tenantId: string; organizationId: string },
  dealId: string,
  body: IngestDealMeetingBody,
  options?: IngestDealMeetingOptions,
): Promise<IngestDealMeetingResult> {
  const context = await loadDealContext(em, scope, dealId, 5)
  if (!context.found || !context.deal) {
    throw new Error('DEAL_NOT_FOUND')
  }

  if (options?.externalId) {
    const existing = await em.findOne(Crm2027DealMeeting, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      dealId,
      source: body.source ?? 'manual',
      externalId: options.externalId,
    })
    if (existing) {
      const risk = await loadDealRiskSummary(em, scope, dealId)
      return {
        meeting: mapMeetingRecord(existing),
        risk,
        alerts: 0,
        interactionId: existing.interactionId ?? null,
      }
    }
  }

  const sentiment = await analyzeSentimentSmart(body.transcript, {
    preferLlm: options?.preferLlmSentiment ?? body.preferLlmSentiment,
  })
  const progression = suggestDealProgression({
    dealId: context.deal.id,
    title: context.deal.title,
    status: context.deal.status,
    pipelineStage: context.deal.pipelineStage,
    probability: context.deal.probability,
    daysSinceLastActivity: 0,
    recentActivitySnippets: context.recentActivitySnippets ?? [],
    sentiment,
  })

  const atRiskItem = buildAtRiskItemFromMeetingAnalysis(context.deal, sentiment, progression)
  const meetingRisk: MeetingRiskPayload | null = atRiskItem
    ? {
        atRisk: true,
        riskLevel: atRiskItem.riskLevel,
        reasons: atRiskItem.reasons,
      }
    : null

  let alerts = 0
  if (atRiskItem) {
    const { newHighRiskAlerts } = await persistAtRiskFlags(em, scope, [atRiskItem])
    await emitHighRiskDealEvents(container, scope, newHighRiskAlerts)
    alerts = newHighRiskAlerts.length
  }

  const ingestedAt = options?.occurredAt ?? new Date()
  const source = body.source ?? 'manual'
  const record = em.create(Crm2027DealMeeting, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    dealId,
    title: body.title ?? null,
    source,
    externalId: options?.externalId ?? null,
    transcript: body.transcript.trim(),
    sentimentJson: JSON.stringify(sentiment),
    progressionJson: JSON.stringify({
      summary: progression.summary,
      suggestedStageChange: progression.suggestedStageChange,
      followUpActions: progression.followUpActions,
      riskLevel: progression.riskLevel,
    }),
    riskJson: meetingRisk ? JSON.stringify(meetingRisk) : null,
    ingestedAt,
  })
  em.persist(record)

  let interactionId: string | null = null
  if (!options?.skipInteraction) {
    const entityId =
      options?.entityId ?? body.entityId ?? (await resolveEntityIdForDeal(em, dealId))
    if (entityId) {
      interactionId =
        (await createMeetingInteraction(commandBus, commandContext, scope, entityId, {
          dealId,
          title: body.title?.trim() || `Meeting (${source})`,
          body: body.transcript.trim(),
          source,
          occurredAt: ingestedAt,
        })) ?? null
      record.interactionId = interactionId
    }
  }

  await em.flush()

  const risk = await loadDealRiskSummary(em, scope, dealId)

  await emitCrm2027Event(
    'crm_2027.deal.meeting.ingested',
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      dealId,
      meetingId: record.id,
      interactionId,
      source,
      sentimentLabel: sentiment.label,
      atRisk: sentiment.atRisk,
    },
    { persistent: true },
  )

  return {
    meeting: mapMeetingRecord(record),
    risk,
    alerts,
    interactionId,
  }
}
