import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { compareScenarios } from '../../../lib/scenario-compare'
import { getPlanScenario } from '../../../lib/plan-scenario-service'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

const querySchema = z.object({
  baseline: z.string().uuid(),
  a: z.string().uuid().optional(),
  b: z.string().uuid().optional(),
  c: z.string().uuid().optional(),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } =
      await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const query = querySchema.parse({
      baseline: url.searchParams.get('baseline'),
      a: url.searchParams.get('a') ?? undefined,
      b: url.searchParams.get('b') ?? undefined,
      c: url.searchParams.get('c') ?? undefined,
    })

    const baseline = await getPlanScenario(em, { tenantId, organizationId }, query.baseline)
    if (!baseline) {
      throw new CrudHttpError(404, { error: 'Baseline scenario not found' })
    }
    if (baseline.status !== 'completed' || !baseline.kpiSnapshot) {
      throw new CrudHttpError(400, { error: 'Baseline scenario has no completed KPI snapshot' })
    }

    const otherIds = [query.a, query.b, query.c].filter((id): id is string => Boolean(id))
    const others = await Promise.all(
      otherIds.map((id) => getPlanScenario(em, { tenantId, organizationId }, id)),
    )

    for (const s of others) {
      if (!s) {
        throw new CrudHttpError(404, { error: 'One or more compare scenarios not found' })
      }
    }

    const comparison = compareScenarios(
      baseline,
      others.filter((s): s is NonNullable<typeof s> => Boolean(s)),
    )

    return NextResponse.json(comparison)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
