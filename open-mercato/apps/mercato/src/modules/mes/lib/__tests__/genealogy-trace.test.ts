import { resolveGenealogyRoot, traceGenealogy } from '../genealogy-trace'

describe('genealogy trace', () => {
  const scope = { tenantId: 't1', organizationId: 'o1' }

  it('resolveGenealogyRoot returns lot node', async () => {
    const em = {
      findOne: jest.fn().mockResolvedValue({
        id: 'lot-1',
        lotNumber: 'LOT-A',
        productCode: 'P1',
      }),
    }
    const root = await resolveGenealogyRoot(em as never, scope, { lotNumber: 'LOT-A' })
    expect(root).toEqual({
      type: 'lot',
      id: 'lot-1',
      label: 'LOT-A',
      productCode: 'P1',
    })
  })

  it('traceGenealogy walks upstream edges', async () => {
    const edge = {
      id: 'e1',
      relation: 'consume',
      parentType: 'lot',
      parentId: 'lot-parent',
      childType: 'lot',
      childId: 'lot-1',
      workOrderId: 'wo-1',
      quantity: 2,
    }

    const em = {
      find: jest
        .fn()
        .mockResolvedValueOnce([edge])
        .mockResolvedValueOnce([]),
      findOne: jest.fn(async (_entity: unknown, where: Record<string, unknown>) => {
        if (where.id === 'lot-parent') {
          return { id: 'lot-parent', lotNumber: 'LOT-P', productCode: 'RM' }
        }
        if (where.id === 'lot-1') {
          return { id: 'lot-1', lotNumber: 'LOT-A', productCode: 'FG' }
        }
        return null
      }),
    }

    const result = await traceGenealogy(
      em as never,
      scope,
      { type: 'lot', id: 'lot-1', label: 'LOT-A', productCode: 'FG' },
      { direction: 'upstream', depth: 2 },
    )

    expect(result.upstream).toHaveLength(1)
    expect(result.upstream[0]?.parent.label).toBe('LOT-P')
    expect(result.downstream).toHaveLength(0)
  })
})
