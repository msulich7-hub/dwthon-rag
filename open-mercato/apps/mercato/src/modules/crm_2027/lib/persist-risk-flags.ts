import type { EntityManager } from '@mikro-orm/postgresql'
import { Crm2027DealRiskFlag } from '../data/entities'
import type { AtRiskDealItem } from './at-risk-scan'

export type HighRiskDealAlert = {
  dealId: string
  dealTitle: string
  riskLevel: 'high'
  reasons: string[]
}

export type PersistRiskFlagsResult = {
  count: number
  newHighRiskAlerts: HighRiskDealAlert[]
}

export async function persistAtRiskFlags(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  items: AtRiskDealItem[],
): Promise<PersistRiskFlagsResult> {
  let count = 0
  const newHighRiskAlerts: HighRiskDealAlert[] = []
  const scannedAt = new Date()

  for (const item of items) {
    let record = await em.findOne(Crm2027DealRiskFlag, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      dealId: item.dealId,
    })

    const wasHigh = record?.riskLevel === 'high'

    if (!record) {
      record = em.create(Crm2027DealRiskFlag, {
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
        dealId: item.dealId,
        dealTitle: item.title,
        riskLevel: item.riskLevel,
        reasonsJson: JSON.stringify(item.reasons),
        sentimentLabel: item.sentimentLabel,
        daysSinceLastActivity: item.daysSinceLastActivity,
        lastScannedAt: scannedAt,
      })
      em.persist(record)
    } else {
      record.dealTitle = item.title
      record.riskLevel = item.riskLevel
      record.reasonsJson = JSON.stringify(item.reasons)
      record.sentimentLabel = item.sentimentLabel
      record.daysSinceLastActivity = item.daysSinceLastActivity
      record.lastScannedAt = scannedAt
    }

    if (item.riskLevel === 'high' && !wasHigh) {
      newHighRiskAlerts.push({
        dealId: item.dealId,
        dealTitle: item.title,
        riskLevel: 'high',
        reasons: item.reasons,
      })
    }

    count += 1
  }

  await em.flush()
  return { count, newHighRiskAlerts }
}
