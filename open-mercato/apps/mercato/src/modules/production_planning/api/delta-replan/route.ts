import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { runDeltaReplan } from '../../lib/delta-replan'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'

const bodySchema = z.object({
  runOptimize: z.boolean().optional(),
  horizonHours: z.number().int().min(24).max(720).optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  POST: {
    summary: 'Delta replan: incremental netting + CP-SAT (Mercato-only)',
    tags: ['production_planning'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const json = await request.json().catch(() => ({}))
    const body = bodySchema.parse(json)
    const result = await runDeltaReplan(em, { tenantId, organizationId }, body)
    return NextResponse.json(result)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
