import { computeOeeLite } from '../oee-lite'

describe('computeOeeLite', () => {
  it('returns high OEE when plant is healthy', () => {
    const result = computeOeeLite({
      queueReady: 2,
      queueInProgress: 8,
      activeDowntimeCount: 0,
      workCenterCount: 3,
      checklistFailed: 0,
      checklistTotal: 5,
      scrapQtyToday: 0,
      goodQtyToday: 100,
    })
    expect(result.oeePct).toBeGreaterThan(50)
    expect(result.availabilityPct).toBe(100)
  })

  it('lowers OEE when downtime and scrap are high', () => {
    const result = computeOeeLite({
      queueReady: 10,
      queueInProgress: 0,
      activeDowntimeCount: 3,
      workCenterCount: 3,
      checklistFailed: 2,
      checklistTotal: 4,
      scrapQtyToday: 50,
      goodQtyToday: 50,
    })
    expect(result.oeePct).toBeLessThan(50)
  })
})
