import type { SupplySnapshotLine } from './supply-snapshot'
import type { ExplodedLine } from './explode'

export type NetRequirementLine = {
  nodeKey: string
  productSku: string
  grossQty: number
  supplyQty: number
  netQty: number
  level: number
}

export function computeNetRequirements(
  exploded: ExplodedLine[],
  supplyBySku: Map<string, SupplySnapshotLine>,
): NetRequirementLine[] {
  return exploded.map((line) => {
    const supply = supplyBySku.get(line.productSku)
    const supplyQty = (supply?.onHandQty ?? 0) + (supply?.wipQty ?? 0)
    const grossQty = line.extendedQty
    const netQty = Math.max(0, grossQty - supplyQty)
    return {
      nodeKey: line.nodeKey,
      productSku: line.productSku,
      grossQty,
      supplyQty,
      netQty,
      level: line.level,
    }
  })
}
