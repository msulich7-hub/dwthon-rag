import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listDispatchQueueQuerySchema } from '../../data/validators'
import { listDispatchQueue } from '../../lib/dispatch-queue'
import { resolveMesRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view'] },
}

export const openApi = {
  GET: { summary: 'MES dispatch queue (ready and in-progress operations)', tags: ['mes'] },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const url = new URL(request.url)
    const query = listDispatchQueueQuerySchema.parse({
      workCenterCode: url.searchParams.get('workCenterCode') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })

    const queue = await listDispatchQueue(em, { tenantId, organizationId }, query)
    return NextResponse.json({ queue })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
