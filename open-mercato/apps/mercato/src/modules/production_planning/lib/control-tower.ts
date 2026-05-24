import type { EntityManager } from '@mikro-orm/postgresql'
import {
  ProductionPlanningGenesisRoot,
  ProductionPlanningIfsSilverExtractWatermark,
  ProductionPlanningOptimizeJob,
  ProductionPlanningOrder,
  ProductionPlanningPlanScenario,
} from '../data/entities'
import { runAntiFantasyChecks } from './anti-fantasy'
import { buildCapacitySnapshot, isOrderLate } from './capacity-snapshot'
import { isOrtoolsBridgeConfigured } from './ortools-bridge'
import type { OrgScope } from './production-order'

export type ExceptionSeverity = 'critical' | 'high' | 'medium'

export type PlanningException = {
  id: string
  severity: ExceptionSeverity
  category:
    | 'late_order'
    | 'wc_overload'
    | 'failed_scenario'
    | 'failed_optimize'
    | 'bridge_unconfigured'
    | 'silver_stale'
    | 'genesis_empty'
    | 'anti_fantasy'
  title: string
  message: string
  entityType: string
  entityId: string
  detectedAt: string
  ageMinutes: number
  drillPath: string | null
}

export type ControlTowerOverview = {
  horizonHours: number
  openOrders: number
  lateOrders: number
  openExceptions: number
  criticalExceptions: number
  workCenterCount: number
  maxUtilizationPct: number
  openOptimizeJobs: number
  failedScenarios24h: number
  cpsatBridgeConfigured: boolean
  generatedAt: string
}

function ageMinutesFrom(date: Date, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000))
}

export async function buildControlTowerOverview(
  em: EntityManager,
  scope: OrgScope,
  options?: { horizonHours?: number },
): Promise<ControlTowerOverview> {
  const horizonHours = options?.horizonHours ?? 168
  const snapshot = await buildCapacitySnapshot(em, scope, { horizonHours })
  const exceptions = await listControlTowerExceptions(em, scope, { horizonHours, limit: 500 })
  const openOptimizeJobs = await em.count(ProductionPlanningOptimizeJob, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $in: ['queued', 'running', 'chunking'] },
  })

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const failedScenarios24h = await em.count(ProductionPlanningPlanScenario, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: 'failed',
    updatedAt: { $gte: since },
  })

  const maxUtilizationPct =
    snapshot.workCenters.length > 0
      ? Math.max(...snapshot.workCenters.map((w) => w.utilizationPct))
      : 0

  return {
    horizonHours,
    openOrders: snapshot.openOrders,
    lateOrders: snapshot.lateOrders,
    openExceptions: exceptions.length,
    criticalExceptions: exceptions.filter((e) => e.severity === 'critical').length,
    workCenterCount: snapshot.workCenters.length,
    maxUtilizationPct,
    openOptimizeJobs,
    failedScenarios24h,
    cpsatBridgeConfigured: isOrtoolsBridgeConfigured(),
    generatedAt: new Date().toISOString(),
  }
}

