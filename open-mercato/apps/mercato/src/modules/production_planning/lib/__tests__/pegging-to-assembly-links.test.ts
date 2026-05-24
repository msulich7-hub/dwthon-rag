import {
  buildCrossOrderAssemblyLinks,
  filterAssemblyLinksForOperationIds,
} from '../pegging-to-assembly-links'
import type { PayloadOrder } from '../cpsat-chunking'
import { partitionOrdersPegAware } from '../cpsat-chunking'

function mockOrder(
  id: string,
  salesOrderId: string | null,
  ops: Array<{ id: string; seq: number }>,
): PayloadOrder {
  return {
    id,
    code: id,
    title: id,
    salesOrderId,
    productSku: 'SKU-1',
    quantity: 1,
    status: 'planned',
    workCenterCode: null,
    plannedStartAt: null,
    plannedEndAt: null,
    dueAt: '2026-06-01T00:00:00.000Z',
    isLate: false,
    operations: ops.map((o) => ({
      id: o.id,
      productionOrderId: id,
      sequenceNo: o.seq,
      name: 'op',
      workCenterCode: 'WC-1',
      durationMinutes: 60,
      status: 'pending',
      plannedStartAt: null,
      plannedEndAt: null,
    })),
  }
}

describe('pegging-to-assembly-links', () => {
  it('links last op of order A to first op of order B on same sales order', () => {
    const orders = [
      mockOrder('mo-1', 'so-1', [
        { id: 'op-1a', seq: 1 },
        { id: 'op-1b', seq: 2 },
      ]),
      mockOrder('mo-2', 'so-1', [{ id: 'op-2a', seq: 1 }]),
    ]
    const links = buildCrossOrderAssemblyLinks(orders)
    expect(links).toHaveLength(1)
    expect(links[0]).toEqual({
      predecessorOperationId: 'op-1b',
      successorOperationId: 'op-2a',
      lagMinutes: 0,
    })
  })

  it('peg-aware partition keeps linked orders in same chunk', () => {
    const orders = [
      mockOrder('mo-1', 'so-1', [{ id: 'op-1', seq: 1 }]),
      mockOrder('mo-2', 'so-1', [{ id: 'op-2', seq: 1 }]),
      mockOrder('mo-3', null, [{ id: 'op-3', seq: 1 }]),
    ]
    const links = buildCrossOrderAssemblyLinks(orders)
    const partitions = partitionOrdersPegAware(orders, links, 500)
    const chunkWithMo1 = partitions.find((p) => p.some((o) => o.id === 'mo-1'))
    expect(chunkWithMo1?.some((o) => o.id === 'mo-2')).toBe(true)
  })

  it('filterAssemblyLinksForOperationIds keeps only in-chunk links', () => {
    const links = [
      {
        predecessorOperationId: 'a',
        successorOperationId: 'b',
        lagMinutes: 0,
      },
      {
        predecessorOperationId: 'b',
        successorOperationId: 'c',
        lagMinutes: 0,
      },
    ]
    const filtered = filterAssemblyLinksForOperationIds(links, new Set(['a', 'b']))
    expect(filtered).toHaveLength(1)
  })
})
