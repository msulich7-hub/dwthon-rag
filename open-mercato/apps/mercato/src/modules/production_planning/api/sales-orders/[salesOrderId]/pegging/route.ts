import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { buildSalesOrderPeggingView } from '../../../../lib/sales-order-pegging'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view', 'sales.orders.view'] },
}

export async function GET(
  request: Request,
  context: { params: Promise<{ salesOrderId: string }> },
) {
  try {
    const { salesOrderId } = await context.params
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const view = await buildSalesOrderPeggingView(em, { tenantId, organizationId }, salesOrderId)
    return NextResponse.json(view)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
