import { CRM_PERSPECTIVE_TABLE_IDS } from './perspective-table-ids'

export type CrmPerspectiveEntity = keyof typeof CRM_PERSPECTIVE_TABLE_IDS

/** Open Mercato customers DataTable perspective ids (read-only in core). */
export const CUSTOMERS_LIST_PERSPECTIVE_TABLE_IDS: Record<CrmPerspectiveEntity, string> = {
  people: 'customers.people.list',
  companies: 'customers.companies.list',
  deals: 'customers.deals.list',
}

export function getCrmPerspectiveTableId(entity: CrmPerspectiveEntity): string {
  return CRM_PERSPECTIVE_TABLE_IDS[entity]
}

export function getCustomersListPerspectiveTableId(entity: CrmPerspectiveEntity): string {
  return CUSTOMERS_LIST_PERSPECTIVE_TABLE_IDS[entity]
}

export function mirrorPerspectiveName(crmViewName: string): string {
  const trimmed = crmViewName.trim() || 'Untitled'
  return `CRM 2027: ${trimmed}`
}

export function parseCrmPerspectiveEntity(value: string): CrmPerspectiveEntity | null {
  if (value === 'people' || value === 'companies' || value === 'deals') return value
  return null
}
