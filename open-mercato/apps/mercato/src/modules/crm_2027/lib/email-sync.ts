import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import { CustomerInteraction } from '@open-mercato/core/modules/customers/data/entities'
import { analyzeSentimentSmart } from './sentiment-analyze'
import { buildAtRiskItemFromMeetingAnalysis } from './ingest-deal-meeting'
import { suggestDealProgression } from './deal-progression'
import { loadDealContext } from './deal-context'
import { persistAtRiskFlags } from './persist-risk-flags'
import { emitHighRiskDealEvents } from './emit-high-risk-events'
import { CRM_2027_EMAIL_SYNC_SOURCE } from './constants'
import { emitCrm2027Event } from '../events'

export type EmailSyncOptions = {
  days?: number
  limit?: number
}

export type EmailSyncResult = {
  scanned: number
  analyzed: number
  flagged: number
  alerts: number
}

export async function syncEmailInteractions(
  em: EntityManager,
  container: AwilixContainer,
  scope: { tenantId: string; organizationId: string },
  options?: EmailSyncOptions,
): Promise<EmailSyncResult> {
  const days = options?.days ?? 14
  const limit = options?.limit ?? 50
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const emails = await em.find(
    CustomerInteraction,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      interactionType: 'email',
      deletedAt: null,
      $or: [{ occurredAt: { $gte: since } }, { createdAt: { $gte: since } }],
    },
    { orderBy: { occurredAt: 'DESC', createdAt: 'DESC' }, limit },
  )

  const atRiskItems: Parameters<typeof persistAtRiskFlags>[2] = []
  let analyzed = 0

  for (const email of emails) {
    const text = [email.title, email.body].filter(Boolean).join('\n')
    if (!text.trim()) continue

    analyzed += 1
    const sentiment = await analyzeSentimentSmart(text, { preferLlm: false })
    if (!sentiment.atRisk || !email.dealId) continue

    const context = await loadDealContext(em, scope, email.dealId, 3)
    if (!context.found || !context.deal) continue

    const progression = suggestDealProgression({
      dealId: context.deal.id,
      title: context.deal.title,
      status: context.deal.status,
      pipelineStage: context.deal.pipelineStage,
      probability: context.deal.probability,
      daysSinceLastActivity: context.daysSinceLastActivity ?? null,
      recentActivitySnippets: context.recentActivitySnippets ?? [],
      sentiment,
    })

    const item = buildAtRiskItemFromMeetingAnalysis(context.deal, sentiment, progression)
    if (item) {
      item.reasons.push(`${CRM_2027_EMAIL_SYNC_SOURCE}:email`)
      atRiskItems.push(item)
    }
  }

  const uniqueByDeal = new Map<string, (typeof atRiskItems)[number]>()
  for (const item of atRiskItems) {
    const existing = uniqueByDeal.get(item.dealId)
    if (!existing || item.riskLevel === 'high') {
      uniqueByDeal.set(item.dealId, item)
    }
  }

  const items = [...uniqueByDeal.values()]
  const { newHighRiskAlerts } = await persistAtRiskFlags(em, scope, items)
  await emitHighRiskDealEvents(container, scope, newHighRiskAlerts)

  await emitCrm2027Event('crm_2027.email.sync.completed', {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    scanned: emails.length,
    analyzed,
    flagged: items.length,
  })

  return {
    scanned: emails.length,
    analyzed,
    flagged: items.length,
    alerts: newHighRiskAlerts.length,
  }
}
