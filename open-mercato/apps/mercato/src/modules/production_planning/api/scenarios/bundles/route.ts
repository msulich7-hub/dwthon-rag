import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listWhatIfBundles, loadWhatIfRegistry } from '../../../lib/what-if-registry'
import { resolveProductionPlanningRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export async function GET(request: Request) {
  try {
    await resolveProductionPlanningRequestContext(request)
    const registry = loadWhatIfRegistry()
    const bundles = listWhatIfBundles()
    return NextResponse.json({
      version: registry.version,
      count: bundles.length,
      bundles,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
