import {
  computeWorkCenterFloors,
  mergeChunkScheduleWithFloors,
  mergeChunkSchedules,
  partitionProductionOrderChunks,
  shouldRunCpsatAsync,
} from '../cpsat-chunking'

describe('cpsat-chunking', () => {
  const planningStart = new Date('2026-05-24T08:00:00.000Z')

  it('partitions orders without splitting', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const chunks = partitionProductionOrderChunks(ids, 2)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]?.productionOrderIds).toEqual(['a', 'b'])
    expect(chunks[2]?.productionOrderIds).toEqual(['e'])
  })

  it('shifts later chunk away from occupied work centers', () => {
    const prior = [
      {
        operationId: 'op-1',
        workCenterCode: 'WC-A',
        plannedStartAt: '2026-05-24T08:00:00.000Z',
        plannedEndAt: '2026-05-24T10:00:00.000Z',
      },
    ]
    const floors = computeWorkCenterFloors(prior, planningStart)
    const next = mergeChunkScheduleWithFloors(
      [
        {
          operationId: 'op-2',
          workCenterCode: 'WC-A',
          plannedStartAt: '2026-05-24T08:30:00.000Z',
          plannedEndAt: '2026-05-24T09:30:00.000Z',
        },
      ],
      planningStart,
      floors,
    )
    expect(next[0]?.plannedStartAt).toBe('2026-05-24T10:00:00.000Z')
    expect(next[0]?.plannedEndAt).toBe('2026-05-24T11:00:00.000Z')
  })

  it('auto mode threshold', () => {
    expect(shouldRunCpsatAsync(10, 'auto')).toBe(false)
    expect(shouldRunCpsatAsync(20, 'auto')).toBe(true)
    expect(shouldRunCpsatAsync(100, 'sync')).toBe(false)
  })

  it('merges multiple chunk schedules sequentially', () => {
    const merged = mergeChunkSchedules(
      [
        [
          {
            operationId: '1',
            workCenterCode: 'WC-A',
            plannedStartAt: '2026-05-24T08:00:00.000Z',
            plannedEndAt: '2026-05-24T09:00:00.000Z',
          },
        ],
        [
          {
            operationId: '2',
            workCenterCode: 'WC-A',
            plannedStartAt: '2026-05-24T08:00:00.000Z',
            plannedEndAt: '2026-05-24T08:30:00.000Z',
          },
        ],
      ],
      planningStart,
    )
    expect(merged).toHaveLength(2)
    expect(merged[1]?.plannedStartAt).toBe('2026-05-24T09:00:00.000Z')
  })
})
