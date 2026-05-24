import { NextResponse } from 'next/server'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { operationConfirmationBodySchema } from '../../../../../../data/validators'
import { confirmWorkOrderOperation } from '../../../../../../lib/operation-confirmations'
import { resolveMesRequestContext } from '../../../../../../lib/request-context'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['mes.execute'] },
}

export const openApi = {
  POST: { summary: 'Confirm shop-floor operation (start/complete/partial)', tags: ['mes'] },
}

export async function POST(
  request: Request,
  ctx: { params: { workOrderId: string; operationId: string } },
) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const auth = await getAuthFromRequest(request)
    const workOrderId = ctx.params?.workOrderId?.trim()
    const operationId = ctx.params?.operationId?.trim()
    if (!workOrderId || !operationId) {
      return NextResponse.json({ error: 'Missing ids' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const body = operationConfirmationBodySchema.parse(json ?? { confirmationType: 'start' })

    const result = await confirmWorkOrderOperation(
      em,
      { tenantId, organizationId },
      workOrderId,
      operationId,
      body,
      auth?.userId ?? null,
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, { status: number; error: string }> = {
        OPERATION_NOT_FOUND: { status: 404, error: 'Operation not found' },
        WORK_ORDER_NOT_FOUND: { status: 404, error: 'Work order not found' },
        INVALID_STATUS_TRANSITION: { status: 400, error: 'Invalid status transition' },
        INVALID_CONFIRMATION_QTY: { status: 400, error: 'Invalid confirmation quantity' },
        PRIOR_OPERATIONS_INCOMPLETE: { status: 400, error: 'Prior operations must be completed' },
      }
      const mapped = map[error.message]
      if (mapped) throw new CrudHttpError(mapped.status, { error: mapped.error })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
