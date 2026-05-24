import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listProductionOrders } from '../../../../lib/production-order'
import { loadSalesOrderSummary } from '../../../../lib/sales-order-bridge'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view', 'sales.orders.view'] },
}

export const openApi = {
  GET: {
    summary: 'Production orders linked to a sales order',
    tags: ['production_planning'],
  },
}

export async function GET(
  request: Request,
  ctx: { params: { salesOrderId: string } },
) {
  try {
    const { tenantId, organizationId, em, commandBus, commandContext } =
      await resolveProductionPlanningRequestContext(request)
    const salesOrderId = ctx.params?.salesOrderId?.trim()
    if (!salesOrderId) {
      return NextResponse.json({ error: 'Missing sales order id' }, { status: 400 })
    }

    const salesOrder = await loadSalesOrderSummary(commandBus, commandContext, salesOrderId)
    const items = await listProductionOrders(
      em,
      { tenantId, organizationId },
      { salesOrderId, limit: 50 },
    )

    return NextResponse.json({ salesOrderId, salesOrder, items })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
