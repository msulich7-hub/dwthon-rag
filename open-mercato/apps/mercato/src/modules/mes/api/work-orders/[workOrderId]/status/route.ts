import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { updateWorkOrderStatusBodySchema } from '../../../../data/validators'
import { updateWorkOrderStatus } from '../../../../lib/work-orders'
import { resolveMesRequestContext } from '../../../../lib/request-context'

export const metadata = {
  PATCH: { requireAuth: true, requireFeatures: ['mes.manage'] },
}

export const openApi = {
  PATCH: {
    summary: 'Transition a work order to a new manufacturing status',
    tags: ['mes'],
  },
}

export async function PATCH(
  request: Request,
  ctx: { params: { workOrderId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const workOrderId = ctx.params?.workOrderId?.trim()
    if (!workOrderId) {
      return NextResponse.json({ error: 'Missing work order id' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const body = updateWorkOrderStatusBodySchema.parse(json)

    const workOrder = await updateWorkOrderStatus(
      em,
      { tenantId, organizationId },
      workOrderId,
      body.status,
    )

    return NextResponse.json({ workOrder })
  } catch (error) {
    if (error instanceof Error && error.message === 'WORK_ORDER_NOT_FOUND') {
      throw new CrudHttpError(404, { error: 'Work order not found' })
    }
    if (error instanceof Error && error.message === 'INVALID_STATUS_TRANSITION') {
      throw new CrudHttpError(400, { error: 'Invalid status transition' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
