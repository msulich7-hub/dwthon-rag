import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { applyRoutingBodySchema } from '../../../../../data/validators'
import { applyRoutingToWorkOrder } from '../../../../../lib/work-order-operations'
import { resolveMesRequestContext } from '../../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['mes.manage'] },
}

export const openApi = {
  POST: { summary: 'Apply routing template to work order', tags: ['mes'] },
}

export async function POST(
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
    const body = applyRoutingBodySchema.parse(json ?? {})

    const result = await applyRoutingToWorkOrder(
      em,
      { tenantId, organizationId },
      workOrderId,
      body.routingTemplateId,
    )

    return NextResponse.json({ workOrderId, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'WORK_ORDER_NOT_FOUND') {
        throw new CrudHttpError(404, { error: 'Work order not found' })
      }
      if (error.message === 'OPERATIONS_ALREADY_EXIST') {
        throw new CrudHttpError(409, { error: 'Work order already has operations' })
      }
      if (error.message === 'ROUTING_TEMPLATE_NOT_FOUND') {
        throw new CrudHttpError(404, { error: 'Routing template not found' })
      }
      if (error.message === 'WORK_ORDER_NOT_RELEASABLE') {
        throw new CrudHttpError(400, { error: 'Work order cannot be released' })
      }
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
