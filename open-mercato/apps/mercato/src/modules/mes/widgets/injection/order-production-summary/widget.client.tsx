"use client"

import * as React from 'react'
import Link from 'next/link'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type WorkOrderItem = { id: string; status: string }

type SalesOrderWorkOrdersResponse = {
  workOrders: WorkOrderItem[]
}

type SalesOrderHostContext = {
  kind?: 'order' | 'quote'
  resourceId?: string
  record?: { id?: string }
}

function readSalesOrderId(
  context: SalesOrderHostContext | undefined,
  data: { id?: string } | undefined,
): string | null {
  if (context?.kind && context.kind !== 'order') return null
  const id =
    (typeof context?.resourceId === 'string' && context.resourceId) ||
    (typeof data?.id === 'string' && data.id) ||
    (typeof context?.record?.id === 'string' && context.record.id) ||
    null
  return id && id.length > 0 ? id : null
}

export default function OrderProductionSummaryWidget({
  context,
  data,
}: InjectionWidgetComponentProps<SalesOrderHostContext, { id?: string }>) {
  const t = useT()
  const salesOrderId = readSalesOrderId(context, data)
  const [summary, setSummary] = React.useState<{ active: number; completed: number; total: number } | null>(
    null,
  )

  React.useEffect(() => {
    if (!salesOrderId) return
    let cancelled = false

    void (async () => {
      try {
        const payload = await readApiResultOrThrow<SalesOrderWorkOrdersResponse>(
          `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/work-orders`,
        )
        const list = payload.workOrders ?? []
        if (!cancelled) {
          setSummary({
            total: list.length,
            active: list.filter((wo) => ['planned', 'in_progress'].includes(wo.status)).length,
            completed: list.filter((wo) => wo.status === 'completed').length,
          })
        }
      } catch {
        if (!cancelled) setSummary(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [salesOrderId])

  if (!salesOrderId || !summary || summary.total === 0) {
    return null
  }

  return (
    <div
      className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm"
      data-mes-order-production-summary=""
    >
      <div className="font-medium">{t('mes.orderProductionSummary.title', 'Manufacturing')}</div>
      <p className="text-xs text-muted-foreground mt-1">
        {t('mes.orderProductionSummary.stats', '{active} active · {completed} completed · {total} total', {
          active: summary.active,
          completed: summary.completed,
          total: summary.total,
        })}
      </p>
      <Link href="/backend/mes/operator" className="text-xs text-primary hover:underline mt-2 inline-block">
        {t('mes.orderProductionSummary.operator', 'Open operator queue')}
      </Link>
    </div>
  )
}
