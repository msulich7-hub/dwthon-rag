import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { listUpcomingCalendar } from '../../../lib/calendar-upcoming'
import { resolveCrm2027RequestContext } from '../../../lib/request-context'

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  dealId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.deals.view'] },
}

export const openApi = {
  GET: {
    summary: 'Upcoming meetings and calls from customers interactions',
    tags: ['crm_2027'],
  },
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const url = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(url.searchParams.entries()))

    const items = await listUpcomingCalendar(
      ctx.em,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      query,
    )

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
