import {
  aggregateWorkOrderDashboard,
  canTransitionWorkOrderStatus,
} from '../work-order-status'

describe('canTransitionWorkOrderStatus', () => {
  it('allows draft to planned', () => {
    expect(canTransitionWorkOrderStatus('draft', 'planned')).toBe(true)
  })

  it('blocks completed to in_progress', () => {
    expect(canTransitionWorkOrderStatus('completed', 'in_progress')).toBe(false)
  })

  it('allows same status', () => {
    expect(canTransitionWorkOrderStatus('in_progress', 'in_progress')).toBe(true)
  })
})

describe('aggregateWorkOrderDashboard', () => {
  it('counts active and completed work orders', () => {
    const result = aggregateWorkOrderDashboard([
      'draft',
      'planned',
      'in_progress',
      'completed',
      'completed',
      'cancelled',
    ])

    expect(result.total).toBe(6)
    expect(result.active).toBe(2)
    expect(result.completed).toBe(2)
    expect(result.byStatus.planned).toBe(1)
    expect(result.byStatus.cancelled).toBe(1)
  })
})
