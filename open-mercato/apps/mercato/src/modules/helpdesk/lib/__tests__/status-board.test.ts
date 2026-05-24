import { groupTicketsByStatus } from '../status-board'
import type { TicketListItem } from '../tickets'

function ticket(overrides: Partial<TicketListItem>): TicketListItem {
  return {
    id: '1',
    ticketKey: 'HD-0001',
    subject: 'Test',
    status: 'open',
    priority: 'medium',
    category: null,
    source: 'manual',
    visibility: 'internal',
    requesterType: 'staff',
    teamQueue: 'general',
    companyId: null,
    personId: null,
    assigneeUserId: null,
    requesterUserId: null,
    reporterEmail: null,
    reporterName: null,
    triage: null,
    slaDueAt: null,
    firstRespondedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('groupTicketsByStatus', () => {
  it('groups tickets into kanban columns', () => {
    const grouped = groupTicketsByStatus(
      [ticket({ status: 'open' }), ticket({ status: 'in_progress', id: '2', ticketKey: 'HD-2' })],
      false,
    )
    expect(grouped.get('open')).toHaveLength(1)
    expect(grouped.get('in_progress')).toHaveLength(1)
    expect(grouped.has('closed')).toBe(false)
  })
})
