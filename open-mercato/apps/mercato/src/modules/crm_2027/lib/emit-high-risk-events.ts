import type { AwilixContainer } from 'awilix'
import { emitCrm2027Event } from '../events'
import type { HighRiskDealAlert } from './persist-risk-flags'

export const CRM_2027_HIGH_RISK_EVENT = 'crm_2027.deal.high_risk'

export type Crm2027HighRiskEventPayload = {
  tenantId: string
  organizationId: string
  dealId: string
  dealTitle: string
  reasons: string[]
}

export async function emitHighRiskDealEvents(
  _container: AwilixContainer,
  scope: { tenantId: string; organizationId: string },
  alerts: HighRiskDealAlert[],
): Promise<void> {
  if (!alerts.length) return

  for (const alert of alerts) {
    const payload: Crm2027HighRiskEventPayload = {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      dealId: alert.dealId,
      dealTitle: alert.dealTitle,
      reasons: alert.reasons,
    }
    await emitCrm2027Event(CRM_2027_HIGH_RISK_EVENT, payload, { persistent: true })
  }
}
