import type { ScenarioKpiSnapshot } from '../scenario-kpis'

export type ChaosPremiumEstimate = {
  chaosPremiumPln: number
  chaosPremiumPct: number
  baselineLateOrders: number
  scenarioLateOrders: number
  extraLateOrders: number
  extraLatenessMinutes: number
  plnPerLateOrder: number
  plnPerLatenessMinute: number
  currency: 'PLN'
  methodology: 'mercato_fixture_v1'
}

const DEFAULT_PLN_PER_LATE_ORDER = 2_500
const DEFAULT_PLN_PER_LATENESS_MINUTE = 45

/**
 * Estimates chaos premium (cost of schedule degradation) from scenario KPI deltas — no IFS actuals.
 */
export function estimateChaosPremium(
  baseline: ScenarioKpiSnapshot,
  scenario: ScenarioKpiSnapshot,
  options?: {
    plnPerLateOrder?: number
    plnPerLatenessMinute?: number
    revenueBasePln?: number
  },
): ChaosPremiumEstimate {
  const plnPerLateOrder = options?.plnPerLateOrder ?? DEFAULT_PLN_PER_LATE_ORDER
  const plnPerLatenessMinute = options?.plnPerLatenessMinute ?? DEFAULT_PLN_PER_LATENESS_MINUTE
  const extraLateOrders = Math.max(0, scenario.lateOrderCount - baseline.lateOrderCount)
  const extraLatenessMinutes = Math.max(
    0,
    scenario.maxLatenessMinutes - baseline.maxLatenessMinutes,
  )
  const chaosPremiumPln = Math.round(
    extraLateOrders * plnPerLateOrder + extraLatenessMinutes * plnPerLatenessMinute,
  )
  const revenueBase = options?.revenueBasePln ?? 1_000_000
  const chaosPremiumPct =
    revenueBase > 0 ? Math.round((chaosPremiumPln / revenueBase) * 10_000) / 100 : 0

  return {
    chaosPremiumPln,
    chaosPremiumPct,
    baselineLateOrders: baseline.lateOrderCount,
    scenarioLateOrders: scenario.lateOrderCount,
    extraLateOrders,
    extraLatenessMinutes,
    plnPerLateOrder,
    plnPerLatenessMinute,
    currency: 'PLN',
    methodology: 'mercato_fixture_v1',
  }
}

export type HindsightScenarioRow = {
  scenarioId: string
  scenarioLabel: string
  templateId: string | null
  kpis: ScenarioKpiSnapshot
  chaosPremium: ChaosPremiumEstimate | null
}

export function buildHindsightFromScenarios(
  baselineKpis: ScenarioKpiSnapshot,
  others: Array<{
    scenarioId: string
    scenarioLabel: string
    templateId: string | null
    kpis: ScenarioKpiSnapshot
  }>,
): HindsightScenarioRow[] {
  return others.map((row) => ({
    ...row,
    chaosPremium: estimateChaosPremium(baselineKpis, row.kpis),
  }))
}
