import { getWorkOrder } from '../work-orders'

describe('getWorkOrder', () => {
  it('returns null when work order is missing', async () => {
    const em = {
      findOne: jest.fn().mockResolvedValue(null),
    }
    const result = await getWorkOrder(em as never, { tenantId: 't1', organizationId: 'o1' }, 'wo-1')
    expect(result).toBeNull()
  })
})
