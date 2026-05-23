import { scanNewSlaBreaches } from '../sla-breach-scan'

describe('scanNewSlaBreaches', () => {
  it('returns empty when em finds no candidates', async () => {
    const em = {
      find: jest.fn().mockResolvedValue([]),
    }
    const alerts = await scanNewSlaBreaches(
      em as never,
      { tenantId: 't1', organizationId: 'o1' },
      new Date('2026-05-23T18:00:00.000Z'),
    )
    expect(alerts).toEqual([])
  })

  it('includes breached open tickets not yet notified', async () => {
    const em = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'ticket-1',
          ticketKey: 'HD-0009',
          subject: 'VPN down',
          assigneeUserId: null,
          slaDueAt: new Date('2026-05-23T10:00:00.000Z'),
          slaBreachNotifiedAt: null,
          status: 'open',
        },
      ]),
    }
    const alerts = await scanNewSlaBreaches(
      em as never,
      { tenantId: 't1', organizationId: 'o1' },
      new Date('2026-05-23T18:00:00.000Z'),
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.ticketKey).toBe('HD-0009')
  })
})
