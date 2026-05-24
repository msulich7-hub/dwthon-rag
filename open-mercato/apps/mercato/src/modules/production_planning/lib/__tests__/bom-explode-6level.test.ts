import { explodeBom, maxExplodedLevel } from '../mrp/explode'
import { resolveVariantTree } from '../mrp/resolve-variant-tree'
import { estimateChaosPremium } from '../hindsight/chaos-premium'

describe('6-level Mercato BOM', () => {
  it('resolves variant for finished product', () => {
    const v = resolveVariantTree({ productSku: 'PRODUCT-ABC', quantity: 1 })
    expect(v.status).toBe('resolved')
    expect(v.routingSteps.length).toBeGreaterThan(0)
  })

  it('explodes to multiple levels for PRODUCT-* sku', () => {
    const lines = explodeBom({ rootSku: 'PRODUCT-TEST', quantity: 2, maxDepth: 6 })
    expect(lines.length).toBeGreaterThan(3)
    expect(maxExplodedLevel(lines)).toBeGreaterThanOrEqual(2)
  })
})

describe('chaos premium', () => {
  it('increases when scenario is worse than baseline', () => {
    const baseline = {
      operationCount: 100,
      lateOrderCount: 2,
      maxLatenessMinutes: 30,
      avgLatenessMinutes: 15,
      workCenterCount: 10,
      objectiveValue: 100,
      solverStatus: 'optimal',
      computedAt: new Date().toISOString(),
    }
    const worse = { ...baseline, lateOrderCount: 8, maxLatenessMinutes: 180 }
    const est = estimateChaosPremium(baseline, worse)
    expect(est.chaosPremiumPln).toBeGreaterThan(0)
    expect(est.extraLateOrders).toBe(6)
  })
})
