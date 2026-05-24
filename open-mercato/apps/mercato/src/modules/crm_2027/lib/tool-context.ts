import type { EntityManager } from '@mikro-orm/postgresql'
import type { AiToolExecutionContext } from '@open-mercato/ai-assistant'

export type Crm2027ToolContext = AiToolExecutionContext & {
  tenantId: string
  organizationId: string
}

export function assertCrm2027Scope(ctx: Crm2027ToolContext): void {
  if (!ctx.tenantId || !ctx.organizationId) {
    throw new Error('crm_2027 tools require tenant and organization scope')
  }
}

export function resolveEm(ctx: Crm2027ToolContext): EntityManager {
  return ctx.container.resolve<EntityManager>('em')
}

export function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null
  const ms = Date.now() - date.getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}
