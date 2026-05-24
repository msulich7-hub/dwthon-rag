import { aggregateWorkOrderDashboard } from '../work-order-status'

describe('pulse andon heuristics', () => {
  it('aggregates dashboard counts for pulse KPIs', () => {
    const dashboard = aggregateWorkOrderDashboard([
      'planned',
      'in_progress',
      'completed',
      'completed',
    ])

    expect(dashboard.total).toBe(4)
    expect(dashboard.active).toBe(2)
    expect(dashboard.completed).toBe(2)
  })
})
