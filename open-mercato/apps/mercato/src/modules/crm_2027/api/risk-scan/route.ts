import { z } from 'zod'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { scanAtRiskDeals } from '../../lib/at-risk-scan'
import { persistAtRiskFlags } from '../../lib/persist-risk-flags'
import { resolveCrm2027RequestContext } from '../../lib/request-context'
import { CRM_2027_RISK_SCAN_QUEUE, getCrm2027Queue } from '../../lib/queue'
import { emitHighRiskDealEvents } from '../../lib/emit-high-risk-events'

const bodySchema = z.object({
  mode: z.enum(['sync', 'async']).default('async'),
  stallDays: z.number().int().min(7).max(90).optional(),
})

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['crm_2027.manage'] },
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const json = await request.json().catch(() => ({}))
    const parsed = bodySchema.parse(json)
    const stallDays = parsed.stallDays ?? 14

    if (parsed.mode === 'async') {
      const queue = getCrm2027Queue(CRM_2027_RISK_SCAN_QUEUE)
      await queue.add('scan', {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        stallDays,
      })
      return Response.json({ ok: true, mode: 'async', queue: CRM_2027_RISK_SCAN_QUEUE })
    }

    const items = await scanAtRiskDeals(ctx.em, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      stallDays,
    })

    const { count: flagged, newHighRiskAlerts } = await persistAtRiskFlags(
      ctx.em,
      { tenantId: ctx.tenantId, organizationId: ctx.organizationId },
      items,
    )

    await emitHighRiskDealEvents(ctx.container, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
    }, newHighRiskAlerts)

    return Response.json({ ok: true, mode: 'sync', flagged, alerts: newHighRiskAlerts.length, items })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return Response.json(error.body, { status: error.status })
    }
    throw error
  }
}