export async function listControlTowerExceptions(
  em: EntityManager,
  scope: OrgScope,
  options?: { horizonHours?: number; limit?: number; status?: 'open' | 'all' },
): Promise<PlanningException[]> {
  const now = new Date()
  const limit = options?.limit ?? 100
  const exceptions: PlanningException[] = []

  if (!isOrtoolsBridgeConfigured()) {
    exceptions.push({
      id: 'bridge-unconfigured',
      severity: 'medium',
      category: 'bridge_unconfigured',
      title: 'CP-SAT bridge not configured',
      message: 'Set ORTOOLS_BRIDGE_URL to enable finite scheduling.',
      entityType: 'system',
      entityId: 'ortools-bridge',
      detectedAt: now.toISOString(),
      ageMinutes: 0,
      drillPath: null,
    })
  }

  const orders = await em.find(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $in: ['planned', 'in_progress'] },
  })

  for (const order of orders) {
    if (!isOrderLate(order, now)) continue
    exceptions.push({
      id: `late-order:${order.id}`,
      severity: 'high',
      category: 'late_order',
      title: `Late production order ${order.code}`,
      message: order.title,
      entityType: 'production_order',
      entityId: order.id,
      detectedAt: (order.dueAt ?? order.updatedAt).toISOString(),
      ageMinutes: ageMinutesFrom(order.dueAt ?? order.updatedAt, now),
      drillPath: `/backend/production_planning/orders`,
    })
  }

  const snapshot = await buildCapacitySnapshot(em, scope, {
    horizonHours: options?.horizonHours ?? 168,
  })
  for (const wc of snapshot.workCenters) {
    if (wc.utilizationPct < 100) continue
    exceptions.push({
      id: `wc-overload:${wc.workCenterCode}`,
      severity: wc.utilizationPct >= 120 ? 'critical' : 'high',
      category: 'wc_overload',
      title: `Work center overloaded: ${wc.workCenterCode}`,
      message: `${wc.utilizationPct}% utilization, ${wc.operationCount} operations`,
      entityType: 'work_center',
      entityId: wc.workCenterCode,
      detectedAt: now.toISOString(),
      ageMinutes: 0,
      drillPath: '/backend/production_planning/schedule',
    })
  }

  const failedScenarios = await em.find(
    ProductionPlanningPlanScenario,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: 'failed',
    },
    { orderBy: { updatedAt: 'DESC' }, limit: 20 },
  )
  for (const row of failedScenarios) {
    exceptions.push({
      id: `scenario-failed:${row.id}`,
      severity: 'medium',
      category: 'failed_scenario',
      title: `Scenario failed: ${row.scenarioLabel}`,
      message: row.message ?? 'Simulation failed',
      entityType: 'plan_scenario',
      entityId: row.id,
      detectedAt: row.updatedAt.toISOString(),
      ageMinutes: ageMinutesFrom(row.updatedAt, now),
      drillPath: '/backend/production_planning/scenarios',
    })
  }

  const failedJobs = await em.find(
    ProductionPlanningOptimizeJob,
    {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      status: 'failed',
    },
    { orderBy: { updatedAt: 'DESC' }, limit: 20 },
  )
  const genesisCount = await em.count(ProductionPlanningGenesisRoot, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const openOrders = await em.count(ProductionPlanningOrder, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $in: ['planned', 'in_progress', 'draft'] },
  })
  if (openOrders > 5 && genesisCount === 0) {
    exceptions.push({
      id: 'genesis-empty',
      severity: 'medium',
      category: 'genesis_empty',
      title: 'No genesis roots — run MRP netting',
      message: `${openOrders} open MO without genesis demand trees.`,
      entityType: 'system',
      entityId: 'genesis',
      detectedAt: now.toISOString(),
      ageMinutes: 0,
      drillPath: '/backend/production_planning/genesis',
    })
  }

  const silverWm = await em.find(ProductionPlanningIfsSilverExtractWatermark, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
  })
  const staleHours = 24
  for (const wm of silverWm) {
    if (!wm.lastSuccessAt) continue
    const ageH = (now.getTime() - wm.lastSuccessAt.getTime()) / 3_600_000
    if (ageH <= staleHours) continue
    exceptions.push({
      id: `silver-stale:${wm.entityName}`,
      severity: 'medium',
      category: 'silver_stale',
      title: `Silver extract stale: ${wm.entityName}`,
      message: `Last success ${Math.round(ageH)}h ago (Mercato pilot, not IFS JDBC).`,
      entityType: 'ifs_silver',
      entityId: wm.entityName,
      detectedAt: wm.lastSuccessAt.toISOString(),
      ageMinutes: Math.round(ageH * 60),
      drillPath: '/backend/production_planning/genesis',
    })
  }

  const antiFantasy = await runAntiFantasyChecks(em, scope, {
    horizonHours: options?.horizonHours ?? 168,
  })
  for (const v of antiFantasy.violations.slice(0, 10)) {
    exceptions.push({
      id: `anti-fantasy:${v.code}:${v.entityId ?? 'global'}`,
      severity: v.severity,
      category: 'anti_fantasy',
      title: v.title,
      message: v.message,
      entityType: 'schedule',
      entityId: v.entityId ?? v.code,
      detectedAt: antiFantasy.checkedAt,
      ageMinutes: 0,
      drillPath: '/backend/production_planning/schedule',
    })
  }

  for (const job of failedJobs) {
    exceptions.push({
      id: `optimize-failed:${job.id}`,
      severity: 'high',
      category: 'failed_optimize',
      title: 'CP-SAT optimize job failed',
      message: job.message ?? job.solverStatus ?? 'Unknown failure',
      entityType: 'optimize_job',
      entityId: job.id,
      detectedAt: job.updatedAt.toISOString(),
      ageMinutes: ageMinutesFrom(job.updatedAt, now),
      drillPath: '/backend/production_planning/schedule',
    })
  }

  const severityRank: Record<ExceptionSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  }

  return exceptions
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.ageMinutes - a.ageMinutes)
    .slice(0, limit)
}
