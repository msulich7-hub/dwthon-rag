import type { EntityManager } from '@mikro-orm/postgresql'
import { Crm2027DealRiskFlag } from '../data/entities'
import type { AtRiskDealItem } from './at-risk-scan'

export async function persistAtRiskFlags(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  items: AtRiskDealItem[],
): Promise<number> {
  let count = 0
  const scannedAt = new Date()

  for (const item of items) {
    let record = await em.findOne(Crm2027DealRiskFlag, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      dealId: item.dealId,
    })

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
    count += 1
  }

  await em.flush()
  return count
}
