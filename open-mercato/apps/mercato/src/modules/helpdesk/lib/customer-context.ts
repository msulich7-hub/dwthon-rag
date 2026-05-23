import type { EntityManager } from '@mikro-orm/postgresql'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { CustomerEntity } from '@open-mercato/core/modules/customers/data/entities'

export type CustomerLinkKind = 'company' | 'person'

export async function assertCustomerLink(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  kind: CustomerLinkKind,
  customerId: string,
): Promise<{ id: string; displayName: string }> {
  const expectedKind = kind === 'company' ? 'company' : 'person'
  const rows = await findWithDecryption(em, CustomerEntity, {
    id: customerId,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    kind: expectedKind,
    deletedAt: null,
  })
  const entity = rows[0]
  if (!entity) {
    throw new Error('CUSTOMER_NOT_FOUND')
  }
  return { id: entity.id, displayName: entity.displayName }
}
