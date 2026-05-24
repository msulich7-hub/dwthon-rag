import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { aggregateWorkOrderDashboard } from '../../lib/work-order-status'
import { listWorkOrderStatusesForDashboard } from '../../lib/work-orders'
import { resolveMesRequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['mes.view'] },
}

export const openApi = {
  GET: {
    summary: 'MES dashboard KPIs (work order counts by status)',
    tags: ['mes'],
  },
}

export async function GET(request: Request) {
  try {
    const { em, tenantId, organizationId } = await resolveMesRequestContext(request)
    const statuses = await listWorkOrderStatusesForDashboard(em, {
      tenantId,
      organizationId,
    })
    const dashboard = aggregateWorkOrderDashboard(statuses)

    return NextResponse.json({ dashboard })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
