import type { EntityManager } from '@mikro-orm/postgresql'
import { User } from '@open-mercato/core/modules/auth/data/entities'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'

export type UserLabel = {
  name: string | null
  email: string | null
  label: string
}

export async function resolveUserLabelsByIds(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
  userIds: string[],
): Promise<Map<string, UserLabel>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (!uniqueIds.length) return new Map()

  const users = await findWithDecryption(
    em,
    User,
    { id: { $in: uniqueIds }, deletedAt: null },
    undefined,
    { tenantId: scope.tenantId, organizationId: scope.organizationId },
  )

  return new Map(
    users.map((user) => {
      const name = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : null
      const email = user.email ?? null
      return [user.id, { name, email, label: name ?? email ?? user.id }]
    }),
  )
}
