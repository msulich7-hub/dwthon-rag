import { evaluateInteractiveSla, INTERACTIVE_SLA_MS } from '../cpsat-sla'

describe('cpsat-sla', () => {
  it('passes within 60s for <=500 operations', () => {
    const r = evaluateInteractiveSla(45_000, 200)
    expect(r.withinSla).toBe(true)
    expect(r.targetMs).toBe(INTERACTIVE_SLA_MS)
  })

  it('fails when wall time exceeds target', () => {
    const r = evaluateInteractiveSla(90_000, 100)
    expect(r.withinSla).toBe(false)
    expect(r.message).toMatch(/SLA exceeded/)
  })

  it('skips SLA for large operation counts', () => {
    const r = evaluateInteractiveSla(120_000, 800)
    expect(r.withinSla).toBe(true)
  })
})
