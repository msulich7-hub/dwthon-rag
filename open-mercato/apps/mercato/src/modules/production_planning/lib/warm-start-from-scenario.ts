import type { EntityManager } from '@mikro-orm/postgresql'
import { getPlanScenario } from './plan-scenario-service'
import type { CpsatFixedOperation, CpsatScheduleEntry } from './ortools-bridge'
import type { OrgScope } from './production-order'

export function scheduleEntriesToFixedOperations(
  schedule: CpsatScheduleEntry[],
  operationIdsInScope: Set<string>,
): CpsatFixedOperation[] {
  const fixed: CpsatFixedOperation[] = []
  for (const row of schedule) {
    if (!operationIdsInScope.has(row.operationId)) continue
    if (!row.plannedStartAt || !row.plannedEndAt) continue
    fixed.push({
      operationId: row.operationId,
      workCenterCode: row.workCenterCode,
      plannedStartAt: row.plannedStartAt,
      plannedEndAt: row.plannedEndAt,
    })
  }
  return fixed
}

export async function loadWarmStartFixedOperations(
  em: EntityManager,
  scope: OrgScope,
  warmStartScenarioId: string,
  operationIdsInScope: Set<string>,
): Promise<CpsatFixedOperation[]> {
  const scenario = await getPlanScenario(em, scope, warmStartScenarioId)
  if (!scenario || scenario.status !== 'completed') {
    return []
  }
  const schedule = scenario.schedulePreview ?? []
  if (schedule.length === 0) return []
  return scheduleEntriesToFixedOperations(schedule, operationIdsInScope)
}
