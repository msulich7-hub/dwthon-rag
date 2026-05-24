import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { executeNettingRun } from '../../../../lib/mrp/netting-run'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

const bodySchema = z.object({
  mode: z.enum(['full', 'incremental']).optional(),
  bootstrapFromSilver: z.boolean().optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  POST: { summary: 'Run MRP netting (genesis + pool MO)', tags: ['production_planning'] },
  GET: { summary: 'List recent netting runs', tags: ['production_planning'] },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const json = await request.json().catch(() => ({}))
    const body = bodySchema.parse(json)
    const result = await executeNettingRun(em, { tenantId, organizationId }, {
      mode: body.mode,
      bootstrapFromSilver: body.bootstrapFromSilver,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const { ProductionPlanningNettingRun } = await import('../../../../data/entities')
    const runs = await em.find(
      ProductionPlanningNettingRun,
      { tenantId, organizationId },
      { orderBy: { createdAt: 'DESC' }, limit: 20 },
    )
    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        mode: r.mode,
        status: r.status,
        rootsProcessed: r.rootsProcessed,
        poolMoCreated: r.poolMoCreated,
        peggingLinksCreated: r.peggingLinksCreated,
        naiveMoCount: r.naiveMoCount,
        consolidatedMoCount: r.consolidatedMoCount,
        message: r.message,
        completedAt: r.completedAt?.toISOString() ?? null,
      })),
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
