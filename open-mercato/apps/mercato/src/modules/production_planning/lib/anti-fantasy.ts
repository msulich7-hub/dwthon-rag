import type { EntityManager } from '@mikro-orm/postgresql'
import { ProductionPlanningOperation } from '../data/entities'
import { buildCapacitySnapshot } from './capacity-snapshot'
import type { OrgScope } from '../production-order'

export type AntiFantasyCode = 'AF-01' | 'AF-02' | 'AF-03'

export type AntiFantasyViolation = {
  code: AntiFantasyCode
  severity: 'critical' | 'high'
  title: string
  message: string
  entityId?: string
}

export type AntiFantasyReport = {
  passed: boolean
  violationCount: number
  violations: AntiFantasyViolation[]
  checkedAt: string
}

/**
 * Schedule sanity checks without external actuals (Mercato plan only).
 */
export async function runAntiFantasyChecks(
  em: EntityManager,
  scope: OrgScope,
  options?: { horizonHours?: number },
): Promise<AntiFantasyReport> {
  const horizonHours = options?.horizonHours ?? 168
  const violations: AntiFantasyViolation[] = []

  const snapshot = await buildCapacitySnapshot(em, scope, { horizonHours })
  for (const wc of snapshot.workCenters) {
    if (wc.utilizationPct > 100) {
      violations.push({
        code: 'AF-01',
        severity: wc.utilizationPct >= 150 ? 'critical' : 'high',
        title: `Capacity fantasy: ${wc.workCenterCode}`,
        message: `${wc.utilizationPct}% load exceeds 100% finite capacity.`,
        entityId: wc.workCenterCode,
      })
    }
  }

  const operations = await em.find(ProductionPlanningOperation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: { $nin: ['completed', 'cancelled'] },
    plannedStartAt: { $ne: null },
    plannedEndAt: { $ne: null },
  })

  const byWc = new Map<string, typeof operations>()
  for (const op of operations) {
    const list = byWc.get(op.workCenterCode) ?? []
    list.push(op)
    byWc.set(op.workCenterCode, list)
  }

  for (const [wc, ops] of byWc) {
    const sorted = ops
      .filter((o) => o.plannedStartAt && o.plannedEndAt)
      .sort((a, b) => a.plannedStartAt!.getTime() - b.plannedStartAt!.getTime())
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!
      const cur = sorted[i]!
      if (cur.plannedStartAt! < prev.plannedEndAt!) {
        violations.push({
          code: 'AF-02',
          severity: 'high',
          title: `Overlapping ops on ${wc}`,
          message: `Op ${cur.id.slice(0, 8)} starts before previous ends (finite WC violation).`,
          entityId: cur.id,
        })
        break
      }
    }
  }

  const unscheduled = await em.count(ProductionPlanningOperation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    status: 'pending',
    plannedStartAt: null,
  })
  const openOrders = snapshot.openOrders
  if (openOrders > 10 && unscheduled > openOrders * 5) {
    violations.push({
      code: 'AF-03',
      severity: 'high',
      title: 'Unscheduled operation backlog',
      message: `${unscheduled} pending ops without planned times vs ${openOrders} open MO.`,
    })
  }

  return {
    passed: violations.filter((v) => v.severity === 'critical').length === 0,
    violationCount: violations.length,
    violations,
    checkedAt: new Date().toISOString(),
  }
}
