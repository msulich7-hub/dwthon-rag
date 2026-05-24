import {
  getCrmPerspectiveTableId,
  getCustomersListPerspectiveTableId,
  mirrorPerspectiveName,
  parseCrmPerspectiveEntity,
} from '../perspective-bridge'

describe('perspective-bridge', () => {
  it('maps CRM entities to table ids', () => {
    expect(getCrmPerspectiveTableId('deals')).toBe('crm_2027.deals')
    expect(getCustomersListPerspectiveTableId('deals')).toBe('customers.deals.list')
  })

  it('prefixes mirror names', () => {
    expect(mirrorPerspectiveName('Pipeline')).toBe('CRM 2027: Pipeline')
  })

  it('parses entity keys', () => {
    expect(parseCrmPerspectiveEntity('people')).toBe('people')
    expect(parseCrmPerspectiveEntity('invalid')).toBeNull()
  })
})
