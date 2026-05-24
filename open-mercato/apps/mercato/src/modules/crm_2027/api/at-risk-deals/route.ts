import { z } from 'zod'
import type { EntityManager } from '@mikro-orm/postgresql'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { Crm2027DealRiskFlag } from '../../data/entities'
import { scanAtRiskDeals } from '../../lib/at-risk-scan'
import { resolveCrm2027RequestContext } from '../../lib/request-context'

const querySchema = z.object({
  source: z.enum(['live', 'stored', 'both']).default('both'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  stallDays: z.coerce.number().int().min(7).max(90).default(14),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.deals.view'] },
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const url = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(url.searchParams.entries()))

    let liveItems: Awaited<ReturnType<typeof scanAtRiskDeals>> = []
    if (query.source === 'live' || query.source === 'both') {
      liveItems = await scanAtRiskDeals(ctx.em, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        limit: query.limit,
        stallDays: query.stallDays,
      })
    }

    let storedItems: Array<Record<string, unknown>> = []
    if (query.source === 'stored' || query.source === 'both') {
      const em = ctx.em as EntityManager
      const flags = await em.find(
        Crm2027DealRiskFlag,
        { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
        { orderBy: { lastScannedAt: 'DESC' }, limit: query.limit },
      )
      storedItems = flags.map((flag) => ({
        id: flag.id,
        dealId: flag.dealId,
        title: flag.dealTitle,
        riskLevel: flag.riskLevel,
        reasons: JSON.parse(flag.reasonsJson) as string[],
        daysSinceLastActivity: flag.daysSinceLastActivity ?? null,
        sentimentLabel: flag.sentimentLabel ?? null,
        lastScannedAt: flag.lastScannedAt.toISOString(),
        source: 'stored',
      }))
    }

    const liveMapped = liveItems.map((item) => ({
      dealId: item.dealId,
      title: item.title,
      riskLevel: item.riskLevel,
      reasons: item.reasons,
      daysSinceLastActivity: item.daysSinceLastActivity,
      sentimentLabel: item.sentimentLabel,
      source: 'live',
    }))

    return Response.json({
      items: query.source === 'stored' ? storedItems : [...liveMapped, ...storedItems],
      total: liveMapped.length + storedItems.length,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return Response.json(error.body, { status: error.status })
    }
    throw error
  }
}
