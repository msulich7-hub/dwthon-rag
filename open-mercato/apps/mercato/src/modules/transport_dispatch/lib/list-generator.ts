/**
 * Plug your existing transport-list tool here.
 * Set TRANSPORT_LIST_GENERATOR=external and implement registerExternalListGenerator().
 */
import type { ManifestFormat } from '../data/entities'
import { labelForType } from './catalog'

export type ManifestLine = {
  kind: 'package' | 'pallet'
  typeCode: string
  label: string
  quantity: number
}

export type TransportListPayload = {
  listNumber: number
  expeditionCode: string
  format: ManifestFormat
  ifsRef: string
  recipientName: string | null
  addressLine: string | null
  lines: ManifestLine[]
  generatedAt: string
}

export type ListGeneratorInput = {
  ifsRef: string
  recipientName: string | null
  addressLine: string | null
  format: ManifestFormat
  groups: Array<{
    expeditionCode: string
    lines: Array<{ kind: 'package' | 'pallet'; typeCode: string; quantity: number }>
  }>
}

export type TransportListGenerator = {
  id: string
  generate(input: ListGeneratorInput): Promise<TransportListPayload[]>
}

let externalGenerator: TransportListGenerator | null = null

export function registerExternalListGenerator(generator: TransportListGenerator): void {
  externalGenerator = generator
}

const builtInGenerator: TransportListGenerator = {
  id: 'builtin',
  async generate(input) {
    const at = new Date().toISOString()
    return input.groups.map((group, index) => ({
      listNumber: index + 1,
      expeditionCode: group.expeditionCode,
      format: input.format,
      ifsRef: input.ifsRef,
      recipientName: input.recipientName,
      addressLine: input.addressLine,
      lines: group.lines
        .filter((l) => l.quantity > 0)
        .map((l) => ({
          kind: l.kind,
          typeCode: l.typeCode,
          label: labelForType(l.typeCode),
          quantity: l.quantity,
        })),
      generatedAt: at,
    }))
  },
}

export function resolveListGenerator(): TransportListGenerator {
  if (process.env.TRANSPORT_LIST_GENERATOR === 'external' && externalGenerator) {
    return externalGenerator
  }
  return builtInGenerator
}

/** Split operator lines into 1–2 transport lists (packages vs pallets). */
export function buildListGroups(
  lines: Array<{ kind: 'package' | 'pallet'; typeCode: string; quantity: number }>,
  options: {
    packageExpedition: string
    palletExpedition: string
    singleList?: boolean
  },
): ListGeneratorInput['groups'] {
  const packages = lines.filter((l) => l.kind === 'package' && l.quantity > 0)
  const pallets = lines.filter((l) => l.kind === 'pallet' && l.quantity > 0)

  if (options.singleList || (packages.length > 0 && pallets.length === 0) || (pallets.length > 0 && packages.length === 0)) {
    const expedition =
      packages.length > 0 && pallets.length === 0
        ? options.packageExpedition
        : pallets.length > 0 && packages.length === 0
          ? options.palletExpedition
          : options.packageExpedition
    return [{ expeditionCode: expedition, lines: [...packages, ...pallets] }]
  }

  const groups: ListGeneratorInput['groups'] = []
  if (packages.length > 0) {
    groups.push({ expeditionCode: options.packageExpedition, lines: packages })
  }
  if (pallets.length > 0) {
    groups.push({ expeditionCode: options.palletExpedition, lines: pallets })
  }
  return groups
}
