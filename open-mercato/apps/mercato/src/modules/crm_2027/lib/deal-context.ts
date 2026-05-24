import type { EntityManager } from '@mikro-orm/postgresql'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import {
  CustomerActivity,
  CustomerDeal,
} from '@open-mercato/core/modules/customers/data/entities'
import { daysSince } from './tool-context'

export type LoadedDealContext = {
  found: boolean
  dealId: string
  deal?: {
    id: string
    title: string
    status: string
    pipelineStage: string | null
    pipelineStageId: string | null
    probability: number | null
    valueAmount: string | null
    valueCurrency: string | null
    expectedCloseAt: string | null
  }
  recentActivitySnippets?: string[]
  daysSinceLastActivity?: number | null
}

export async function loadDealContext(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  dealId: string,
  activityLimit: number,
): Promise<LoadedDealContext> {
  const deals = await findWithDecryption(em, CustomerDeal, {
    id: dealId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    deletedAt: null,
  })
  const deal = deals[0]
  if (!deal) {
    return { found: false, dealId }
  }

  const activities = await em.find(
    CustomerActivity,
    {
      deal: deal.id,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    },
    {
      orderBy: { occurredAt: 'DESC', createdAt: 'DESC' },
      limit: activityLimit,
    },
  )

  const snippets = activities
    .map((a) => [a.subject, a.body].filter(Boolean).join(': '))
    .filter((s) => s.length > 0)

  const lastActivityAt = activities[0]?.occurredAt ?? activities[0]?.createdAt ?? null

  return {
    found: true,
    dealId,
    deal: {
      id: deal.id,
      title: deal.title,
      status: deal.status,
      pipelineStage: deal.pipelineStage ?? null,
      pipelineStageId: deal.pipelineStageId ?? null,
      probability: deal.probability ?? null,
      valueAmount: deal.valueAmount ?? null,
      valueCurrency: deal.valueCurrency ?? null,
      expectedCloseAt: deal.expectedCloseAt?.toISOString() ?? null,
    },
    recentActivitySnippets: snippets,
    daysSinceLastActivity: daysSince(lastActivityAt),
  }
}
