import { computeUtilizationPct, isOrderLate } from '../capacity-snapshot'
import { ProductionPlanningOrder } from '../../data/entities'

describe('computeUtilizationPct', () => {
  it('caps utilization at 100%', () => {
    expect(computeUtilizationPct(20_000, 168)).toBe(100)
  })

  it('returns 0 for empty schedule', () => {
    expect(computeUtilizationPct(0, 168)).toBe(0)
  })

  it('computes proportional load', () => {
    expect(computeUtilizationPct(84, 168)).toBe(1)
  })
})

describe('isOrderLate', () => {
  it('flags overdue active orders', () => {
    const order = new ProductionPlanningOrder()
    order.status = 'planned'
    order.dueAt = new Date(Date.now() - 60_000)
    expect(isOrderLate(order)).toBe(true)
  })

  it('ignores completed orders', () => {
    const order = new ProductionPlanningOrder()
    order.status = 'completed'
    order.dueAt = new Date(Date.now() - 60_000)
    expect(isOrderLate(order)).toBe(false)
  })
})
