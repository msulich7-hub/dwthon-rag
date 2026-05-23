import type { EntityManager } from '@mikro-orm/postgresql'
import { submitInternalHelpdeskRequest } from '../internal-request'

jest.mock('../ticket-key', () => ({
  allocateTicketKey: jest.fn().mockResolvedValue('HD-0007'),
}))

describe('submitInternalHelpdeskRequest', () => {
  const scope = { tenantId: 'tenant-1', organizationId: 'org-1' }

  it('creates an internal staff request', async () => {
    const now = new Date()
    const record = {
      id: 'ticket-int-1',
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      ticketKey: 'HD-0007',
      subject: 'VPN broken',
      description: 'Cannot connect after password change.',
      status: 'open',
      priority: 'medium',
      category: 'access',
      source: 'manual',
      visibility: 'internal',
      requesterType: 'staff',
      teamQueue: 'it',
      requesterUserId: 'user-42',
      reporterEmail: null,
      reporterName: null,
      assigneeUserId: null,
      companyId: null,
      personId: null,
      dealId: null,
      triageJson: '{}',
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

    const result = await submitInternalHelpdeskRequest(
      em,
      scope,
      { subject: 'VPN broken', body: 'Cannot connect after password change.', teamQueue: 'it' },
      'user-42',
    )

    expect(result.ticket.visibility).toBe('internal')
    expect(result.ticket.requesterType).toBe('staff')
    expect(result.ticket.teamQueue).toBe('it')
  })
})
