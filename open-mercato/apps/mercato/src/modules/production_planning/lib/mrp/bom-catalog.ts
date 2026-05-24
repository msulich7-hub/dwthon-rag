/**
 * Mercato-native BOM catalog (no IFS JDBC). SKUs map to components for up to 6-level explosion.
 * Factory fixture uses PRODUCT-* / COMP-* patterns; extend this table per org via future config API.
 */

export type BomCatalogLine = {
  componentSku: string
  qtyPer: number
  nodeType: 'make' | 'buy' | 'phantom_pass'
}

const FINISHED_PREFIX = /^PRODUCT-/i
const SF_PREFIX = /^SF-/i

/** Default semi-finished chain: 5 levels below finished good. */
const DEFAULT_SF_CHAIN = [
  { componentSku: 'SF-L2-A', qtyPer: 1, nodeType: 'make' as const },
  { componentSku: 'SF-L3-A', qtyPer: 2, nodeType: 'make' as const },
  { componentSku: 'SF-L4-A', qtyPer: 1, nodeType: 'make' as const },
  { componentSku: 'SF-L5-A', qtyPer: 1, nodeType: 'buy' as const },
  { componentSku: 'RAW-STEEL', qtyPer: 3, nodeType: 'buy' as const },
]

const CATALOG: Record<string, BomCatalogLine[]> = {
  default: [
    { componentSku: 'COMP-A', qtyPer: 1, nodeType: 'buy' },
    { componentSku: 'COMP-B', qtyPer: 1, nodeType: 'buy' },
  ],
  'SF-L2-A': [
    { componentSku: 'SF-L3-A', qtyPer: 2, nodeType: 'make' },
    { componentSku: 'SF-L3-ALT', qtyPer: 2, nodeType: 'make' },
    { componentSku: 'COMP-C', qtyPer: 1, nodeType: 'buy' },
  ],
  'SF-L3-A': [{ componentSku: 'SF-L4-A', qtyPer: 1, nodeType: 'make' }],
  'SF-L3-ALT': [{ componentSku: 'SF-L4-ALT', qtyPer: 1, nodeType: 'make' }],
  'SF-L4-ALT': [{ componentSku: 'SF-L5-A', qtyPer: 1, nodeType: 'make' }],
  'SF-L3-A': [{ componentSku: 'SF-L4-A', qtyPer: 1, nodeType: 'make' }],
  'SF-L4-A': [{ componentSku: 'SF-L5-A', qtyPer: 1, nodeType: 'make' }],
  'SF-L5-A': [{ componentSku: 'RAW-STEEL', qtyPer: 2, nodeType: 'buy' }],
}

export function lookupBomComponents(parentSku: string): BomCatalogLine[] {
  const key = parentSku.trim().toUpperCase()
  if (CATALOG[key]) return CATALOG[key]!
  if (CATALOG[parentSku]) return CATALOG[parentSku]!
  if (FINISHED_PREFIX.test(parentSku)) {
    return [{ componentSku: 'SF-L2-A', qtyPer: 1, nodeType: 'make' }, ...DEFAULT_SF_CHAIN.slice(1)]
  }
  if (SF_PREFIX.test(parentSku)) {
    const level = DEFAULT_SF_CHAIN.find((l) => l.componentSku === parentSku)
    if (level) {
      const idx = DEFAULT_SF_CHAIN.indexOf(level)
      if (idx < DEFAULT_SF_CHAIN.length - 1) {
        return [DEFAULT_SF_CHAIN[idx + 1]!]
      }
    }
    return CATALOG.default!
  }
  return CATALOG.default!
}

export const BOM_MAX_DEPTH = 6
