import { pickPrimaryEntityId } from '../match-participants'

describe('pickPrimaryEntityId', () => {
  it('returns first matched entity', () => {
    const id = pickPrimaryEntityId(
      [
        { customerEntityId: null, matchedVia: null },
        { customerEntityId: 'person-1', matchedVia: 'primary_email' },
      ],
      null,
    )
    expect(id).toBe('person-1')
  })

  it('returns null when no matches', () => {
    expect(pickPrimaryEntityId([{ customerEntityId: null, matchedVia: null }], 'deal-1')).toBeNull()
  })
})
