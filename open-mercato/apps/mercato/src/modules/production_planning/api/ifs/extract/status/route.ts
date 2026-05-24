import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { getIfsSilverExtractStatus } from '../../../../lib/ifs/extract-pilot'
import { reconcileIfsSilverPilot } from '../../../../lib/ifs/reconcile'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
}

export const openApi = {
  GET: {
    summary: 'IFS silver extract watermarks + reconcile snapshot',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const status = await getIfsSilverExtractStatus(em, { tenantId, organizationId })
    const reconcile = await reconcileIfsSilverPilot(em, { tenantId, organizationId })
    return NextResponse.json({ status, reconcile })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
