import { resolveTemplateOptimizeParams } from '../what-if-resolver'

describe('what-if-resolver', () => {
  it('resolves WIF-07 campaign profile', () => {
    const p = resolveTemplateOptimizeParams('WIF-07')
    expect(p.objective).toBe('minimize_changeover')
    expect(p.objectiveWeights?.changeoverWeight).toBe(1)
    expect(p.proposeOnly).toBe(true)
    expect(p.dryRun).toBe(true)
  })

  it('extends horizon for WIF-05', () => {
    const p = resolveTemplateOptimizeParams('WIF-05')
    expect(p.horizonHours).toBe(216)
  })

  it('throws on unknown template', () => {
    expect(() => resolveTemplateOptimizeParams('WIF-99')).toThrow('UNKNOWN_SCENARIO_TEMPLATE')
  })
})
