import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { listWorkOrders } from '../../../../lib/work-orders'
import { createWorkOrdersFromSalesOrder } from '../../../../lib/work-orders-from-sales'
import { loadSalesOrderContext } from '../../../../lib/sales-order-context'
import { resolveMesRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view', 'sales.orders.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.manage', 'sales.orders.view'] },
}

export const openApi = {
  GET: {
    summary: 'List MES work orders linked to a sales order',
    tags: ['mes'],
  },
  POST: {
    summary: 'Create work orders from sales order line items',
    tags: ['mes'],
  },
}

const createFromSalesBodySchema = z.object({
  dealId: z.string().uuid().optional(),
  skipExistingProductCodes: z.boolean().optional(),
})

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

    const workOrders = await listWorkOrders(em, { tenantId, organizationId }, { salesOrderId })

    return NextResponse.json({
      salesOrderId,
      orderNumber: salesOrder.orderNumber,
      workOrders,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(
  request: Request,
  ctx: { params: { salesOrderId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const salesOrderId = ctx.params?.salesOrderId?.trim()
    if (!salesOrderId) {
      return NextResponse.json({ error: 'Missing sales order id' }, { status: 400 })
    }

    const json = await request.json().catch(() => ({}))
    const body = createFromSalesBodySchema.parse(json)

    const result = await createWorkOrdersFromSalesOrder(
      em,
      { tenantId, organizationId },
      salesOrderId,
      {
        dealId: body.dealId,
        skipExistingProductCodes: body.skipExistingProductCodes ?? true,
      },
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'SALES_ORDER_NOT_FOUND') {
      throw new CrudHttpError(404, { error: 'Sales order not found' })
    }
    if (error instanceof Error && error.message === 'DEAL_NOT_FOUND') {
      throw new CrudHttpError(404, { error: 'Deal not found' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
