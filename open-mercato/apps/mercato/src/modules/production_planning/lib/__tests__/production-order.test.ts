import type { EntityManager } from '@mikro-orm/postgresql'
import { createProductionOrder, mapProductionOrder } from '../production-order'
import { ProductionPlanningOrder } from '../../data/entities'

jest.mock('../../events', () => ({
  emitProductionPlanningEvent: jest.fn(),
}))

import { emitProductionPlanningEvent } from '../../events'

const emitMock = emitProductionPlanningEvent as jest.MockedFunction<typeof emitProductionPlanningEvent>

describe('mapProductionOrder', () => {
  it('maps entity fields to API dto', () => {
    const entity = new ProductionPlanningOrder()
    entity.id = 'order-1'
    entity.code = 'PO-00001'
    entity.title = 'Assembly'
    entity.status = 'planned'
    entity.quantity = 10
    entity.createdAt = new Date('2026-05-01T10:00:00.000Z')
    entity.updatedAt = new Date('2026-05-01T10:00:00.000Z')

    const dto = mapProductionOrder(entity)
    expect(dto.code).toBe('PO-00001')
    expect(dto.quantity).toBe(10)
    expect(dto.isLate).toBe(false)
  })
})

describe('createProductionOrder', () => {
  const scope = { tenantId: 'tenant-1', organizationId: 'org-1' }

  beforeEach(() => {
    emitMock.mockReset()
  })

  it('persists order and emits created event', async () => {
    const persisted: ProductionPlanningOrder[] = []
    const em = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((_cls: unknown, data: Partial<ProductionPlanningOrder>) => {
        const row = Object.assign(new ProductionPlanningOrder(), data, { id: 'new-id' })
        persisted.push(row)
        return row
      }),
      persistAndFlush: jest.fn(async (row: ProductionPlanningOrder) => {
        persisted.push(row)
      }),
    } as unknown as EntityManager

    const dto = await createProductionOrder(em, scope, {
      title: 'Line 1 batch',
      salesOrderId: 'sales-1',
      quantity: 5,
    })

    expect(dto.title).toBe('Line 1 batch')
    expect(dto.code).toMatch(/^PO-/)
    expect(emitMock).toHaveBeenCalledWith(
      'production_planning.order.created',
      expect.objectContaining({ orderId: 'new-id', salesOrderId: 'sales-1' }),
      { persistent: true },
    )
  })
})
