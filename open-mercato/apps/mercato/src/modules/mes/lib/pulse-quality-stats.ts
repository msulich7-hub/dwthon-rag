import type { EntityManager } from '@mikro-orm/postgresql'
import { MesOperationConfirmation } from '../data/entities'
import { countFailedChecklistRunsToday } from './checklist-runs'
import { countActiveDowntime } from './downtime'
import { countActiveHolds } from './quality-holds'

export type MesScope = { tenantId: string; organizationId: string }

export type PulseQualityStats = {
  activeHolds: number
  activeDowntime: number
  checklistFailedToday: number
  checklistTotalToday: number
  goodQtyToday: number
  scrapQtyToday: number
}

export async function buildPulseQualityStats(
  em: EntityManager,
  scope: MesScope,
): Promise<PulseQualityStats> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const confirmations = await em.find(MesOperationConfirmation, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    confirmedAt: { $gte: start },
  })

  let goodQtyToday = 0
  let scrapQtyToday = 0
  for (const row of confirmations) {
    goodQtyToday += row.goodQty
    scrapQtyToday += row.scrapQty
  }

  const [activeHolds, activeDowntime, checklist] = await Promise.all([
    countActiveHolds(em, scope),
    countActiveDowntime(em, scope),
    countFailedChecklistRunsToday(em, scope),
  ])

  return {
    activeHolds,
    activeDowntime,
    checklistFailedToday: checklist.failed,
    checklistTotalToday: checklist.total,
    goodQtyToday,
    scrapQtyToday,
  }
}
