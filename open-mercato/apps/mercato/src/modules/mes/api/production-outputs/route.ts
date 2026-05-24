import { NextResponse } from 'next/server'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { z } from 'zod'
import { recordProductionOutputBodySchema } from '../../data/validators'
import { getProductionOutputForWorkOrder, recordProductionOutput } from '../../lib/production-output'
import { resolveMesRequestContext } from '../../lib/request-context'

const getQuerySchema = z.object({
  workOrderId: z.string().uuid(),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.trace.view'] },
  POST: { requireAuth: true, requireFeatures: ['mes.trace.manage'] },
}

export const openApi = {
  GET: { summary: 'Get production output for a work order', tags: ['mes'] },
  POST: { summary: 'Record production output lot and optional serial', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = getQuerySchema.parse({
      workOrderId: url.searchParams.get('workOrderId') ?? undefined,
    })

    const output = await getProductionOutputForWorkOrder(
      em,
      { tenantId, organizationId },
      query.workOrderId,
    )

    return NextResponse.json({ output })
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
    const body = recordProductionOutputBodySchema.parse(json)
    const output = await recordProductionOutput(em, { tenantId, organizationId }, body)
    return NextResponse.json({ output }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      const statusByCode: Record<string, number> = {
        WORK_ORDER_NOT_FOUND: 404,
        WORK_ORDER_NOT_COMPLETED: 409,
        OUTPUT_ALREADY_RECORDED: 409,
      }
      const status = statusByCode[error.message]
      if (status) {
        return NextResponse.json({ error: error.message }, { status })
      }
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
