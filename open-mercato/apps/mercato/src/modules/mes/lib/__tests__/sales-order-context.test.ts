import type { SalesOrderLine } from '@open-mercato/core/modules/sales/data/entities'

function extractProductCode(line: Pick<SalesOrderLine, 'catalogSnapshot' | 'name' | 'lineNumber'>): string {
  const snapshot = line.catalogSnapshot as Record<string, unknown> | null | undefined
  const sku = snapshot?.sku
  if (typeof sku === 'string' && sku.trim().length > 0) {
    return sku.trim()
  }
  if (line.name?.trim()) {
    return line.name.trim().slice(0, 120)
  }
  return `LINE-${line.lineNumber}`
}

describe('sales order line product code extraction', () => {
  it('prefers catalog snapshot sku', () => {
    const code = extractProductCode({
      catalogSnapshot: { sku: 'SKU-42' },
      name: 'Widget',
      lineNumber: 1,
    } as SalesOrderLine)
    expect(code).toBe('SKU-42')
  })

  it('falls back to line name', () => {
    const code = extractProductCode({
      catalogSnapshot: null,
      name: 'Custom assembly',
      lineNumber: 2,
    } as SalesOrderLine)
    expect(code).toBe('Custom assembly')
  })
})
