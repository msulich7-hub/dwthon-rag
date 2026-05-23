import type { Crm2027RequestContext } from './request-context'
import { resolveCrm2027RequestContext } from './request-context'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { CommandBus } from '@open-mercato/shared/lib/commands'

export async function resolveWebhookCrmContext(
  request: Request,
  scopeOverride?: { tenantId?: string; organizationId?: string },
): Promise<Crm2027RequestContext> {
  if (scopeOverride?.tenantId && scopeOverride?.organizationId) {
    const container = await createRequestContainer()
    const em = (container.resolve('em') as EntityManager).fork()
    const commandBus = container.resolve('commandBus') as CommandBus
    return {
      container,
      tenantId: scopeOverride.tenantId,
      organizationId: scopeOverride.organizationId,
      em,
      commandBus,
      commandContext: {
        container,
        auth: {
          tenantId: scopeOverride.tenantId,
          orgId: scopeOverride.organizationId,
        },
        organizationScope: null,
        selectedOrganizationId: scopeOverride.organizationId,
        organizationIds: [scopeOverride.organizationId],
        request,
      },
    }
  }

  try {
    return await resolveCrm2027RequestContext(request)
  } catch {
    throw new CrudHttpError(400, {
      error: 'tenantId and organizationId required for unauthenticated webhooks',
    })
  }
}
