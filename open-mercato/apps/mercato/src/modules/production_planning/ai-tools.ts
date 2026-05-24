import { z } from 'zod'
import { defineAiTool } from '@open-mercato/ai-assistant'
import { buildCapacitySnapshot } from './lib/capacity-snapshot'
import { resolveEm, type ProductionPlanningToolContext } from './lib/tool-context'

function assertScope(ctx: ProductionPlanningToolContext) {
  if (!ctx.tenantId || !ctx.organizationId) {
    throw new Error('production_planning: missing tenant or organization scope')
  }
}

const capacitySnapshot = defineAiTool({
  name: 'production_planning.capacity_snapshot',
  description: 'Returns work-center utilization and late-order counts for the current organization.',
  isMutation: false,
  requiredFeatures: ['production_planning.view'],
  inputSchema: z.object({
    horizonHours: z.number().int().min(24).max(24 * 30).optional(),
  }),
  async handler(input, ctx) {
    assertScope(ctx as ProductionPlanningToolContext)
    const em = resolveEm(ctx as ProductionPlanningToolContext)
    const { tenantId, organizationId } = ctx as ProductionPlanningToolContext
    return buildCapacitySnapshot(em, { tenantId, organizationId }, { horizonHours: input.horizonHours })
  },
})

export const aiTools = [capacitySnapshot]
export default aiTools
