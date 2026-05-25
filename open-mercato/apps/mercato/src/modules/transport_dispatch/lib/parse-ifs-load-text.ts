import type { LoadUnitKind } from '../data/entities'

/** Parses IFS free-text like "3x PLT_A", "2 paczki niestandardowe", "Paleta B x1". */
export function parseIfsLoadText(
  text: string | null | undefined,
  defaultKind: LoadUnitKind,
): Array<{ kind: LoadUnitKind; typeCode: string; quantity: number }> {
  if (!text?.trim()) return []

  const lines: Array<{ kind: LoadUnitKind; typeCode: string; quantity: number }> = []
  const parts = text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean)

  for (const part of parts) {
    const match = part.match(/(\d+)\s*[x×]?\s*([A-Za-z0-9_]+)/i)
    if (match) {
      lines.push({
        kind: defaultKind,
        typeCode: normalizeTypeCode(match[2] ?? '', defaultKind),
        quantity: Number.parseInt(match[1] ?? '1', 10) || 1,
      })
      continue
    }

    if (/niestandard|non.?std/i.test(part)) {
      lines.push({ kind: 'package', typeCode: 'PKG_NONSTD', quantity: 1 })
    } else if (/paleta\s*a/i.test(part)) {
      lines.push({ kind: 'pallet', typeCode: 'PLT_A', quantity: 1 })
    } else if (/paleta\s*b/i.test(part)) {
      lines.push({ kind: 'pallet', typeCode: 'PLT_B', quantity: 1 })
    }
  }

  return lines
}

function normalizeTypeCode(raw: string, kind: LoadUnitKind): string {
  const upper = raw.toUpperCase().replace(/\s+/g, '_')
  if (upper.startsWith('PKG_') || upper.startsWith('PLT_')) return upper
  if (kind === 'package') return `PKG_${upper}`
  return `PLT_${upper}`
}
