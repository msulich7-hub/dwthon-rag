import { buildListGroups } from '../list-generator'

describe('buildListGroups', () => {
  it('creates two lists when packages and pallets selected', () => {
    const groups = buildListGroups(
      [
        { kind: 'package', typeCode: 'PKG_NONSTD', quantity: 2 },
        { kind: 'pallet', typeCode: 'PLT_A', quantity: 3 },
        { kind: 'pallet', typeCode: 'PLT_B', quantity: 1 },
      ],
      { packageExpedition: 'X', palletExpedition: 'Y', singleList: false },
    )
    expect(groups).toHaveLength(2)
    expect(groups[0]?.expeditionCode).toBe('X')
    expect(groups[0]?.lines).toEqual([{ kind: 'package', typeCode: 'PKG_NONSTD', quantity: 2 }])
    expect(groups[1]?.expeditionCode).toBe('Y')
    expect(groups[1]?.lines).toEqual([
      { kind: 'pallet', typeCode: 'PLT_A', quantity: 3 },
      { kind: 'pallet', typeCode: 'PLT_B', quantity: 1 },
    ])
  })

  it('merges into one list when only pallets', () => {
    const groups = buildListGroups(
      [{ kind: 'pallet', typeCode: 'PLT_A', quantity: 3 }],
      { packageExpedition: 'X', palletExpedition: 'Y', singleList: false },
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.expeditionCode).toBe('Y')
  })
})
