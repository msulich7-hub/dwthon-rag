import type { EntityManager } from '@mikro-orm/postgresql'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { CustomerDeal } from '@open-mercato/core/modules/customers/data/entities'
import { Crm2027DealRiskFlag } from '../data/entities'

export type ForecastDealRow = {
  dealId: string
  title: string
  stage: string | null
  probability: number
  valueAmount: number
  valueCurrency: string | null
  weightedValue: number
  riskLevel: 'low' | 'medium' | 'high'
}

export type PipelineForecast = {
  openDeals: number
  totalPipelineValue: number
  weightedForecast: number
  atRiskWeighted: number
  currency: string | null
  deals: ForecastDealRow[]
}

function parseAmount(raw: string | null | undefined): number {
  if (!raw) return 0
  const n = Number.parseFloat(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export async function buildPipelineForecast(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  limit = 100,
): Promise<PipelineForecast> {
  const deals = await findWithDecryption(em, CustomerDeal, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: 'open',
    deletedAt: null,
  })

  const flags = await em.find(Crm2027DealRiskFlag, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const riskByDeal = new Map(flags.map((f) => [f.dealId, f.riskLevel]))

  const rows: ForecastDealRow[] = deals.slice(0, limit).map((deal) => {
    const probability = deal.probability ?? 30
    const valueAmount = parseAmount(deal.valueAmount)
    const weightedValue = (valueAmount * probability) / 100
    const flagRisk = riskByDeal.get(deal.id)
    const riskLevel: ForecastDealRow['riskLevel'] =
      flagRisk === 'high' ? 'high' : flagRisk === 'medium' ? 'medium' : 'low'

    return {
      dealId: deal.id,
      title: deal.title,
      stage: deal.pipelineStage ?? null,
      probability,
      valueAmount,
      valueCurrency: deal.valueCurrency ?? null,
      weightedValue,
      riskLevel,
    }
  })

  const totalPipelineValue = rows.reduce((sum, r) => sum + r.valueAmount, 0)
  const weightedForecast = rows.reduce((sum, r) => sum + r.weightedValue, 0)
  const atRiskWeighted = rows
    .filter((r) => r.riskLevel !== 'low')
    .reduce((sum, r) => sum + r.weightedValue, 0)

  const currency = rows.find((r) => r.valueCurrency)?.valueCurrency ?? null

  return {
    openDeals: rows.length,
    totalPipelineValue,
    weightedForecast,
    atRiskWeighted,
    currency,
    deals: rows.sort((a, b) => b.weightedValue - a.weightedValue),
  }
}
