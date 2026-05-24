import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { bootstrapGenesisFromSilver } from '../../../../lib/mrp/netting-from-silver'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  POST: {
    summary: 'Bootstrap genesis roots from Mercato silver CO lines (no IFS JDBC)',
    tags: ['production_planning'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const result = await bootstrapGenesisFromSilver(em, { tenantId, organizationId })
    return NextResponse.json(result)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
