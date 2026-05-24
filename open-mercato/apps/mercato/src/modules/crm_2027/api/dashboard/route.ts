import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { scanAtRiskDeals } from '../../lib/at-risk-scan'
import { resolveCrm2027RequestContext } from '../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view'] },
}

export const openApi = {
  GET: { summary: 'CRM 2027 dashboard KPIs', tags: ['crm_2027'] },
}

export async function GET(request: Request) {
  try {
    const ctx = await resolveCrm2027RequestContext(request)
    const atRisk = await scanAtRiskDeals(ctx.em, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      limit: 100,
    })
    const high = atRisk.filter((d) => d.riskLevel === 'high').length
    const medium = atRisk.filter((d) => d.riskLevel === 'medium').length

    return Response.json({
      atRiskTotal: atRisk.length,
      atRiskHigh: high,
      atRiskMedium: medium,
      topAtRisk: atRisk.slice(0, 5),
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return Response.json(error.body, { status: error.status })
    }
    throw error
  }
}
