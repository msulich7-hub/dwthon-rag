import { scheduleEntriesToFixedOperations } from '../warm-start-from-scenario'

describe('warm-start-from-scenario', () => {
  it('filters fixed operations to scope', () => {
    const fixed = scheduleEntriesToFixedOperations(
      [
        {
          operationId: 'op-1',
          workCenterCode: 'WC-A',
          plannedStartAt: '2026-05-24T08:00:00.000Z',
          plannedEndAt: '2026-05-24T09:00:00.000Z',
        },
        {
          operationId: 'op-2',
          workCenterCode: 'WC-B',
          plannedStartAt: '2026-05-24T10:00:00.000Z',
          plannedEndAt: '2026-05-24T11:00:00.000Z',
        },
      ],
      new Set(['op-1']),
    )
    expect(fixed).toHaveLength(1)
    expect(fixed[0]?.operationId).toBe('op-1')
  })
})
