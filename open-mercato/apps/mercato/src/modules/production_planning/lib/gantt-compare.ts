import type { GanttOperationBar, GanttPayload } from './gantt-payload'

export type GanttBarDiffKind = 'unchanged' | 'moved' | 'new' | 'removed'

export type GanttCompareBar = GanttOperationBar & {
  diffKind: GanttBarDiffKind
  baselineStartAt?: string
}

export type GanttCompareRow = {
  workCenterCode: string
  department: string | null
  baselineUtilizationPct: number
  scenarioUtilizationPct: number
  baselineOperations: GanttCompareBar[]
  scenarioOperations: GanttCompareBar[]
}

export type GanttDualComparePayload = {
  planningStartAt: string
  planningEndAt: string
  horizonHours: number
  baselineScenarioId: string
  scenarioId: string
  workCenterCount: number
  rows: GanttCompareRow[]
}

const MOVE_THRESHOLD_MS = 5 * 60 * 1000

export function mergeGanttForCompare(
  baseline: GanttPayload,
  scenario: GanttPayload,
  baselineScenarioId: string,
  scenarioId: string,
): GanttDualComparePayload {
  const baselineByOp = indexBarsByOperation(baseline)
  const scenarioByOp = indexBarsByOperation(scenario)

  const wcUnion = new Set<string>([
    ...baseline.rows.map((r) => r.workCenterCode),
    ...scenario.rows.map((r) => r.workCenterCode),
  ])

  const baselineRowByWc = new Map(baseline.rows.map((r) => [r.workCenterCode, r]))
  const scenarioRowByWc = new Map(scenario.rows.map((r) => [r.workCenterCode, r]))

  const rows: GanttCompareRow[] = [...wcUnion]
    .sort((a, b) => a.localeCompare(b))
    .map((workCenterCode) => {
      const bRow = baselineRowByWc.get(workCenterCode)
      const sRow = scenarioRowByWc.get(workCenterCode)
      const baselineOps = annotateBars(bRow?.operations ?? [], 'baseline', scenarioByOp)
      const scenarioOps = annotateBars(sRow?.operations ?? [], 'scenario', baselineByOp)
      return {
        workCenterCode,
        department: bRow?.department ?? sRow?.department ?? null,
        baselineUtilizationPct: bRow?.utilizationPct ?? 0,
        scenarioUtilizationPct: sRow?.utilizationPct ?? 0,
        baselineOperations: baselineOps,
        scenarioOperations: scenarioOps,
      }
    })

  return {
    planningStartAt: baseline.planningStartAt,
    planningEndAt: baseline.planningEndAt,
    horizonHours: baseline.horizonHours,
    baselineScenarioId,
    scenarioId,
    workCenterCount: rows.length,
    rows,
  }
}

function indexBarsByOperation(payload: GanttPayload): Map<string, GanttOperationBar> {
  const map = new Map<string, GanttOperationBar>()
  for (const row of payload.rows) {
    for (const op of row.operations) {
      map.set(op.operationId, op)
    }
  }
  return map
}

function annotateBars(
  bars: GanttOperationBar[],
  side: 'baseline' | 'scenario',
  otherIndex?: Map<string, GanttOperationBar>,
): GanttCompareBar[] {
  return bars.map((bar) => {
    const other = otherIndex?.get(bar.operationId)
    if (!other) {
      return {
        ...bar,
        diffKind: side === 'scenario' ? 'new' : 'removed',
        baselineStartAt: side === 'baseline' ? bar.plannedStartAt : undefined,
      }
    }
    const moved =
      Math.abs(Date.parse(bar.plannedStartAt) - Date.parse(other.plannedStartAt)) >
      MOVE_THRESHOLD_MS
    return {
      ...bar,
      diffKind: moved ? 'moved' : 'unchanged',
      baselineStartAt: side === 'scenario' ? other.plannedStartAt : bar.plannedStartAt,
    }
  })
}

export function resolveSharedPlanningStartAt(
  baseline?: GanttPayload | null,
  scenario?: GanttPayload | null,
  explicit?: string,
): Date {
  if (explicit) {
    const parsed = Date.parse(explicit)
    if (Number.isFinite(parsed)) return new Date(parsed)
  }
  if (baseline?.planningStartAt) return new Date(baseline.planningStartAt)
  if (scenario?.planningStartAt) return new Date(scenario.planningStartAt)
  return new Date()
}
