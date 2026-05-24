import type { EntityManager } from '@mikro-orm/postgresql'
import { confirmWorkOrderOperation } from '../operation-confirmations'

jest.mock('../../events', () => ({
  emitMesEvent: jest.fn(),
}))

jest.mock('../work-order-operations', () => ({
  promoteNextOperation: jest.fn(),
  allOperationsCompleted: jest.fn().mockResolvedValue(true),
}))

jest.mock('../work-orders', () => ({
  updateWorkOrderStatus: jest.fn(),
}))

jest.mock('../production-output', () => ({
  recordProductionOutput: jest.fn().mockResolvedValue(null),
}))

import { emitMesEvent } from '../../events'
import { updateWorkOrderStatus } from '../work-orders'

const emitMesEventMock = emitMesEvent as jest.MockedFunction<typeof emitMesEvent>
const updateWorkOrderStatusMock = updateWorkOrderStatus as jest.MockedFunction<
  typeof updateWorkOrderStatus
>

describe('confirmWorkOrderOperation', () => {
  const scope = { tenantId: 't1', organizationId: 'o1' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('starts a ready operation', async () => {
    const operation = {
      id: 'op-1',
      workOrderId: 'wo-1',
      sequence: 10,
      status: 'ready',
      plannedQty: 5,
      completedQty: 0,
      scrapQty: 0,
      startedAt: null as Date | null,
      completedAt: null as Date | null,
    }
    const workOrder = { id: 'wo-1', status: 'planned' }

    const em = {
      findOne: jest.fn(async (entity: unknown, where: Record<string, unknown>) => {
        if (where.id === 'op-1') return operation
        if (where.id === 'wo-1') return workOrder
        return null
      }),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((_entity, data) => ({ id: 'conf-1', ...data, confirmedAt: new Date() })),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager

    const result = await confirmWorkOrderOperation(
      em,
      scope,
      'wo-1',
      'op-1',
      { confirmationType: 'start' },
      'user-1',
    )

    expect(result.operation.status).toBe('in_progress')
    expect(workOrder.status).toBe('in_progress')
    expect(emitMesEventMock).toHaveBeenCalledWith('mes.operation.confirmed', expect.any(Object))
  })
})
