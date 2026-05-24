import { stableUuidFromString } from '../stable-uuid'

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
}

const DEFAULT_COMPONENTS: Record<string, string[]> = {
  default: ['COMP-A', 'COMP-B'],
}

/**
 * Pilot BOM explosion (≤3 levels). Full 6-level engine plugs in when M1 silver BOM is wired.
 */
export function explodeBom(input: ExplodeInput): ExplodedLine[] {
  const maxDepth = Math.min(input.maxDepth ?? 3, 6)
  const lines: ExplodedLine[] = []
  const rootKey = 'root'

  lines.push({
    nodeKey: rootKey,
    level: 0,
    parentNodeKey: null,
    productSku: input.rootSku,
    extendedQty: input.quantity,
    nodeType: 'make',
  })

  if (maxDepth < 1) return lines

  const components = DEFAULT_COMPONENTS[input.rootSku] ?? DEFAULT_COMPONENTS.default!
  for (const comp of components) {
    lines.push({
      nodeKey: `${rootKey}:${comp}`,
      level: 1,
      parentNodeKey: rootKey,
      productSku: comp,
      extendedQty: input.quantity,
      nodeType: 'buy',
    })
  }

  return lines
}

export function explodeContentHash(rootSku: string, quantity: number): string {
  return stableUuidFromString(`explode:${rootSku}:${quantity}`)
}
