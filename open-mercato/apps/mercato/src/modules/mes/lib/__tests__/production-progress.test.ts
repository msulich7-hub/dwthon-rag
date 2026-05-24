import { aggregateProductionProgressForWorkOrders } from '../production-progress'

describe('aggregateProductionProgressForWorkOrders', () => {
  it('returns zero progress for empty work order list', async () => {
    const em = {} as never
    const progress = await aggregateProductionProgressForWorkOrders(
      em,
      { tenantId: 't1', organizationId: 'o1' },
      [],
    )

    expect(progress).toEqual({
      workOrderCount: 0,
      totalOperations: 0,
      completedOperations: 0,
      inProgressOperations: 0,
      percentComplete: 0,
    })
  })
})
