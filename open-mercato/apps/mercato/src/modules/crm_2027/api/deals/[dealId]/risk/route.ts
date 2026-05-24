import { NextResponse } from 'next/server'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { Crm2027DealRiskFlag } from '../../../../data/entities'
import { resolveCrm2027RequestContext } from '../../../../lib/request-context'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['crm_2027.view', 'customers.deals.view'] },
}

export async function GET(
  request: Request,
  ctx: { params: { dealId: string } },
) {
  try {
    const { tenantId, organizationId, em } = await resolveCrm2027RequestContext(request)
    const dealId = ctx.params?.dealId?.trim()
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal id' }, { status: 400 })
    }

    const flag = await em.findOne(Crm2027DealRiskFlag, {
      tenantId,
      organizationId,
      dealId,
    })

    if (!flag) {
      return NextResponse.json({ dealId, atRisk: false })
    }

    let reasons: string[] = []
    try {
      const parsed = JSON.parse(flag.reasonsJson)
      reasons = Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      reasons = []
    }

    return NextResponse.json({
      dealId,
      atRisk: true,
      riskLevel: flag.riskLevel,
      dealTitle: flag.dealTitle,
      reasons,
      sentimentLabel: flag.sentimentLabel ?? null,
      daysSinceLastActivity: flag.daysSinceLastActivity ?? null,
      lastScannedAt: flag.lastScannedAt.toISOString(),
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }
}
