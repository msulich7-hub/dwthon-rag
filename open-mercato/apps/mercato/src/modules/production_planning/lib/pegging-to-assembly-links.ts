import type { PayloadOrder } from './cpsat-chunking'

export type CpsatAssemblyLink = {
  predecessorOperationId: string
  successorOperationId: string
  lagMinutes: number
}

/**
 * Intra-order precedence is already enforced in the CP-SAT model per order routing.
 * This builder emits **cross-order** peg links (e.g. shared sales order chain) for assemblyLinks.
 */
export function buildCrossOrderAssemblyLinks(orders: PayloadOrder[]): CpsatAssemblyLink[] {
  const links: CpsatAssemblyLink[] = []
  const bySales = new Map<string, PayloadOrder[]>()

  for (const order of orders) {
    if (!order.salesOrderId) continue
    const list = bySales.get(order.salesOrderId) ?? []
    list.push(order)
    bySales.set(order.salesOrderId, list)
  }

  for (const group of bySales.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => {
      const da = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER
      const db = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER
      if (da !== db) return da - db
      return a.code.localeCompare(b.code)
    })

    for (let i = 0; i < sorted.length - 1; i++) {
      const prevOrder = sorted[i]!
      const nextOrder = sorted[i + 1]!
      const prevOps = [...prevOrder.operations].sort((a, b) => a.sequenceNo - b.sequenceNo)
      const nextOps = [...nextOrder.operations].sort((a, b) => a.sequenceNo - b.sequenceNo)
      if (prevOps.length === 0 || nextOps.length === 0) continue
      const predecessor = prevOps[prevOps.length - 1]!
      const successor = nextOps[0]!
      links.push({
        predecessorOperationId: predecessor.id,
        successorOperationId: successor.id,
        lagMinutes: 0,
      })
    }
  }

  return links
}

export function mergeAssemblyLinks(
  ...groups: CpsatAssemblyLink[][]
): CpsatAssemblyLink[] {
  const seen = new Set<string>()
  const out: CpsatAssemblyLink[] = []
  for (const group of groups) {
    for (const link of group) {
      if (link.predecessorOperationId === link.successorOperationId) continue
      const key = `${link.predecessorOperationId}->${link.successorOperationId}:${link.lagMinutes}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(link)
    }
  }
  return out
}

export function filterAssemblyLinksForOperationIds(
  links: CpsatAssemblyLink[],
  operationIds: Set<string>,
): CpsatAssemblyLink[] {
  return links.filter(
    (l) =>
      operationIds.has(l.predecessorOperationId) &&
      operationIds.has(l.successorOperationId),
  )
}
