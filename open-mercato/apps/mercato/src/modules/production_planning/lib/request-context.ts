import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { resolveOrganizationScopeForRequest } from '@open-mercato/core/modules/directory/utils/organizationScope'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import type { CommandBus } from '@open-mercato/shared/lib/commands'

export type ProductionPlanningRequestContext = {
  container: Awaited<ReturnType<typeof createRequestContainer>>
  tenantId: string
  organizationId: string
  em: EntityManager
  commandBus: CommandBus
  commandContext: CommandRuntimeContext
}

export async function resolveProductionPlanningRequestContext(
  request: Request,
): Promise<ProductionPlanningRequestContext> {
  const container = await createRequestContainer()
  const auth = await getAuthFromRequest(request)
  if (!auth?.tenantId) {
    throw new CrudHttpError(401, { error: 'Unauthorized' })
  }

  const scope = await resolveOrganizationScopeForRequest({ container, auth, request })
  const organizationId = scope?.selectedId ?? auth.orgId ?? null
  if (!organizationId) {
    throw new CrudHttpError(400, { error: 'Organization scope required' })
  }

  const em = (container.resolve('em') as EntityManager).fork()
  const commandBus = container.resolve('commandBus') as CommandBus

  return {
    container,
    tenantId: auth.tenantId,
    organizationId,
    em,
    commandBus,
    commandContext: {
      container,
      auth,
      organizationScope: scope,
      selectedOrganizationId: organizationId,
      organizationIds: scope?.filterIds ?? (auth.orgId ? [auth.orgId] : null),
      request,
    },
  }
}
