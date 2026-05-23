import type { EntityManager } from '@mikro-orm/postgresql'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import {
  CustomerActivity,
  CustomerDeal,
} from '@open-mercato/core/modules/customers/data/entities'
import { analyzeSentiment } from './sentiment'
import { daysSince } from './tool-context'

export type AtRiskDealItem = {
  dealId: string
  title: string
  riskLevel: 'medium' | 'high'
  reasons: string[]
  daysSinceLastActivity: number | null
  sentimentLabel: string | null
}

export type ScanAtRiskOptions = {
  tenantId: string
  organizationId: string
  limit?: number
  stallDays?: number
  maxDeals?: number
}

export async function scanAtRiskDeals(
  em: EntityManager,
  options: ScanAtRiskOptions,
): Promise<AtRiskDealItem[]> {
  const { tenantId, organizationId } = options
  const limit = options.limit ?? 50
  const stallDays = options.stallDays ?? 14
  const maxDeals = options.maxDeals ?? 200

  const deals = await findWithDecryption(em, CustomerDeal, {
    tenantId,
    organizationId,
    status: 'open',
    deletedAt: null,
  })

  const ranked: AtRiskDealItem[] = []

  for (const deal of deals.slice(0, maxDeals)) {
    const activities = await em.find(
      CustomerActivity,
      { deal: deal.id, tenantId, organizationId },
      { orderBy: { occurredAt: 'DESC' }, limit: 3 },
    )

    const textBlob = activities
      .map((a) => [a.subject, a.body].filter(Boolean).join(' '))
      .join('\n')
    const sentiment = textBlob ? analyzeSentiment(textBlob) : null
    const lastAt = activities[0]?.occurredAt ?? activities[0]?.createdAt ?? null
    const idleDays = daysSince(lastAt)

    const reasons: string[] = []
    let riskLevel: 'medium' | 'high' | null = null

    if (sentiment?.atRisk) {
      reasons.push(`negative_sentiment:${sentiment.label}`)
      riskLevel = 'high'
    }
    if (idleDays != null && idleDays >= stallDays) {
      reasons.push(`stalled:${idleDays}d`)
      riskLevel = riskLevel ?? 'medium'
    }

    if (riskLevel) {
      ranked.push({
        dealId: deal.id,
        title: deal.title,
        riskLevel,
        reasons,
        daysSinceLastActivity: idleDays,
        sentimentLabel: sentiment?.label ?? null,
      })
    }
  }

  ranked.sort((a, b) => (b.riskLevel === 'high' ? 2 : 1) - (a.riskLevel === 'high' ? 2 : 1))
  return ranked.slice(0, limit)
}
