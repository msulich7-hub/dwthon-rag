import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'
import { ProductionPlanningIfsStagingBatch } from '../../data/entities'
import type { OrgScope } from '../production-order'

export type RecordStagingBatchInput = {
  batchType: 'sales_demand' | 'shop_orders' | 'inventory' | 'pilot_sync'
  rowCount: number
  watermarkAt?: Date
  stats?: Record<string, unknown>
}

export async function recordIfsStagingBatch(
  em: EntityManager,
  scope: OrgScope,
  input: RecordStagingBatchInput,
): Promise<ProductionPlanningIfsStagingBatch> {
  const row = em.create(ProductionPlanningIfsStagingBatch, {
    id: randomUUID(),
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    sourceSystem: process.env.PRODUCTION_PLANNING_IFS_SOURCE ?? 'mercato_pilot',
    batchType: input.batchType,
    status: 'completed',
    rowCount: input.rowCount,
    watermarkAt: input.watermarkAt ?? new Date(),
    statsJson: input.stats ? JSON.stringify(input.stats) : null,
  })
  await em.persistAndFlush(row)
  return row
}
