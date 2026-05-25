import {
  applyMockConfirmationWithGates,
  enrichOperations,
  getNowOperationView,
  initialMockOperationsForNest,
  promoteNextAfterComplete,
} from '../kiosk-planning-view-model'
import { getPlannedOperationsForNest, resolveNestCode } from '../kiosk-planning-mock'

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
})

describe('kiosk-planning-view-model', () => {
  it('picks lowest sequence in_progress as now', () => {
    const ops = initialMockOperationsForNest('WC-ASSY-01')
    const views = enrichOperations(ops)
    const now = getNowOperationView(views)
    expect(now?.status).toBe('in_progress')
    expect(now?.sequence).toBe(10)
  })

  it('blocks ready/upcoming when prior step on same WO not completed', () => {
    const ops = initialMockOperationsForNest('WC-ASSY-01')
    const views = enrichOperations(ops)
    const step20 = views.find((o) => o.sequence === 20)
    expect(step20?.displayStatus).toBe('blocked')
    expect(step20?.canStart).toBe(false)
  })

  it('promotes next operation to ready after complete', () => {
    const ops = initialMockOperationsForNest('WC-ASSY-01')
    const completed = ops.map((o) => (o.sequence === 10 ? { ...o, status: 'completed' as const } : o))
    const promoted = promoteNextAfterComplete(completed, 'plan-op-101')
    expect(promoted.find((o) => o.id === 'plan-op-102')?.status).toBe('ready')
  })

  it('applyMockConfirmationWithGates rejects start when blocked', () => {
    const ops = initialMockOperationsForNest('WC-ASSY-01')
    const blocked = ops.find((o) => o.id === 'plan-op-102')!
    const next = applyMockConfirmationWithGates(ops, blocked.id, 'start')
    expect(next.find((o) => o.id === blocked.id)?.status).toBe('upcoming')
  })

  it('applyMockConfirmationWithGates allows complete and promotes', () => {
    let ops = initialMockOperationsForNest('WC-ASSY-01')
    ops = applyMockConfirmationWithGates(ops, 'plan-op-101', 'complete')
    expect(ops.find((o) => o.id === 'plan-op-102')?.status).toBe('ready')
  })
})
