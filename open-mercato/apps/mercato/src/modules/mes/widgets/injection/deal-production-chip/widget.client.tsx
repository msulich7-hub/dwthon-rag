"use client"

import * as React from 'react'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type HostContext = {
  dealId?: string
  recordId?: string
  data?: { deal?: { id?: string } }
}

type WorkOrdersResponse = {
  workOrders: Array<{ id: string; status: string }>
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
  const [activeCount, setActiveCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!dealId) return
    let cancelled = false

    void (async () => {
      try {
        const payload = await readApiResultOrThrow<WorkOrdersResponse>(
          `/api/mes/work-orders?dealId=${encodeURIComponent(dealId)}`,
        )
        const active = (payload.workOrders ?? []).filter((wo) =>
          ['planned', 'in_progress'].includes(wo.status),
        ).length
        if (!cancelled) setActiveCount(active)
      } catch {
        if (!cancelled) setActiveCount(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dealId])

  if (!dealId || activeCount === null || activeCount === 0) {
    return null
  }

  return (
    <span
      className="text-xs rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-sky-900 dark:text-sky-100"
      data-mes-deal-production-chip=""
    >
      {t('mes.dealProductionChip.label', '{count} active WO', { count: activeCount })}
    </span>
  )
}
