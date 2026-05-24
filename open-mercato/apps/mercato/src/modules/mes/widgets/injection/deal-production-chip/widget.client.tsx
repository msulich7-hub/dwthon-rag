"use client"

import * as React from 'react'
import Link from 'next/link'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MES_ROUTES } from '../../../lib/mes-routes'

type HostContext = {
  dealId?: string
  recordId?: string
  data?: { deal?: { id?: string } }
}

type WorkOrdersResponse = {
  workOrders: Array<{ id: string; status: string }>
}

type ProgressResponse = {
  progress: { percentComplete: number; totalOperations: number; active: number }
}

function readDealId(context: HostContext | undefined, data: HostContext['data'] | undefined): string | null {
  const dealRecord = data?.deal ?? context?.data?.deal
  const id =
    (typeof context?.dealId === 'string' && context.dealId) ||
    (typeof context?.recordId === 'string' && context.recordId) ||
    (typeof dealRecord?.id === 'string' && dealRecord.id) ||
    null
  return id && id.length > 0 ? id : null
}

export default function DealProductionChipWidget({
  context,
  data,
}: InjectionWidgetComponentProps<HostContext, HostContext['data']>) {
  const t = useT()
  const dealId = readDealId(context, data)
  const [summary, setSummary] = React.useState<{
    active: number
    percent: number | null
  } | null>(null)

  React.useEffect(() => {
    if (!dealId) return
    let cancelled = false

    void (async () => {
      try {
        const [woPayload, progressPayload] = await Promise.all([
          readApiResultOrThrow<WorkOrdersResponse>(
            `/api/mes/work-orders?dealId=${encodeURIComponent(dealId)}`,
          ),
          readApiResultOrThrow<ProgressResponse>(
            `/api/mes/deals/${encodeURIComponent(dealId)}/production-progress`,
          ).catch(() => null),
        ])
        const active = (woPayload.workOrders ?? []).filter((wo) =>
          ['planned', 'in_progress'].includes(wo.status),
        ).length
        const percent =
          progressPayload?.progress && progressPayload.progress.totalOperations > 0
            ? progressPayload.progress.percentComplete
            : null
        if (!cancelled) setSummary({ active, percent })
      } catch {
        if (!cancelled) setSummary(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dealId])

  if (!dealId || !summary || summary.active === 0) {
    return null
  }

  return (
    <Link
      href={MES_ROUTES.pulse}
      className="inline-flex items-center gap-1.5 text-xs rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-sky-900 dark:text-sky-100 hover:bg-sky-500/20"
      data-mes-deal-production-chip=""
    >
      <span>
        {t('mes.dealProductionChip.label', '{count} active WO', { count: summary.active })}
      </span>
      {summary.percent !== null ? (
        <span className="font-mono opacity-80">{summary.percent}%</span>
      ) : null}
    </Link>
  )
}
