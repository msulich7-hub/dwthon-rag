import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningOptimizeJob,
  type CpsatOptimizeJobStatus,
} from '../data/entities'
import type { CpsatObjective, CpsatScheduleEntry } from './ortools-bridge'
import type { ApplyCpsatScheduleResult } from './apply-cpsat-schedule'
import type { OrgScope } from './production-order'

export type CreateCpsatOptimizeJobInput = {
  id: string
  productionOrderIds: string[]
  horizonHours?: number
  objective?: CpsatObjective
  applySync?: boolean
  dryRun?: boolean
  chunkCount?: number
  queueJobId?: string | null
  requestedByUserId?: string | null
}

export type CpsatOptimizeJobDto = {
  id: string
  status: CpsatOptimizeJobStatus
  tenantId: string
  organizationId: string
  productionOrderIds: string[]
  horizonHours: number
  objective: CpsatObjective
  applySync: boolean
  dryRun: boolean
  chunkCount: number
  chunksCompleted: number
  queueJobId: string | null
  solverStatus: string | null
  objectiveValue: number | null
  message: string | null
  operationCount: number | null
  applyResult: ApplyCpsatScheduleResult | null
  schedulePreview: CpsatScheduleEntry[] | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

function isJobPersistenceEnabled(): boolean {
  const raw = process.env.PRODUCTION_PLANNING_PERSIST_CPSAT_JOBS?.trim().toLowerCase()
  if (raw === 'false' || raw === '0') return false
  return true
}

function mapJob(row: ProductionPlanningOptimizeJob): CpsatOptimizeJobDto {
  let applyResult: ApplyCpsatScheduleResult | null = null
  let schedulePreview: CpsatScheduleEntry[] | null = null

  if (row.applyResultJson) {
    try {
      applyResult = JSON.parse(row.applyResultJson) as ApplyCpsatScheduleResult
    } catch {
      applyResult = null
    }
  }
  if (row.scheduleJson) {
    try {
      schedulePreview = JSON.parse(row.scheduleJson) as CpsatScheduleEntry[]
    } catch {
      schedulePreview = null
    }
  }

  let productionOrderIds: string[] = []
  try {
    productionOrderIds = JSON.parse(row.productionOrderIdsJson) as string[]
  } catch {
    productionOrderIds = []
  }

  return {
    id: row.id,
    status: row.status,
    tenantId: row.tenantId,
    organizationId: row.organizationId,
    productionOrderIds,
    horizonHours: row.horizonHours,
    objective: row.objective,
    applySync: row.applySync,
    dryRun: row.dryRun,
    chunkCount: row.chunkCount,
    chunksCompleted: row.chunksCompleted,
    queueJobId: row.queueJobId ?? null,
    solverStatus: row.solverStatus ?? null,
    objectiveValue: row.objectiveValue ?? null,
    message: row.message ?? null,
    operationCount: row.operationCount ?? null,
    applyResult,
    schedulePreview,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

export async function createCpsatOptimizeJob(
  em: EntityManager,
  scope: OrgScope,
  input: CreateCpsatOptimizeJobInput,
): Promise<CpsatOptimizeJobDto | null> {
  if (!isJobPersistenceEnabled()) return null

  const now = new Date()
  const row = em.create(ProductionPlanningOptimizeJob, {
    id: input.id,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: 'queued',
    productionOrderIdsJson: JSON.stringify(input.productionOrderIds),
    horizonHours: input.horizonHours ?? 168,
    objective: input.objective ?? 'minimize_lateness',
    applySync: input.applySync !== false,
    dryRun: input.dryRun === true,
    chunkCount: input.chunkCount ?? 1,
    chunksCompleted: 0,
    queueJobId: input.queueJobId ?? null,
    requestedByUserId: input.requestedByUserId ?? null,
    createdAt: now,
    updatedAt: now,
  })

  await em.persistAndFlush(row)
  return mapJob(row)
}

export async function getCpsatOptimizeJob(
  em: EntityManager,
  scope: OrgScope,
  jobId: string,
): Promise<CpsatOptimizeJobDto | null> {
  if (!isJobPersistenceEnabled()) return null

  const row = await em.findOne(ProductionPlanningOptimizeJob, {
    id: jobId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  return row ? mapJob(row) : null
}

export async function markCpsatOptimizeJobRunning(
  em: EntityManager,
  jobId: string,
): Promise<void> {
  if (!isJobPersistenceEnabled()) return
  const row = await em.findOne(ProductionPlanningOptimizeJob, { id: jobId })
  if (!row) return
  row.status = 'running'
  row.startedAt = row.startedAt ?? new Date()
  await em.flush()
}

export async function updateCpsatOptimizeJobProgress(
  em: EntityManager,
  jobId: string,
  patch: { chunksCompleted: number; chunkCount?: number },
): Promise<void> {
  if (!isJobPersistenceEnabled()) return
  const row = await em.findOne(ProductionPlanningOptimizeJob, { id: jobId })
  if (!row) return
  row.chunksCompleted = patch.chunksCompleted
  if (typeof patch.chunkCount === 'number') row.chunkCount = patch.chunkCount
  row.status = 'chunking'
  await em.flush()
}

export async function completeCpsatOptimizeJob(
  em: EntityManager,
  jobId: string,
  patch: {
    solverStatus?: string | null
    objectiveValue?: number | null
    message?: string | null
    operationCount?: number
    schedule?: CpsatScheduleEntry[]
    applyResult?: ApplyCpsatScheduleResult
  },
): Promise<void> {
  if (!isJobPersistenceEnabled()) return
  const row = await em.findOne(ProductionPlanningOptimizeJob, { id: jobId })
  if (!row) return
  row.status = 'completed'
  row.completedAt = new Date()
  row.solverStatus = patch.solverStatus ?? row.solverStatus
  row.objectiveValue = patch.objectiveValue ?? row.objectiveValue
  row.message = patch.message ?? row.message
  row.operationCount = patch.operationCount ?? row.operationCount
  if (patch.schedule) row.scheduleJson = JSON.stringify(patch.schedule)
  if (patch.applyResult) row.applyResultJson = JSON.stringify(patch.applyResult)
  await em.flush()
}

export async function failCpsatOptimizeJob(
  em: EntityManager,
  jobId: string,
  message: string,
): Promise<void> {
  if (!isJobPersistenceEnabled()) return
  const row = await em.findOne(ProductionPlanningOptimizeJob, { id: jobId })
  if (!row) return
  row.status = 'failed'
  row.message = message
  row.completedAt = new Date()
  await em.flush()
}
