import { computeNetRequirements } from '../mrp/net-requirements'
import type { ExplodedLine } from '../mrp/explode'

describe('computeNetRequirements', () => {
  it('reduces gross by mercato supply', () => {
    const exploded: ExplodedLine[] = [
      {
        nodeKey: 'root',
        level: 0,
        parentNodeKey: null,
        productSku: 'SKU-A',
        extendedQty: 10,
        nodeType: 'make',
      },
    ]
    const supply = new Map([
      [
        'SKU-A',
        {
          productSku: 'SKU-A',
          onHandQty: 0,
          wipQty: 3,
          scheduledReceiptQty: 0,
          source: 'mercato_derived' as const,
        },
      ],
    ])
    const net = computeNetRequirements(exploded, supply)
    expect(net[0]?.netQty).toBe(7)
    expect(net[0]?.supplyQty).toBe(3)
  })
})
