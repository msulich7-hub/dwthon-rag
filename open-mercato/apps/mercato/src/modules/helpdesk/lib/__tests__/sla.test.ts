import { computeSlaDueAt, isSlaBreached, slaRemainingLabel } from '../sla'

describe('sla', () => {
  it('computes urgent SLA in 4 hours', () => {
    const from = new Date('2026-05-23T12:00:00.000Z')
    const due = computeSlaDueAt('urgent', from)
    expect(due.toISOString()).toBe('2026-05-23T16:00:00.000Z')
  })

  it('detects breached SLA', () => {
    const due = new Date('2026-05-23T10:00:00.000Z')
    const now = new Date('2026-05-23T12:00:00.000Z')
    expect(isSlaBreached(due, now)).toBe(true)
    expect(slaRemainingLabel(due, now)).toBe('breached')
  })

  it('flags due soon within 2 hours', () => {
    const now = new Date('2026-05-23T12:00:00.000Z')
    const due = new Date('2026-05-23T13:30:00.000Z')
    expect(slaRemainingLabel(due, now)).toBe('due_soon')
  })
})
