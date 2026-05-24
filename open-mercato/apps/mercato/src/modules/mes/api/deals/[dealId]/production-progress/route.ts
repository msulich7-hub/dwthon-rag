import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { aggregateProductionProgressForDeal } from '../../../../lib/production-progress'
import { resolveMesRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view', 'customers.deals.view'] },
}

export const openApi = {
  GET: { summary: 'Manufacturing progress for a CRM deal', tags: ['mes'] },
}

export async function GET(
  request: Request,
  ctx: { params: { dealId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const dealId = ctx.params?.dealId?.trim()
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal id' }, { status: 400 })
    }

    const progress = await aggregateProductionProgressForDeal(em, { tenantId, organizationId }, dealId)
    return NextResponse.json({ dealId, progress })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
