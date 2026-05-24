import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import {
  createProductionOrderBodySchema,
  listProductionOrdersQuerySchema,
} from '../../data/validators'
import { createProductionOrder, listProductionOrders } from '../../lib/production-order'
import { resolveProductionPlanningRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view', 'sales.orders.view'] },
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  GET: {
    summary: 'List production planning orders',
    tags: ['production_planning'],
  },
  POST: {
    summary: 'Create a production planning order',
    tags: ['production_planning'],
  },
}

export async function GET(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const url = new URL(request.url)
    const query = listProductionOrdersQuerySchema.parse({
      status: url.searchParams.get('status') ?? undefined,
      salesOrderId: url.searchParams.get('salesOrderId') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })

    const items = await listProductionOrders(
      em,
      { tenantId, organizationId },
      {
        status: query.status,
        salesOrderId: query.salesOrderId,
        limit: query.limit,
      },
    )

    return NextResponse.json({ items })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const json = await request.json().catch(() => null)
    const body = createProductionOrderBodySchema.parse(json)

    const order = await createProductionOrder(em, { tenantId, organizationId }, body)
    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
