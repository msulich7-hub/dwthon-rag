import { stableUuidFromString } from '../stable-uuid'
import { BOM_MAX_DEPTH, lookupBomComponents } from './bom-catalog'
import { resolveVariantTree } from './resolve-variant-tree'

export type ExplodedLine = {
  nodeKey: string
  level: number
  parentNodeKey: string | null
  productSku: string
  extendedQty: number
  nodeType: 'make' | 'buy' | 'phantom_pass'
}

export type ExplodeInput = {
  rootSku: string
  quantity: number
  maxDepth?: number
  requestedDate?: Date | null
}

/**
 * Recursive BOM explosion up to 6 levels using Mercato bom-catalog (no IFS).
 */
export function explodeBom(input: ExplodeInput): ExplodedLine[] {
  const maxDepth = Math.min(input.maxDepth ?? BOM_MAX_DEPTH, BOM_MAX_DEPTH)
  const resolution = resolveVariantTree({
    productSku: input.rootSku,
    quantity: input.quantity,
    requestedDate: input.requestedDate,
  })

  const lines: ExplodedLine[] = []
  const rootKey = 'root'

  lines.push({
    nodeKey: rootKey,
    level: 0,
    parentNodeKey: null,
    productSku: resolution.rootSku,
    extendedQty: input.quantity,
    nodeType: 'make',
  })

  if (maxDepth < 1) return lines

  function appendChildren(
    parentKey: string,
    parentSku: string,
    level: number,
    qty: number,
  ): void {
    if (level >= maxDepth) return
    const components = lookupBomComponents(parentSku)
    for (const comp of components) {
      const childKey = `${parentKey}:${comp.componentSku}`
      const childQty = qty * comp.qtyPer
      const sub = lookupBomComponents(comp.componentSku)
      const isLeaf = sub.length === 0 || level + 1 >= maxDepth
      lines.push({
        nodeKey: childKey,
        level: level + 1,
        parentNodeKey: parentKey,
        productSku: comp.componentSku,
        extendedQty: childQty,
        nodeType: isLeaf ? 'buy' : comp.nodeType,
      })
      if (!isLeaf && comp.nodeType !== 'phantom_pass') {
        appendChildren(childKey, comp.componentSku, level + 1, childQty)
      }
    }
  }

  appendChildren(rootKey, resolution.rootSku, 0, input.quantity)
  return lines
}

export function explodeContentHash(rootSku: string, quantity: number): string {
  return stableUuidFromString(`explode:${rootSku}:${quantity}:${BOM_MAX_DEPTH}`)
}

export function maxExplodedLevel(lines: ExplodedLine[]): number {
  return lines.reduce((m, l) => Math.max(m, l.level), 0)
}
