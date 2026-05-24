import { z } from 'zod'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { searchCrmRecords } from '../../lib/crm-search'
import { resolveCrm2027RequestContext } from '../../lib/request-context'

const querySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(30).default(10),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.people.view'] },
}

export const openApi = {
  GET: {
    summary: 'CRM 2027 unified search across people, companies, and deals',
    tags: ['crm_2027'],
  },
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const url = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(url.searchParams.entries()))
    const items = await searchCrmRecords(
      ctx.em,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      query.q,
      query.limit,
    )
    return Response.json({ items, total: items.length, query: query.q })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return Response.json(error.body, { status: error.status })
    }
    throw error
  }
}
