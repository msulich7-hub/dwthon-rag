import type { EntityManager } from '@mikro-orm/postgresql'
import { ingestHelpdeskTicket } from '../ingest-ticket'

jest.mock('../customer-context', () => ({
  assertCustomerLink: jest.fn(),
}))

jest.mock('../ticket-key', () => ({
  allocateTicketKey: jest.fn().mockResolvedValue('HD-0042'),
}))

describe('ingestHelpdeskTicket', () => {
  const scope = { tenantId: 'tenant-1', organizationId: 'org-1' }

  it('creates a ticket with triage defaults', async () => {
    const now = new Date('2026-05-23T12:00:00.000Z')
    const record = {
      id: 'ticket-1',
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      ticketKey: 'HD-0042',
      subject: 'Cannot login',
      description: 'Password reset link expired and I need access urgently.',
      status: 'open',
      priority: 'urgent',
      category: 'access',
      source: 'email',
      reporterEmail: 'user@example.com',
      reporterName: null,
      assigneeUserId: null,
      companyId: null,
      personId: null,
      dealId: null,
      triageJson: JSON.stringify({ priority: 'urgent', category: 'access', labels: [], summary: 'x' }),
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const em = {
      create: jest.fn((_entity, data) => ({ ...record, ...data })),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(record),
      find: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager

    const result = await ingestHelpdeskTicket(em, scope, {
      subject: 'Cannot login',
      body: 'Password reset link expired and I need access urgently.',
      source: 'email',
      reporterEmail: 'user@example.com',
    })

    expect(result.created).toBe(true)
    expect(result.ticket.ticketKey).toBe('HD-0042')
    expect(result.ticket.subject).toBe('Cannot login')
    expect(em.flush).toHaveBeenCalled()
  })
})
