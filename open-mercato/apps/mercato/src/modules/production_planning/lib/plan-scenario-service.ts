import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'
import {
  ProductionPlanningPlanScenario,
  type PlanScenarioStatus,
  type CpsatObjective,
} from '../data/entities'
import type { ScenarioKpiSnapshot } from './scenario-kpis'
import type { CpsatScheduleEntry } from './ortools-bridge'
import type { OrgScope } from './production-order'

export type PlanScenarioDto = {
  id: string
  tenantId: string
  organizationId: string
  templateId: string | null
  bundleId: string | null
  scenarioLabel: string
  parentScenarioId: string | null
  baselineScenarioId: string | null
  status: PlanScenarioStatus
  proposeOnly: boolean
  horizonHours: number
  objective: CpsatObjective
  objectiveWeights: Record<string, number> | null
  overrides: Record<string, unknown> | null
  optimizeJobId: string | null
  productionOrderIds: string[]
  kpiSnapshot: ScenarioKpiSnapshot | null
  schedulePreview: CpsatScheduleEntry[] | null
  solverStatus: string | null
  objectiveValue: number | null
  wallMs: number | null
  rankInTournament: number | null
  message: string | null
  notes: string[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function mapPlanScenario(row: ProductionPlanningPlanScenario): PlanScenarioDto {
  const overrides = parseJson<Record<string, unknown> | null>(row.overridesJson, null)
  const notes = Array.isArray(overrides?.['_notes'])
    ? (overrides!['_notes'] as string[])
    : []

  return {
    id: row.id,
    tenantId: row.tenantId,
    organizationId: row.organizationId,
    templateId: row.templateId ?? null,
    bundleId: row.bundleId ?? null,
    scenarioLabel: row.scenarioLabel,
    parentScenarioId: row.parentScenarioId ?? null,
    baselineScenarioId: row.baselineScenarioId ?? null,
    status: row.status,
    proposeOnly: row.proposeOnly,
    horizonHours: row.horizonHours,
    objective: row.objective,
    objectiveWeights: parseJson(row.objectiveWeightsJson, null),
    overrides,
    optimizeJobId: row.optimizeJobId ?? null,
    productionOrderIds: parseJson<string[]>(row.productionOrderIdsJson, []),
    kpiSnapshot: parseJson<ScenarioKpiSnapshot | null>(row.kpiSnapshotJson, null),
    schedulePreview: parseJson<CpsatScheduleEntry[] | null>(row.scheduleJson, null),
    solverStatus: row.solverStatus ?? null,
    objectiveValue:
      row.objectiveValue != null ? Number(row.objectiveValue) : null,
    wallMs: row.wallMs ?? null,
    rankInTournament: row.rankInTournament ?? null,
    message: row.message ?? null,
    notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

export async function createPlanScenarioDraft(
  em: EntityManager,
  scope: OrgScope,
  input: {
    scenarioLabel: string
    templateId?: string | null
    bundleId?: string | null
    parentScenarioId?: string | null
    baselineScenarioId?: string | null
    horizonHours: number
    objective: CpsatObjective
    objectiveWeights?: Record<string, number> | null
    overrides?: Record<string, unknown>
    proposeOnly?: boolean
    productionOrderIds: string[]
    requestedByUserId?: string | null
    notes?: string[]
  },
): Promise<ProductionPlanningPlanScenario> {
  const overridesPayload = {
    ...(input.overrides ?? {}),
    ...(input.notes?.length ? { _notes: input.notes } : {}),
  }

  const row = em.create(ProductionPlanningPlanScenario, {
    id: randomUUID(),
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    templateId: input.templateId ?? null,
    bundleId: input.bundleId ?? null,
    scenarioLabel: input.scenarioLabel,
    parentScenarioId: input.parentScenarioId ?? null,
    baselineScenarioId: input.baselineScenarioId ?? null,
    status: 'draft',
    proposeOnly: input.proposeOnly ?? true,
    horizonHours: input.horizonHours,
    objective: input.objective,
    objectiveWeightsJson: input.objectiveWeights
      ? JSON.stringify(input.objectiveWeights)
      : null,
    overridesJson: JSON.stringify(overridesPayload),
    productionOrderIdsJson: JSON.stringify(input.productionOrderIds),
    requestedByUserId: input.requestedByUserId ?? null,
  })
  await em.persist(row)
  await em.flush()
  return row
}

export async function getPlanScenario(
  em: EntityManager,
  scope: OrgScope,
  scenarioId: string,
): Promise<PlanScenarioDto | null> {
  const row = await em.findOne(ProductionPlanningPlanScenario, {
    id: scenarioId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  return row ? mapPlanScenario(row) : null
}

export async function listPlanScenarios(
  em: EntityManager,
  scope: OrgScope,
  options?: { limit?: number; bundleId?: string; templateId?: string },
): Promise<PlanScenarioDto[]> {
  const where: Record<string, unknown> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  }
  if (options?.bundleId) where.bundleId = options.bundleId
  if (options?.templateId) where.templateId = options.templateId

  const rows = await em.find(ProductionPlanningPlanScenario, where, {
    orderBy: { createdAt: 'DESC' },
    limit: options?.limit ?? 50,
  })
  return rows.map(mapPlanScenario)
}

export async function markPlanScenarioSimulating(
  em: EntityManager,
  scenarioId: string,
  optimizeJobId: string,
): Promise<void> {
  const row = await em.findOne(ProductionPlanningPlanScenario, { id: scenarioId })
  if (!row) return
  row.status = 'simulating'
  row.optimizeJobId = optimizeJobId
  row.updatedAt = new Date()
  await em.flush()
}

export async function completePlanScenario(
  em: EntityManager,
  scenarioId: string,
  result: {
    schedule: CpsatScheduleEntry[]
    kpiSnapshot: ScenarioKpiSnapshot
    solverStatus?: string | null
    objectiveValue?: number | null
    wallMs?: number
    rankInTournament?: number
    message?: string | null
  },
): Promise<void> {
  const row = await em.findOne(ProductionPlanningPlanScenario, { id: scenarioId })
  if (!row) return
  row.status = 'completed'
  row.scheduleJson = JSON.stringify(result.schedule)
  row.kpiSnapshotJson = JSON.stringify(result.kpiSnapshot)
  row.solverStatus = result.solverStatus ?? null
  row.objectiveValue = result.objectiveValue ?? null
  row.wallMs = result.wallMs ?? null
  row.rankInTournament = result.rankInTournament ?? null
  row.message = result.message ?? null
  row.completedAt = new Date()
  row.updatedAt = new Date()
  await em.flush()
}

export async function failPlanScenario(
  em: EntityManager,
  scenarioId: string,
  message: string,
): Promise<void> {
  const row = await em.findOne(ProductionPlanningPlanScenario, { id: scenarioId })
  if (!row) return
  row.status = 'failed'
  row.message = message
  row.completedAt = new Date()
  row.updatedAt = new Date()
  await em.flush()
}
