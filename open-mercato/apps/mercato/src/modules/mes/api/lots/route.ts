import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createLotBodySchema, listLotsQuerySchema } from '../../data/validators'
import { createLot, listLots } from '../../lib/lots'
import { resolveMesRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.trace.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.trace.manage'] },
}

export const openApi = {
  GET: { summary: 'List MES lots', tags: ['mes'] },
  POST: { summary: 'Create a lot', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = listLotsQuerySchema.parse({
      productCode: url.searchParams.get('productCode') ?? undefined,
      workOrderId: url.searchParams.get('workOrderId') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })
    const lots = await listLots(em, { tenantId, organizationId }, query)
    return NextResponse.json({ lots })
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
    const body = createLotBodySchema.parse(json)
    const lot = await createLot(em, { tenantId, organizationId }, body)
    return NextResponse.json({ lot }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'LOT_NUMBER_EXISTS') {
      throw new CrudHttpError(409, { error: 'Lot number already exists' })
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
