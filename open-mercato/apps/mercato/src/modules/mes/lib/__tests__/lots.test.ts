import { getLotByNumber } from '../lots'

describe('getLotByNumber', () => {
  it('returns null when lot does not exist', async () => {
    const em = { findOne: jest.fn().mockResolvedValue(null) }
    const result = await getLotByNumber(em as never, { tenantId: 't1', organizationId: 'o1' }, 'LOT-1')
    expect(result).toBeNull()
  })
})
