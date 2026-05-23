import type { EntityManager } from '@mikro-orm/postgresql'
import type { AiToolExecutionContext } from '@open-mercato/ai-assistant'

export type ProductionPlanningToolContext = AiToolExecutionContext & {
  tenantId: string
  organizationId: string
}

export function resolveEm(ctx: ProductionPlanningToolContext): EntityManager {
  return ctx.container.resolve<EntityManager>('em')
}
