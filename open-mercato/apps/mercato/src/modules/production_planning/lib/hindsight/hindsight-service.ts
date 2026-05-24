import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningPlanScenario } from '../../data/entities'
import type { ScenarioKpiSnapshot } from '../scenario-kpis'
import type { OrgScope } from '../production-order'
import { buildHindsightFromScenarios, type HindsightScenarioRow } from './chaos-premium'

export type HindsightOverview = {
  baselineScenarioId: string | null
  baselineLabel: string | null
  baselineKpis: ScenarioKpiSnapshot | null
  scenarios: HindsightScenarioRow[]
  totalChaosPremiumPln: number
  generatedAt: string
}

function parseKpiSnapshot(row: ProductionPlanningPlanScenario): ScenarioKpiSnapshot | null {
  if (!row.kpiSnapshotJson) return null
  try {
    return JSON.parse(row.kpiSnapshotJson) as ScenarioKpiSnapshot
  } catch {
    return null
  }
}

export async function buildHindsightOverview(
  em: EntityManager,
  scope: OrgScope,
  options?: { baselineScenarioId?: string; limit?: number },
): Promise<HindsightOverview> {
  const limit = options?.limit ?? 20
  const completed = await em.find(
    ProductionPlanningPlanScenario,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: 'completed',
      kpiSnapshotJson: { $ne: null },
    },
    { orderBy: { completedAt: 'DESC' }, limit },
  )

  let baseline = options?.baselineScenarioId
    ? completed.find((s) => s.id === options.baselineScenarioId)
    : completed.find((s) => s.scenarioLabel?.includes('baseline') || s.templateId === 'WIF-01')

  if (!baseline && completed.length > 0) {
    baseline = completed[completed.length - 1]
  }

  const baselineKpis = baseline ? parseKpiSnapshot(baseline) : null
  const others = completed
    .filter((s) => s.id !== baseline?.id)
    .map((s) => ({
      scenarioId: s.id,
      scenarioLabel: s.scenarioLabel,
      templateId: s.templateId ?? null,
      kpis: parseKpiSnapshot(s)!,
    }))
    .filter((row) => row.kpis != null)

  const scenarios =
    baselineKpis != null ? buildHindsightFromScenarios(baselineKpis, others) : []

  const totalChaosPremiumPln = scenarios.reduce(
    (sum, s) => sum + (s.chaosPremium?.chaosPremiumPln ?? 0),
    0,
  )

  return {
    baselineScenarioId: baseline?.id ?? null,
    baselineLabel: baseline?.scenarioLabel ?? null,
    baselineKpis,
    scenarios,
    totalChaosPremiumPln,
    generatedAt: new Date().toISOString(),
  }
}
