import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { buildPipelineForecast } from '../../../lib/pipeline-forecast'
import { resolveCrm2027RequestContext } from '../../../lib/request-context'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.deals.view'] },
}

export const openApi = {
  GET: {
    summary: 'Weighted pipeline forecast with CRM 2027 risk overlay',
    tags: ['crm_2027'],
  },
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const url = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(url.searchParams.entries()))

    const forecast = await buildPipelineForecast(
      ctx.em,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      query.limit,
    )

    return NextResponse.json(forecast)
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
