import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { buildCapacitySnapshot } from '../../lib/capacity-snapshot'
import { isHexalyBridgeConfigured, requestHexalyOptimization } from '../../lib/hexaly-bridge'
import { listProductionOrders } from '../../lib/production-order'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'

const optimizeBodySchema = z.object({
  productionOrderIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  horizonHours: z.number().int().min(24).max(24 * 30).optional(),
  objective: z.enum(['minimize_lateness', 'minimize_changeover', 'balance_load']).optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  POST: {
    summary: 'Run production schedule optimization (Hexaly bridge or local fallback)',
    tags: ['production_planning'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const json = await request.json().catch(() => ({}))
    const body = optimizeBodySchema.parse(json)

    const orders = await listProductionOrders(em, { tenantId, organizationId }, { limit: 500 })
    const orderIds =
      body.productionOrderIds ?? orders.map((o) => o.id).slice(0, 100)

    const snapshot = await buildCapacitySnapshot(
      em,
      { tenantId, organizationId },
      { horizonHours: body.horizonHours },
    )

    const hexaly = await requestHexalyOptimization({
      tenantId,
      organizationId,
      productionOrderIds: orderIds,
      horizonHours: body.horizonHours,
      objective: body.objective,
    })

    return NextResponse.json({
      hexalyConfigured: isHexalyBridgeConfigured(),
      snapshot,
      optimization: hexaly,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
