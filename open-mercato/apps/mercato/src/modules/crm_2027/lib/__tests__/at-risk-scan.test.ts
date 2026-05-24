import { analyzeSentiment } from '../sentiment'

describe('analyzeSentiment for at-risk', () => {
  it('marks frustrated copy as at risk', () => {
    expect(analyzeSentiment('Po raz kolejny proszę o odpowiedź!').atRisk).toBe(true)
  })
})
