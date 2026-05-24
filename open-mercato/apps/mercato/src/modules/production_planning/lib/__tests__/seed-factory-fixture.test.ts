import {
  buildFactorySeedPlan,
  buildWorkCenterCodes,
  countFactorySeedOperations,
  countPeggedOrders,
  FACTORY_ORDER_CODE_PREFIX,
  FACTORY_SEED_PRESETS,
} from '../seed-factory-fixture'
import { stableUuidFromString } from '../stable-uuid'

const SCOPE = {
  tenantId: '00000000-0000-4000-8000-000000000001',
  organizationId: '00000000-0000-4000-8000-000000000002',
}

describe('seed-factory-fixture', () => {
  it('builds deterministic plans for the same scope and preset', () => {
    const a = buildFactorySeedPlan(SCOPE, 'small')
    const b = buildFactorySeedPlan(SCOPE, 'small')
    expect(a.orders.map((o) => o.id)).toEqual(b.orders.map((o) => o.id))
    expect(a.orders[0]?.operations[0]?.id).toBe(b.orders[0]?.operations[0]?.id)
  })

  it('small preset has ~20 orders and 3–5 operations each', () => {
    const plan = buildFactorySeedPlan(SCOPE, 'small')
    expect(plan.orders).toHaveLength(FACTORY_SEED_PRESETS.small.orderCount)
    for (const order of plan.orders) {
      expect(order.operations.length).toBeGreaterThanOrEqual(3)
      expect(order.operations.length).toBeLessThanOrEqual(5)
      expect(order.code.startsWith(FACTORY_ORDER_CODE_PREFIX)).toBe(true)
    }
    expect(countFactorySeedOperations(plan)).toBeGreaterThanOrEqual(60)
  })

  it('benchmark preset targets ~2500 operations and 150 work centers', () => {
    const plan = buildFactorySeedPlan(SCOPE, 'benchmark')
    expect(plan.workCenterCodes).toHaveLength(150)
    const opCount = countFactorySeedOperations(plan)
    expect(opCount).toBeGreaterThanOrEqual(2200)
    expect(opCount).toBeLessThanOrEqual(2800)
  })

  it('pegs ~30% of orders to shared sales orders', () => {
    const plan = buildFactorySeedPlan(SCOPE, 'medium')
    const pegged = countPeggedOrders(plan)
    const expected = Math.round(FACTORY_SEED_PRESETS.medium.orderCount * 0.3)
    expect(pegged).toBe(expected)
    const salesIds = new Set(
      plan.orders.filter((o) => o.salesOrderId).map((o) => o.salesOrderId),
    )
    expect(salesIds.size).toBeGreaterThan(1)
  })

  it('marks pool MO with POOL code prefix', () => {
    const plan = buildFactorySeedPlan(SCOPE, 'small')
    const pool = plan.orders.filter((o) => o.code.includes('POOL-'))
    expect(pool.length).toBe(Math.round(FACTORY_SEED_PRESETS.small.orderCount * 0.1))
  })

  it('stableUuidFromString is deterministic', () => {
    expect(stableUuidFromString('x')).toBe(stableUuidFromString('x'))
    expect(stableUuidFromString('x')).not.toBe(stableUuidFromString('y'))
  })

  it('buildWorkCenterCodes spans departments', () => {
    const codes = buildWorkCenterCodes(16)
    expect(codes).toContain('WC-CUT-01')
    expect(codes).toContain('WC-PAINT-01')
    expect(codes).toHaveLength(16)
  })
})
