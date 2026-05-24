import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { getProductionOutputForWorkOrder } from '../../../lib/production-output'
import { getWorkOrder } from '../../../lib/work-orders'
import { listWorkOrderOperations } from '../../../lib/work-order-operations'
import { resolveMesRequestContext } from '../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view'] },
}

export const openApi = {
  GET: { summary: 'Get a single MES work order with operations', tags: ['mes'] },
}

export async function GET(
  request: Request,
  ctx: { params: { workOrderId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const workOrderId = ctx.params?.workOrderId?.trim()
    if (!workOrderId) {
      return NextResponse.json({ error: 'Missing work order id' }, { status: 400 })
    }

    const workOrder = await getWorkOrder(em, { tenantId, organizationId }, workOrderId)
    if (!workOrder) {
      throw new CrudHttpError(404, { error: 'Work order not found' })
    }

    const operations = await listWorkOrderOperations(em, { tenantId, organizationId }, workOrderId)
    const productionOutput = await getProductionOutputForWorkOrder(
      em,
      { tenantId, organizationId },
      workOrderId,
    )

    return NextResponse.json({ workOrder, operations, productionOutput })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
