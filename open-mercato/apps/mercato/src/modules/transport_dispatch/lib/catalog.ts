export type CatalogItem = { code: string; labelPl: string; labelEn: string; icon: string }

export const PACKAGE_TYPES: CatalogItem[] = [
  { code: 'PKG_S', labelPl: 'Paczka S', labelEn: 'Parcel S', icon: '📦' },
  { code: 'PKG_M', labelPl: 'Paczka M', labelEn: 'Parcel M', icon: '📦' },
  { code: 'PKG_L', labelPl: 'Paczka L', labelEn: 'Parcel L', icon: '📦' },
  { code: 'PKG_XL', labelPl: 'Paczka XL', labelEn: 'Parcel XL', icon: '📦' },
  { code: 'PKG_NONSTD', labelPl: 'Paczka niestandardowa', labelEn: 'Non-standard parcel', icon: '📫' },
]

export const PALLET_TYPES: CatalogItem[] = [
  { code: 'PLT_A', labelPl: 'Paleta A', labelEn: 'Pallet A', icon: '🟫' },
  { code: 'PLT_B', labelPl: 'Paleta B', labelEn: 'Pallet B', icon: '🟫' },
  { code: 'PLT_EUR', labelPl: 'Paleta EUR', labelEn: 'EUR pallet', icon: '🟫' },
  { code: 'PLT_HALF', labelPl: 'Półpaleta', labelEn: 'Half pallet', icon: '🟫' },
  { code: 'PLT_QUARTER', labelPl: 'Ćwierćpaleta', labelEn: 'Quarter pallet', icon: '🟫' },
  { code: 'PLT_DISPLAY', labelPl: 'Paleta display', labelEn: 'Display pallet', icon: '🟫' },
  { code: 'PLT_CAGE', labelPl: 'Klatka', labelEn: 'Cage', icon: '🟫' },
  { code: 'PLT_IBC', labelPl: 'IBC', labelEn: 'IBC', icon: '🟫' },
  { code: 'PLT_OVERSIZE', labelPl: 'Ponadgabaryt', labelEn: 'Oversize', icon: '🟫' },
  { code: 'PLT_COLD', labelPl: 'Chłodnia', labelEn: 'Cold chain', icon: '🟫' },
]

export const EXPEDITION_CODES = [
  { code: 'X', labelPl: 'Ekspedycja X', labelEn: 'Expedition X' },
  { code: 'Y', labelPl: 'Ekspedycja Y', labelEn: 'Expedition Y' },
  { code: 'DEFAULT', labelPl: 'Domyślna', labelEn: 'Default' },
] as const

export const DEFAULT_PACKAGE_EXPEDITION = 'X'
export const DEFAULT_PALLET_EXPEDITION = 'Y'

export function labelForType(code: string): string {
  return (
    PACKAGE_TYPES.find((p) => p.code === code)?.labelPl ??
    PALLET_TYPES.find((p) => p.code === code)?.labelPl ??
    code
  )
}
