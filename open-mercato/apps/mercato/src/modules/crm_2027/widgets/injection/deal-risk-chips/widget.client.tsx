"use client"

import * as React from 'react'
import Link from 'next/link'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { CRM_ROUTES } from '../../../lib/crm-routes'

type DealRiskResponse = {
  dealId: string
  atRisk: boolean
  riskLevel?: 'medium' | 'high'
  reasons?: string[]
  sentimentLabel?: string | null
  daysSinceLastActivity?: number | null
}

type HostContext = {
  dealId?: string
  recordId?: string
  data?: { deal?: { id?: string } }
}

function readDealId(context: HostContext | undefined): string | null {
  const fromCtx = context?.dealId ?? context?.recordId ?? context?.data?.deal?.id
  return typeof fromCtx === 'string' && fromCtx.length > 0 ? fromCtx : null
}

export default function DealRiskChipsWidget({
  context,
}: {
  context?: HostContext
  data?: HostContext['data']
}) {
  const dealId = readDealId(context)
  const [risk, setRisk] = React.useState<DealRiskResponse | null>(null)

  React.useEffect(() => {
    if (!dealId) return
    void apiCall<DealRiskResponse>(`/api/crm_2027/deals/${encodeURIComponent(dealId)}/risk`)
      .then(({ result }) => setRisk(result ?? null))
      .catch(() => setRisk(null))
  }, [dealId])

  if (!dealId || !risk?.atRisk) return null

  const level = risk.riskLevel ?? 'medium'
  const tone =
    level === 'high'
      ? 'border-destructive/50 bg-destructive/10 text-destructive'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'

  return (
    <div className="flex flex-wrap items-center gap-1" data-crm-2027-deal-risk-chips="">
      <span className={`text-xs rounded-full border px-2 py-0.5 font-medium ${tone}`}>
        {level === 'high' ? 'High risk' : 'At risk'}
      </span>
      {risk.sentimentLabel ? (
        <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
          {risk.sentimentLabel}
        </span>
      ) : null}
      {typeof risk.daysSinceLastActivity === 'number' ? (
        <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
          {risk.daysSinceLastActivity}d idle
        </span>
      ) : null}
      <Link href={CRM_ROUTES.atRisk} className="text-xs underline text-muted-foreground">
        Board
      </Link>
    </div>
  )
}
