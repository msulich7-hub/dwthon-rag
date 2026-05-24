import { normalizeObjectiveWeights, objectiveWeightsForSolve } from '../objective-weights'

describe('objective-weights', () => {
  it('normalizes registry weights', () => {
    expect(
      normalizeObjectiveWeights({
        tardinessWeight: 0.6,
        changeoverWeight: 0.3,
        wipWeight: 0.1,
      }),
    ).toEqual({
      tardinessWeight: 0.6,
      changeoverWeight: 0.3,
      wipWeight: 0.1,
    })
  })

  it('maps minimize_changeover objective to blended weights', () => {
    const w = objectiveWeightsForSolve('minimize_changeover', undefined)
    expect(w?.changeoverWeight).toBeGreaterThan(0.5)
  })
})
