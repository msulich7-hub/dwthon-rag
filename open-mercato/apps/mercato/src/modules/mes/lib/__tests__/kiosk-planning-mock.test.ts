import {
  applyMockConfirmation,
  getNowOperation,
  getPlannedOperationsForNest,
  resolveNestCode,
} from '../kiosk-planning-mock'

describe('kiosk-planning-mock', () => {
  it('returns operations sorted by sequence per nest', () => {
    const ops = getPlannedOperationsForNest('WC-ASSY-01')
    expect(ops.length).toBeGreaterThan(1)
    for (let i = 1; i < ops.length; i++) {
      expect(ops[i]!.sequence).toBeGreaterThanOrEqual(ops[i - 1]!.sequence)
    }
    expect(ops.every((o) => o.routingReleased && o.planBatchId.startsWith('PLAN-'))).toBe(true)
  })

  it('resolves nest from URL or default', () => {
    expect(resolveNestCode('WC-PACK-03')).toBe('WC-PACK-03')
    expect(resolveNestCode('INVALID')).toBe('WC-ASSY-01')
  })

  it('picks in_progress before ready as now', () => {
    const ops = getPlannedOperationsForNest('WC-ASSY-01')
    const now = getNowOperation(ops)
    expect(now?.status).toBe('in_progress')
  })

  it('applyMockConfirmation transitions status', () => {
    const ops = getPlannedOperationsForNest('WC-PAINT-02')
    const ready = ops.find((o) => o.status === 'ready')!
    const started = applyMockConfirmation(ops, ready.id, 'start')
    expect(started.find((o) => o.id === ready.id)?.status).toBe('in_progress')
  })
})
