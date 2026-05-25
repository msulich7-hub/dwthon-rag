/** Demo BOM lines until catalog/BOM integration exists (MES raw-material request UI). */
export type RawMaterialLine = {
  code: string
  name: string
}

export function placeholderBomForProduct(productCode: string): RawMaterialLine[] {
  const base = productCode.trim() || 'PRODUCT'
  return [
    { code: `RM-${base}-01`, name: 'Primary component' },
    { code: `RM-${base}-02`, name: 'Secondary component' },
    { code: `RM-${base}-PACK`, name: 'Packaging / consumables' },
  ]
}
