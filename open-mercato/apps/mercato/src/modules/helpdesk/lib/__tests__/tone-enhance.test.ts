import { enhanceReplyTone } from '../tone-enhance'

describe('enhanceReplyTone', () => {
  it('returns empty for blank draft', () => {
    expect(enhanceReplyTone('   ')).toBe('')
  })

  it('adds professional closing when missing thanks', () => {
    const out = enhanceReplyTone('We are investigating.')
    expect(out).toMatch(/Thank you for your patience/i)
  })

  it('adds empathetic prefix when missing empathy cues', () => {
    const out = enhanceReplyTone('We will fix this today.', 'empathetic')
    expect(out).toMatch(/understand the impact/i)
  })

  it('adds friendly greeting when missing hello', () => {
    const out = enhanceReplyTone('Your package left the warehouse.', 'friendly')
    expect(out).toMatch(/Hi,/i)
  })

  it('does not duplicate empathy prefix', () => {
    const out = enhanceReplyTone('We understand the impact. Fixing now.', 'empathetic')
    expect(out.match(/understand the impact/gi)?.length).toBe(1)
  })
})
