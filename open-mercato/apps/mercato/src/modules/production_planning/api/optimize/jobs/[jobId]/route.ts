import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { getCpsatOptimizeJob } from '../../../../lib/cpsat-optimize-job'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'Get CP-SAT async optimization job status',
    tags: ['production_planning'],
  },
}

type RouteContext = { params: Promise<{ jobId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const { jobId } = await context.params

    const job = await getCpsatOptimizeJob(em, { tenantId, organizationId }, jobId)
    if (!job) {
      throw new CrudHttpError(404, { error: 'Optimization job not found' })
    }

    return NextResponse.json({ job })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
