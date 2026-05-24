import type { EntityManager } from '@mikro-orm/postgresql'
import type { CommandBus } from '@open-mercato/shared/lib/commands'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import type { AwilixContainer } from 'awilix'

export type WebhookRequestContext = {
  container: AwilixContainer
  tenantId: string
  organizationId: string
  em: EntityManager
  commandBus: CommandBus
  commandContext: CommandRuntimeContext
}

export async function resolveWebhookContext(
  request: Request,
  scopeOverride?: { tenantId?: string; organizationId?: string },
): Promise<WebhookRequestContext> {
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

  throw new CrudHttpError(400, {
    error: 'tenantId and organizationId required for unauthenticated webhooks',
  })
}
