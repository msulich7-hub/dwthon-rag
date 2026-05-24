import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createProductionOperationBodySchema } from '../../../../data/validators'
import {
  createProductionOperation,
  getProductionOrder,
  listProductionOperations,
} from '../../../../lib/production-order'
import { resolveProductionPlanningRequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['production_planning.view'] },
  POST: { requireAuth: true, requireFeatures: ['production_planning.manage'] },
}

export const openApi = {
  GET: {
    summary: 'List routing operations for a production order',
    tags: ['production_planning'],
  },
  POST: {
    summary: 'Add a routing operation to a production order',
    tags: ['production_planning'],
  },
}

export async function GET(
  request: Request,
  ctx: { params: { orderId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const orderId = ctx.params?.orderId?.trim()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
    }

    const order = await getProductionOrder(em, { tenantId, organizationId }, orderId)
    if (!order) {
      throw new CrudHttpError(404, { error: 'Production order not found' })
    }

    const operations = await listProductionOperations(em, { tenantId, organizationId }, orderId)
    return NextResponse.json({ orderId, operations })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}

export async function POST(
  request: Request,
  ctx: { params: { orderId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveProductionPlanningRequestContext(request)
    const orderId = ctx.params?.orderId?.trim()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
    }

    const json = await request.json().catch(() => null)
    const body = createProductionOperationBodySchema.parse(json)

    const operation = await createProductionOperation(
      em,
      { tenantId, organizationId },
      orderId,
      body,
    )

    return NextResponse.json({ orderId, operation }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'PRODUCTION_ORDER_NOT_FOUND') {
      throw new CrudHttpError(404, { error: 'Production order not found' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
