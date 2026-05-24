import { explodeBom } from '../mrp/explode'
import { poolGroupKey, weekBucketKey } from '../mrp/time-buckets'
import { applyScenarioPayloadOverrides } from '../what-if-payload-overrides'
import type { PayloadOrder } from '../cpsat-chunking'

describe('mrp explode', () => {
  it('explodes root and buy components', () => {
    const lines = explodeBom({ rootSku: 'SKU-1', quantity: 2 })
    expect(lines[0]?.nodeType).toBe('make')
    expect(lines.filter((l) => l.level === 1).length).toBeGreaterThan(0)
  })

  it('explodes PRODUCT-* to deeper Mercato catalog chain', () => {
    const lines = explodeBom({ rootSku: 'PRODUCT-X', quantity: 1, maxDepth: 6 })
    expect(lines.length).toBeGreaterThan(2)
  })

  it('pool group key uses sku and week', () => {
    const due = new Date('2026-05-26T12:00:00.000Z')
    expect(poolGroupKey('SKU-A', due)).toContain('SKU-A')
    expect(weekBucketKey(due)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('what-if-payload-overrides', () => {
  const baseOrder: PayloadOrder = {
    id: 'o1',
    code: 'MO-1',
    title: 't',
    salesOrderId: null,
    productSku: 'SKU',
    quantity: 1,
    status: 'planned',
    workCenterCode: 'WC-CUT-01',
    plannedStartAt: null,
    plannedEndAt: null,
    dueAt: '2026-06-01T00:00:00.000Z',
    isLate: false,
    operations: [
      {
        id: 'op1',
        productionOrderId: 'o1',
        sequenceNo: 1,
        name: 'cut',
        workCenterCode: 'WC-CUT-01',
        durationMinutes: 60,
        status: 'pending',
        plannedStartAt: null,
        plannedEndAt: null,
      },
    ],
  }

  it('scales durations for OEE multiplier', () => {
    const { orders, notes } = applyScenarioPayloadOverrides([baseOrder], {
      capacity: { oeeMultiplier: 0.9 },
    })
    expect(orders[0]?.operations[0]?.durationMinutes).toBeGreaterThan(60)
    expect(notes.length).toBeGreaterThan(0)
  })
})
