import type { EntityManager } from '@mikro-orm/postgresql'
import { applyCpsatSchedule } from '../apply-cpsat-schedule'
import { ProductionPlanningOperation } from '../../data/entities'

jest.mock('../../events', () => ({
  emitProductionPlanningEvent: jest.fn(),
}))

describe('applyCpsatSchedule', () => {
  const scope = { tenantId: 'tenant-1', organizationId: 'org-1' }

  it('updates operation planned times', async () => {
    const op = new ProductionPlanningOperation()
    op.id = 'op-1'
    op.productionOrderId = 'order-1'
    op.status = 'pending'
    op.tenantId = scope.tenantId
    op.organizationId = scope.organizationId

    const em = {
      findOne: jest.fn(async (_cls: unknown, where: { id?: string }) => {
        if (where.id === 'op-1') return op
        if (where.id === 'order-1') {
          return { id: 'order-1', status: 'draft', tenantId: scope.tenantId, organizationId: scope.organizationId }
        }
        return null
      }),
      find: jest.fn(async () => [op]),
      flush: jest.fn(),
    } as unknown as EntityManager

    const result = await applyCpsatSchedule(
      em,
      scope,
      [
        {
          operationId: 'op-1',
          workCenterCode: 'MILL',
          plannedStartAt: '2026-05-26T08:00:00.000Z',
          plannedEndAt: '2026-05-26T09:00:00.000Z',
        },
      ],
      { jobId: 'job-1' },
    )

    expect(result.applied).toBe(1)
    expect(op.plannedStartAt?.toISOString()).toBe('2026-05-26T08:00:00.000Z')
    expect(op.status).toBe('planned')
  })
})
