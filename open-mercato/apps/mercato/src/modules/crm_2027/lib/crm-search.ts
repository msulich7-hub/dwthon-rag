import type { EntityManager, FilterQuery } from '@mikro-orm/postgresql'
import { CustomerDeal, CustomerEntity } from '@open-mercato/core/modules/customers/data/entities'
import { escapeLikePattern } from '@open-mercato/shared/lib/db/escapeLikePattern'

export type CrmSearchResult = {
  objectType: 'person' | 'company' | 'deal'
  id: string
  title: string
  subtitle: string | null
  href: string
}

export async function searchCrmRecords(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  query: string,
  limitPerType = 10,
): Promise<CrmSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const pattern = `%${escapeLikePattern(q)}%`
  const results: CrmSearchResult[] = []

  const personFilter: FilterQuery<CustomerEntity> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    kind: 'person',
    deletedAt: null,
    displayName: { $like: pattern },
  }
  const people = await em.find(CustomerEntity, personFilter, { limit: limitPerType })
  for (const row of people) {
    results.push({
      objectType: 'person',
      id: row.id,
      title: row.displayName,
      subtitle: row.description ?? null,
      href: `/backend/customers/people-v2/${row.id}`,
    })
  }

  const companyFilter: FilterQuery<CustomerEntity> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    kind: 'company',
    deletedAt: null,
    displayName: { $like: pattern },
  }
  const companies = await em.find(CustomerEntity, companyFilter, { limit: limitPerType })
  for (const row of companies) {
    results.push({
      objectType: 'company',
      id: row.id,
      title: row.displayName,
      subtitle: row.description ?? null,
      href: `/backend/customers/companies-v2/${row.id}`,
    })
  }

  const dealFilter: FilterQuery<CustomerDeal> = {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    deletedAt: null,
    $or: [{ title: { $like: pattern } }, { description: { $like: pattern } }],
  }
  const deals = await em.find(CustomerDeal, dealFilter, { limit: limitPerType })
  for (const row of deals) {
    results.push({
      objectType: 'deal',
      id: row.id,
      title: row.title,
      subtitle: row.pipelineStage ?? row.status ?? null,
      href: `/backend/customers/deals/${row.id}`,
    })
  }

  return results
}
