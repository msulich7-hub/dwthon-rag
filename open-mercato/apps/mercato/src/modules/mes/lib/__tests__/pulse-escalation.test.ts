import { buildPulseEscalation } from '../pulse-escalation'
import type { PulseSnapshot } from '../pulse-snapshot'

function baseSnapshot(overrides: Partial<PulseSnapshot> = {}): PulseSnapshot {
  return {
    dashboard: { total: 10, active: 2, completed: 8, byStatus: {} },
    queue: { ready: 0, inProgress: 0, total: 2 },
    workCenters: [],
    andon: 'green',
    escalationLevel: 0,
    alerts: [],
    trend: [],
    quality: {
      activeHolds: 0,
      activeDowntime: 0,
      checklistFailedToday: 0,
      checklistTotalToday: 0,
    },
    oee: {
      availabilityPct: 100,
      performancePct: 100,
      qualityPct: 100,
      oeePct: 100,
    },
    generatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildPulseEscalation', () => {
  it('returns green with no alerts when queue is healthy', () => {
    const result = buildPulseEscalation(baseSnapshot())
    expect(result.andon).toBe('green')
    expect(result.escalationLevel).toBe(0)
    expect(result.alerts).toHaveLength(0)
  })

  it('escalates to critical when ready queue exceeds threshold', () => {
    const result = buildPulseEscalation(
      baseSnapshot({ queue: { ready: 20, inProgress: 0, total: 20 } }),
    )
    expect(result.andon).toBe('red')
    expect(result.escalationLevel).toBe(3)
    expect(result.alerts.some((a) => a.code === 'QUEUE_READY_CRITICAL')).toBe(true)
  })
})
