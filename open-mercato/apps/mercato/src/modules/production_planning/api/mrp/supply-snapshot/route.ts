import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { buildMercatoSupplySnapshot } from '../../../lib/mrp/supply-snapshot'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const lines = await buildMercatoSupplySnapshot(em, { tenantId, organizationId })
    return NextResponse.json({ lines, source: 'mercato_derived' })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
