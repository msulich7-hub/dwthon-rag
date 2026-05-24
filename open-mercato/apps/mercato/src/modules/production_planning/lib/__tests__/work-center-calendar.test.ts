import {
  computeCalendarUtilizationPct,
  effectiveCapacityMinutes,
  resolveWorkCenterCalendar,
} from '../capacity/work-center-calendar'

describe('work-center-calendar', () => {
  it('resolves ASM pattern to 2-shift calendar', () => {
    const cal = resolveWorkCenterCalendar('WC-ASM-01')
    expect(cal.id).toBe('cal-2shift-asm')
    expect(cal.shiftsPerDay).toBe(2)
  })

  it('effective capacity is lower than 24/7 naive capacity', () => {
    const start = new Date('2026-05-26T08:00:00.000Z')
    const calCap = effectiveCapacityMinutes('WC-ASM-01', 168, start)
    const naive = 168 * 60
    expect(calCap).toBeLessThan(naive)
    expect(calCap).toBeGreaterThan(0)
  })

  it('utilization respects calendar capacity', () => {
    const pct = computeCalendarUtilizationPct(1000, 'WC-ASM-01', 168, new Date('2026-05-26T08:00:00.000Z'))
    expect(pct).toBeGreaterThan(0)
    expect(pct).toBeLessThanOrEqual(100)
  })
})
