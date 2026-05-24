import { isPoolNettingOrderCode } from '../ifs/extract-pilot'
import { FACTORY_ORDER_CODE_PREFIX } from '../seed-factory-fixture'

describe('isPoolNettingOrderCode', () => {
  it('detects pool MO from netting', () => {
    expect(isPoolNettingOrderCode(`${FACTORY_ORDER_CODE_PREFIX}POOL-NET-SKU1-W12`)).toBe(true)
  })

  it('allows regular factory orders', () => {
    expect(isPoolNettingOrderCode(`${FACTORY_ORDER_CODE_PREFIX}00042`)).toBe(false)
  })
})
