import { parseIfsLoadText } from '../parse-ifs-load-text'

describe('parseIfsLoadText', () => {
  it('parses pallet quantities from IFS text', () => {
    const lines = parseIfsLoadText('3x PLT_A, 1x PLT_B', 'pallet')
    expect(lines).toEqual([
      { kind: 'pallet', typeCode: 'PLT_A', quantity: 3 },
      { kind: 'pallet', typeCode: 'PLT_B', quantity: 1 },
    ])
  })

  it('parses non-standard packages', () => {
    const lines = parseIfsLoadText('2x PKG_NONSTD', 'package')
    expect(lines[0]).toMatchObject({ typeCode: 'PKG_NONSTD', quantity: 2 })
  })
})
