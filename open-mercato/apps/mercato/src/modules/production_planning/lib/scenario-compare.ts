import type { ScenarioKpiSnapshot } from './scenario-kpis'
import type { PlanScenarioDto } from './plan-scenario-service'

export type ScenarioCompareDelta = {
  scenarioId: string
  label: string
  templateId: string | null
  kpis: ScenarioKpiSnapshot
  deltaVsBaseline: {
    lateOrderCount: number
    maxLatenessMinutes: number
    avgLatenessMinutes: number
    operationCount: number
    objectiveValue: number | null
  }
}

export type ScenarioCompareResult = {
  baseline: PlanScenarioDto
  scenarios: ScenarioCompareDelta[]
  rankedByLateOrders: string[]
}

export function compareScenarios(
  baseline: PlanScenarioDto,
  others: PlanScenarioDto[],
): ScenarioCompareResult {
  const baseKpis = baseline.kpiSnapshot
  if (!baseKpis) {
    throw new Error('BASELINE_MISSING_KPIS')
  }

  const scenarios: ScenarioCompareDelta[] = others.map((s) => {
    const kpis = s.kpiSnapshot ?? {
      operationCount: 0,
      lateOrderCount: 0,
      maxLatenessMinutes: 0,
      avgLatenessMinutes: 0,
      workCenterCount: 0,
      objectiveValue: null,
      solverStatus: null,
      computedAt: new Date().toISOString(),
    }
    return {
      scenarioId: s.id,
      label: s.scenarioLabel,
      templateId: s.templateId,
      kpis,
      deltaVsBaseline: {
        lateOrderCount: kpis.lateOrderCount - baseKpis.lateOrderCount,
        maxLatenessMinutes: kpis.maxLatenessMinutes - baseKpis.maxLatenessMinutes,
        avgLatenessMinutes: kpis.avgLatenessMinutes - baseKpis.avgLatenessMinutes,
        operationCount: kpis.operationCount - baseKpis.operationCount,
        objectiveValue:
          kpis.objectiveValue != null && baseKpis.objectiveValue != null
            ? kpis.objectiveValue - baseKpis.objectiveValue
            : null,
      },
    }
  })

  const rankedByLateOrders = [...scenarios]
    .sort((a, b) => a.kpis.lateOrderCount - b.kpis.lateOrderCount)
    .map((s) => s.scenarioId)

  return { baseline, scenarios, rankedByLateOrders }
}
