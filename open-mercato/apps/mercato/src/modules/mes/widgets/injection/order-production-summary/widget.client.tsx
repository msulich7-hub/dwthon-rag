"use client"

import * as React from 'react'
import Link from 'next/link'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesProgressBar } from '../../../components/MesProgressBar'
import { MES_ROUTES } from '../../../lib/mes-routes'
import { Skeleton } from '@open-mercato/ui/primitives/skeleton'

type WorkOrderItem = { id: string; status: string }

type SalesOrderWorkOrdersResponse = {
  workOrders: WorkOrderItem[]
}

type ProgressResponse = {
  progress: {
    totalOperations: number
    completedOperations: number
    inProgressOperations: number
    percentComplete: number
    workOrderCount: number
  }
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
  const [progress, setProgress] = React.useState<ProgressResponse['progress'] | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!salesOrderId) return
    let cancelled = false

    void (async () => {
      setLoading(true)
      try {
        const [woPayload, progressPayload] = await Promise.all([
          readApiResultOrThrow<SalesOrderWorkOrdersResponse>(
            `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/work-orders`,
          ),
          readApiResultOrThrow<ProgressResponse>(
            `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/production-progress`,
          ).catch(() => null),
        ])
        const list = woPayload.workOrders ?? []
        if (!cancelled) {
          setSummary({
            total: list.length,
            active: list.filter((wo) => ['planned', 'in_progress'].includes(wo.status)).length,
            completed: list.filter((wo) => wo.status === 'completed').length,
          })
          setProgress(progressPayload?.progress ?? null)
        }
      } catch {
        if (!cancelled) {
          setSummary(null)
          setProgress(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [salesOrderId])

  if (!salesOrderId) return null

  if (loading) {
    return (
      <div className="rounded-lg border p-3 space-y-2" data-mes-order-production-summary="">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2 w-full" />
      </div>
    )
  }

  if (!summary || summary.total === 0) {
    return null
  }

  return (
    <div
      className="rounded-lg border border-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10 p-3 text-sm space-y-3"
      data-mes-order-production-summary=""
    >
      <div className="font-medium">{t('mes.orderProductionSummary.title', 'Manufacturing')}</div>
      <p className="text-xs text-muted-foreground">
        {t('mes.orderProductionSummary.stats', '{active} active · {completed} completed · {total} total', {
          active: summary.active,
          completed: summary.completed,
          total: summary.total,
        })}
      </p>
      {progress && progress.totalOperations > 0 ? (
        <MesProgressBar percent={progress.percentComplete} showPercent />
      ) : null}
      <div className="flex flex-wrap gap-3 text-xs">
        <Link href={MES_ROUTES.operator} className="text-primary hover:underline">
          {t('mes.orderProductionSummary.operator', 'Open operator queue')}
        </Link>
        <Link href={MES_ROUTES.pulse} className="text-primary hover:underline">
          {t('mes.orderProductionSummary.pulse', 'Pulse board')}
        </Link>
      </div>
    </div>
  )
}
