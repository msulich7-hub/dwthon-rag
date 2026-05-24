import type { EntityManager } from '@mikro-orm/postgresql'
import { createWorkOrder } from '../work-orders'

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findWithDecryption: jest.fn(),
}))

jest.mock('../../events', () => ({
  emitMesEvent: jest.fn(),
}))

import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { emitMesEvent } from '../../events'

const findWithDecryptionMock = findWithDecryption as jest.MockedFunction<typeof findWithDecryption>
const emitMesEventMock = emitMesEvent as jest.MockedFunction<typeof emitMesEvent>

describe('createWorkOrder', () => {
  const scope = { tenantId: 'tenant-1', organizationId: 'org-1' }

  beforeEach(() => {
    jest.clearAllMocks()
    findWithDecryptionMock.mockResolvedValue([{ id: 'deal-1' }] as never)
  })

  it('persists a work order and emits created event', async () => {
    const persistAndFlush = jest.fn().mockResolvedValue(undefined)
    const created: Record<string, unknown> = {
      id: 'wo-1',
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      orderNumber: 'WO-TEST',
      productCode: 'SKU-1',
      quantity: 10,
      status: 'draft',
      dealId: 'deal-1',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const em = {
      create: jest.fn((_entity, data) => ({ ...created, ...data })),
      persistAndFlush,
    } as unknown as EntityManager

    const dto = await createWorkOrder(em, scope, {
      productCode: 'SKU-1',
      quantity: 10,
      dealId: 'deal-1',
    })

    expect(dto.productCode).toBe('SKU-1')
    expect(persistAndFlush).toHaveBeenCalled()
    expect(emitMesEventMock).toHaveBeenCalledWith(
      'mes.work_order.created',
      expect.objectContaining({ workOrderId: 'wo-1' }),
    )
  })

  it('rejects missing deals', async () => {
    findWithDecryptionMock.mockResolvedValue([] as never)
    const em = {
      create: jest.fn(),
      persistAndFlush: jest.fn(),
    } as unknown as EntityManager

    await expect(
      createWorkOrder(em, scope, {
        productCode: 'SKU-1',
        quantity: 1,
        dealId: 'missing-deal',
      }),
    ).rejects.toThrow('DEAL_NOT_FOUND')
  })
})
