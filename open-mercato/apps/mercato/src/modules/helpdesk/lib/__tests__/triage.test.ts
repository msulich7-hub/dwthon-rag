import { triageHelpdeskMessage } from '../triage'

describe('triageHelpdeskMessage', () => {
  it('marks urgent outage language as urgent priority', () => {
    const result = triageHelpdeskMessage(
      'Production outage',
      'The entire billing API is down and customers cannot pay.',
    )
    expect(result.priority).toBe('urgent')
    expect(result.labels).toContain('urgent_language')
  })

  it('classifies billing-related tickets', () => {
    const result = triageHelpdeskMessage('Invoice question', 'I did not receive last month invoice PDF.')
    expect(result.category).toBe('billing')
    expect(result.labels).toContain('billing')
  })

  it('defaults short messages to low priority', () => {
    const result = triageHelpdeskMessage('Hi', 'Thanks!')
    expect(result.priority).toBe('low')
  })
})
