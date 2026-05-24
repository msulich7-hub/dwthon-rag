import {
  getWhatIfBundle,
  getWhatIfTemplate,
  listWhatIfBundles,
  listWhatIfTemplates,
  loadWhatIfRegistry,
  resolveObjectiveProfile,
} from '../what-if-registry'

describe('what-if-registry', () => {
  it('loads registry with 36 templates and 10 bundles', () => {
    const registry = loadWhatIfRegistry()
    expect(registry.templates.length).toBeGreaterThanOrEqual(36)
    expect(registry.bundles.length).toBeGreaterThanOrEqual(10)
  })

  it('finds WIF-01 baseline template', () => {
    const t = getWhatIfTemplate('WIF-01')
    expect(t?.isBaseline).toBe(true)
  })

  it('filters templates by dimension', () => {
    const capacity = listWhatIfTemplates({ dimension: 'capacity' })
    expect(capacity.length).toBeGreaterThan(0)
    expect(capacity.every((t) => t.dimensions.includes('capacity'))).toBe(true)
  })

  it('resolves objective profile balanced', () => {
    const p = resolveObjectiveProfile('balanced')
    expect(p?.objective).toBe('minimize_lateness')
    expect(p?.tardinessWeight).toBe(0.6)
  })

  it('loads tournament bundle', () => {
    const b = getWhatIfBundle('BND-TOURNAMENT-RUSH')
    expect(b?.mode).toBe('tournament')
    expect(b?.variants?.length).toBe(5)
  })

  it('lists all bundles', () => {
    expect(listWhatIfBundles().map((b) => b.id)).toContain('BND-MONDAY')
  })
})
