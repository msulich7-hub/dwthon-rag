import { compareScenarios } from '../scenario-compare'
import type { PlanScenarioDto } from '../plan-scenario-service'

function mockScenario(
  id: string,
  late: number,
  objective: number,
): PlanScenarioDto {
  const kpi = {
    operationCount: 10,
    lateOrderCount: late,
    maxLatenessMinutes: late * 60,
    avgLatenessMinutes: late * 30,
    workCenterCount: 5,
    objectiveValue: objective,
    solverStatus: 'OPTIMAL',
    computedAt: new Date().toISOString(),
  }
  return {
    id,
    tenantId: 't',
    organizationId: 'o',
    templateId: 'WIF-01',
    bundleId: null,
    scenarioLabel: id,
    parentScenarioId: null,
    baselineScenarioId: null,
    status: 'completed',
    proposeOnly: true,
    horizonHours: 168,
    objective: 'minimize_lateness',
    objectiveWeights: null,
    overrides: null,
    optimizeJobId: null,
    productionOrderIds: [],
    kpiSnapshot: kpi,
    schedulePreview: null,
    solverStatus: 'OPTIMAL',
    objectiveValue: objective,
    wallMs: 1000,
    rankInTournament: null,
    message: null,
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  }
}

describe('scenario-compare', () => {
  it('ranks scenarios by late order count', () => {
    const baseline = mockScenario('base', 5, 100)
    const a = mockScenario('a', 2, 80)
    const b = mockScenario('b', 8, 120)
    const result = compareScenarios(baseline, [a, b])
    expect(result.rankedByLateOrders[0]).toBe('a')
    expect(result.scenarios[0]?.deltaVsBaseline.lateOrderCount).toBe(-3)
  })
})
