import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { aggregateProductionProgressForSalesOrder } from '../../../../lib/production-progress'
import { loadSalesOrderContext } from '../../../../lib/sales-order-context'
import { resolveMesRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view', 'sales.orders.view'] },
}

export const openApi = {
  GET: { summary: 'Manufacturing progress for a sales order', tags: ['mes'] },
}

export async function GET(
  request: Request,
  ctx: { params: { salesOrderId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const salesOrderId = ctx.params?.salesOrderId?.trim()
    if (!salesOrderId) {
      return NextResponse.json({ error: 'Missing sales order id' }, { status: 400 })
    }

    const salesOrder = await loadSalesOrderContext(em, { tenantId, organizationId }, salesOrderId)
    if (!salesOrder.found) {
      throw new CrudHttpError(404, { error: 'Sales order not found' })
    }

    const progress = await aggregateProductionProgressForSalesOrder(em, {
      tenantId,
      organizationId,
    }, salesOrderId)

    return NextResponse.json({ salesOrderId, orderNumber: salesOrder.orderNumber, progress })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
