import { buildTicketSummary } from '../ticket-summary'
import type { TicketDetail } from '../tickets'

function minimalTicket(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: 't1',
    ticketKey: 'HD-0001',
    subject: 'VPN issue',
    description: 'Cannot connect from home office.',
    status: 'open',
    priority: 'high',
    visibility: 'internal',
    teamQueue: 'it',
    assigneeUserId: null,
    reporterName: 'Jan Kowalski',
    reporterEmail: null,
    slaDueAt: '2026-05-24T12:00:00.000Z',
    comments: [{ id: 'c1', body: 'Hi', isInternal: false, authorUserId: null, createdAt: '2026-05-23T10:00:00.000Z' }],
    triage: null,
    source: 'manual',
    createdAt: '2026-05-23T09:00:00.000Z',
    updatedAt: '2026-05-23T10:00:00.000Z',
    ...overrides,
  } as TicketDetail
}

describe('buildTicketSummary', () => {
  it('uses subject as headline', () => {
    const s = buildTicketSummary(minimalTicket())
    expect(s.headline).toBe('VPN issue')
    expect(s.bullets.some((b) => b.includes('HD-0001'))).toBe(true)
  })

  it('suggests assign when unassigned', () => {
    const s = buildTicketSummary(minimalTicket({ assigneeUserId: null }))
    expect(s.suggestedNextSteps).toContain('Assign an agent')
  })

  it('suggests billing KB for billing category', () => {
    const s = buildTicketSummary(
      minimalTicket({
        triage: { category: 'billing', priority: 'medium', labels: [], summary: 'billing' },
      }),
    )
    expect(s.suggestedNextSteps).toContain('Check billing KB articles')
  })

  it('counts public and internal comments', () => {
    const s = buildTicketSummary(
      minimalTicket({
        comments: [
          { id: 'c1', body: 'a', isInternal: false, authorUserId: null, createdAt: '2026-05-23T10:00:00.000Z' },
          { id: 'c2', body: 'b', isInternal: true, authorUserId: null, createdAt: '2026-05-23T10:00:00.000Z' },
        ],
      }),
    )
    expect(s.bullets.some((b) => b.includes('1 public') && b.includes('1 internal'))).toBe(true)
  })
})
