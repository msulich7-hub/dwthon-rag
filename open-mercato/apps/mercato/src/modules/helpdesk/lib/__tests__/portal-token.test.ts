import { hashPortalToken } from '../portal-token'

describe('hashPortalToken', () => {
  it('returns stable sha256 hex for the same token', () => {
    const a = hashPortalToken('550e8400-e29b-41d4-a716-446655440000')
    const b = hashPortalToken('550e8400-e29b-41d4-a716-446655440000')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('differs for different tokens', () => {
    expect(hashPortalToken('a')).not.toBe(hashPortalToken('b'))
  })
})
