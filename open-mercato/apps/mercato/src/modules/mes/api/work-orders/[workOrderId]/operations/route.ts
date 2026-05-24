import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listWorkOrderOperations } from '../../../../lib/work-order-operations'
import { resolveMesRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view'] },
}

export const openApi = {
  GET: { summary: 'List operations for a work order', tags: ['mes'] },
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

    const operations = await listWorkOrderOperations(em, { tenantId, organizationId }, workOrderId)
    return NextResponse.json({ workOrderId, operations })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
