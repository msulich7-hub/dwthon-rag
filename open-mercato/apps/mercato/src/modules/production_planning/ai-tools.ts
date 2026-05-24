import { z } from 'zod'
import { defineAiTool } from '@open-mercato/ai-assistant'
import { runAntiFantasyChecks } from './lib/anti-fantasy'
import { buildCapacitySnapshot } from './lib/capacity-snapshot'
import { buildHindsightOverview } from './lib/hindsight/hindsight-service'
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

const antiFantasyValidate = defineAiTool({
  name: 'production_planning.anti_fantasy_validate',
  description: 'Runs AF-01..03 schedule sanity checks on the current Mercato plan.',
  isMutation: false,
  requiredFeatures: ['production_planning.view'],
  inputSchema: z.object({
    horizonHours: z.number().int().min(24).max(720).optional(),
  }),
  async handler(input, ctx) {
    assertScope(ctx as ProductionPlanningToolContext)
    const em = resolveEm(ctx as ProductionPlanningToolContext)
    const { tenantId, organizationId } = ctx as ProductionPlanningToolContext
    return runAntiFantasyChecks(em, { tenantId, organizationId }, { horizonHours: input.horizonHours })
  },
})

const hindsightChaos = defineAiTool({
  name: 'production_planning.hindsight_chaos',
  description: 'Chaos premium PLN estimates vs baseline from completed what-if scenarios.',
  isMutation: false,
  requiredFeatures: ['production_planning.view'],
  inputSchema: z.object({
    baselineScenarioId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async handler(input, ctx) {
    assertScope(ctx as ProductionPlanningToolContext)
    const em = resolveEm(ctx as ProductionPlanningToolContext)
    const { tenantId, organizationId } = ctx as ProductionPlanningToolContext
    return buildHindsightOverview(em, { tenantId, organizationId }, {
      baselineScenarioId: input.baselineScenarioId,
      limit: input.limit,
    })
  },
})

export const aiTools = [capacitySnapshot, antiFantasyValidate, hindsightChaos]
export default aiTools
