import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createWorkOrderBodySchema, listWorkOrdersQuerySchema } from '../../data/validators'
import { createWorkOrder, listWorkOrders } from '../../lib/work-orders'
import { resolveMesRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.manage'] },
}

export const openApi = {
  GET: {
    summary: 'List MES work orders for the current organization',
    tags: ['mes'],
  },
  POST: {
    summary: 'Create a manufacturing work order',
    tags: ['mes'],
  },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = listWorkOrdersQuerySchema.parse({
      dealId: url.searchParams.get('dealId') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })

    const workOrders = await listWorkOrders(
      em,
      { tenantId, organizationId },
      query,
    )

    return NextResponse.json({ workOrders })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = createWorkOrderBodySchema.parse(json)

    const workOrder = await createWorkOrder(em, { tenantId, organizationId }, body)

    return NextResponse.json({ workOrder }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'DEAL_NOT_FOUND') {
      throw new CrudHttpError(404, { error: 'Deal not found' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
