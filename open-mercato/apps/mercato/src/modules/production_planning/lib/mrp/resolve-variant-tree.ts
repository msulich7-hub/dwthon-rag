import { stableUuidFromString } from '../stable-uuid'
import { lookupBomComponents } from './bom-catalog'

export type VariantTreeResolution = {
  rootSku: string
  variantCode: string
  bomRevisionId: string
  routingId: string
  effectivityAt: string
  routingSteps: string[]
  status: 'resolved' | 'VARIANT_NO_STRUCTURE'
  candidates: string[]
}

export type ResolveVariantInput = {
  productSku: string
  quantity: number
  requestedDate?: Date | null
  customerAttrs?: Record<string, string>
}

/**
 * Mercato-config variant resolver (IFS silver routing plugs in later at same boundary).
 */
export function resolveVariantTree(input: ResolveVariantInput): VariantTreeResolution {
  const rootSku = input.productSku.trim() || 'UNKNOWN'
  const components = lookupBomComponents(rootSku)
  const effectivityAt = (input.requestedDate ?? new Date()).toISOString()
  const bomRevisionId = stableUuidFromString(`bom:rev:${rootSku}:default`)

  if (components.length === 0) {
    return {
      rootSku,
      variantCode: 'default',
      bomRevisionId,
      routingId: 'routing-default',
      effectivityAt,
      routingSteps: [],
      status: 'VARIANT_NO_STRUCTURE',
      candidates: [],
    }
  }

  const altSkus = components.filter((c) => c.componentSku.includes('ALT')).map((c) => c.componentSku)
  const candidates = altSkus.length > 0 ? ['default', ...altSkus] : ['default']

  return {
    rootSku,
    variantCode: 'default',
    bomRevisionId,
    routingId: `routing-${rootSku}`,
    effectivityAt,
    routingSteps: components.map((c) => c.componentSku),
    status: 'resolved',
    candidates,
  }
}
