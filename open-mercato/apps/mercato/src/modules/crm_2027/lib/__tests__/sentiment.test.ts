import { analyzeSentiment } from '../sentiment'

describe('analyzeSentiment', () => {
  it('flags frustrated Polish phrasing as at-risk', () => {
    const result = analyzeSentiment('Jak mówiłem wcześniej, nadal czekam na odpowiedź!')
    expect(result.label).toBe('frustrated')
    expect(result.atRisk).toBe(true)
  })

  it('detects positive English tone', () => {
    const result = analyzeSentiment('Thanks, this looks great and we are happy to proceed.')
    expect(result.label).toBe('positive')
    expect(result.atRisk).toBe(false)
  })
})
