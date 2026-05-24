import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { runIfsSilverExtractPilot } from '../../../../lib/ifs/extract-pilot'
import { reconcileIfsSilverPilot } from '../../../../lib/ifs/reconcile'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  POST: {
    summary: 'IFS silver extract pilot (Mercato → silver staging)',
    tags: ['production_planning'],
  },
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    let contract: string | undefined
    try {
      const body = (await request.json()) as { contract?: string }
      contract = body.contract
    } catch {
      contract = undefined
    }

    const extract = await runIfsSilverExtractPilot(em, { tenantId, organizationId }, { contract })
    const reconcile = await reconcileIfsSilverPilot(em, { tenantId, organizationId })

    return NextResponse.json({ extract, reconcile })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
