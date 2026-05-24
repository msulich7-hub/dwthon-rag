import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import {
  listWhatIfTemplates,
  loadWhatIfRegistry,
  type WhatIfAudience,
  type WhatIfDimension,
  type WhatIfTier,
} from '../../../lib/what-if-registry'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

const querySchema = z.object({
  dimension: z
    .enum([
      'demand_shock',
      'supply_disruption',
      'capacity',
      'routing',
      'priority',
      'cost',
      'horizon',
    ])
    .optional(),
  tier: z.enum(['S', 'M', 'L', 'XL']).optional(),
  audience: z.enum(['planner', 'sop', 'exec', 'analytics']).optional(),
})

export async function GET(request: Request) {
  try {
    await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const query = querySchema.parse({
      dimension: url.searchParams.get('dimension') ?? undefined,
      tier: url.searchParams.get('tier') ?? undefined,
      audience: url.searchParams.get('audience') ?? undefined,
    })

    const registry = loadWhatIfRegistry()
    const templates = listWhatIfTemplates({
      dimension: query.dimension as WhatIfDimension | undefined,
      tier: query.tier as WhatIfTier | undefined,
      audience: query.audience as WhatIfAudience | undefined,
    })

    return NextResponse.json({
      version: registry.version,
      defaults: registry.defaults,
      objectiveProfiles: registry.objectiveProfiles,
      count: templates.length,
      templates,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
