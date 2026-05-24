import type { EntityManager } from '@mikro-orm/postgresql'
import { createWorkOrdersFromSalesOrder } from '../work-orders-from-sales'

jest.mock('../sales-order-context', () => ({
  loadSalesOrderContext: jest.fn(),
}))

jest.mock('../work-orders', () => ({
  createWorkOrder: jest.fn(),
}))

import { loadSalesOrderContext } from '../sales-order-context'
import { createWorkOrder } from '../work-orders'

const loadSalesOrderContextMock = loadSalesOrderContext as jest.MockedFunction<typeof loadSalesOrderContext>
const createWorkOrderMock = createWorkOrder as jest.MockedFunction<typeof createWorkOrder>

describe('createWorkOrdersFromSalesOrder', () => {
  const scope = { tenantId: 't1', organizationId: 'o1' }

  beforeEach(() => {
    jest.clearAllMocks()
    loadSalesOrderContextMock.mockResolvedValue({
      found: true,
      salesOrderId: 'so-1',
      orderNumber: 'SO-100',
      status: 'open',
      fulfillmentStatus: null,
      lines: [
        {
          lineId: 'line-1',
          lineNumber: 1,
          productCode: 'SKU-A',
          quantity: 2,
          name: 'Product A',
        },
      ],
    })
    createWorkOrderMock.mockResolvedValue({
      id: 'wo-1',
      orderNumber: 'WO-1',
      productCode: 'SKU-A',
      quantity: 2,
      status: 'draft',
      dealId: null,
      salesOrderId: 'so-1',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  it('creates work orders from sales order lines', async () => {
    const em = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager

    const result = await createWorkOrdersFromSalesOrder(em, scope, 'so-1')

    expect(result.workOrders).toHaveLength(1)
    expect(createWorkOrderMock).toHaveBeenCalledWith(
      em,
      scope,
      expect.objectContaining({
        salesOrderId: 'so-1',
        productCode: 'SKU-A',
        quantity: 2,
      }),
    )
  })
})
