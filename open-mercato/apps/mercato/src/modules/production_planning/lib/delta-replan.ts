import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'
import { applyCpsatSchedule } from './apply-cpsat-schedule'
import { runAntiFantasyChecks } from './anti-fantasy'
import { runCpsatOptimizeJob } from './cpsat-optimize-runner'
import { executeNettingRun } from './mrp/netting-run'
import { listProductionOrders } from './production-order'
import type { OrgScope } from './production-order'

export type DeltaReplanResult = {
  netting: Awaited<ReturnType<typeof executeNettingRun>>
  optimize?: {
    status: string
    applied: number
    wallMs: number
  }
  antiFantasy: Awaited<ReturnType<typeof runAntiFantasyChecks>>
  wallMs: number
}

/**
 * Concurrent replan slice: incremental netting + optional CP-SAT apply (Mercato data only).
 */
export async function runDeltaReplan(
  em: EntityManager,
  scope: OrgScope,
  options?: { runOptimize?: boolean; horizonHours?: number },
): Promise<DeltaReplanResult> {
  const started = Date.now()
  const netting = await executeNettingRun(em, scope, { mode: 'incremental' })

  let optimize: DeltaReplanResult['optimize']
  if (options?.runOptimize !== false) {
    const orders = await listProductionOrders(em, scope, { limit: 500 })
    const orderIds = orders.map((o) => o.id).slice(0, 100)
    const jobId = randomUUID()
    const result = await runCpsatOptimizeJob(em, scope, {
      jobId,
      productionOrderIds: orderIds,
      horizonHours: options?.horizonHours ?? 168,
      objective: 'minimize_lateness',
      applySync: true,
    })
    optimize = {
      status: result.optimization.status,
      applied: result.apply?.applied ?? 0,
      wallMs: result.optimization.wallMs ?? 0,
    }
  }

  const antiFantasy = await runAntiFantasyChecks(em, scope, {
    horizonHours: options?.horizonHours,
  })

  return {
    netting,
    optimize,
    antiFantasy,
    wallMs: Date.now() - started,
  }
}
