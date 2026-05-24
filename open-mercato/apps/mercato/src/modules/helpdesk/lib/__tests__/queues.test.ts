import { buildQueueFilter } from '../queues'

describe('buildQueueFilter', () => {
  const scope = { tenantId: 't1', organizationId: 'o1' }

  it('filters customer requests queue', () => {
    const where = buildQueueFilter('customer_requests', scope, null)
    expect(where.visibility).toBe('customer')
  })

  it('filters my work by assignee', () => {
    const where = buildQueueFilter('my_work', scope, 'agent-1')
    expect(where.assigneeUserId).toBe('agent-1')
  })

  it('filters internal staff requests', () => {
    const where = buildQueueFilter('internal', scope, null)
    expect(where.visibility).toBe('internal')
  })
})
