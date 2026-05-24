"use client"

import * as React from 'react'
import Link from 'next/link'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type ProductionOrderItem = {
  id: string
  code: string
  status: string
  isLate: boolean
}

type Response = {
  salesOrderId: string
  items: ProductionOrderItem[]
}

type WidgetContext = {
  kind?: 'order' | 'quote'
  record?: { id?: string }
}

function readSalesOrderId(context: WidgetContext | undefined): string | null {
  const id = context?.record?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

export default function OrderProductionStatusWidget({
  context,
}: InjectionWidgetComponentProps<WidgetContext>) {
  const salesOrderId = readSalesOrderId(context)
  const [items, setItems] = React.useState<ProductionOrderItem[]>([])

  React.useEffect(() => {
    if (!salesOrderId) return
    void apiCall<Response>(
      `/api/production_planning/sales-orders/${encodeURIComponent(salesOrderId)}/production`,
    )
      .then(({ result }) => setItems(result?.items ?? []))
      .catch(() => setItems([]))
  }, [salesOrderId])

  if (!salesOrderId || items.length === 0) return null

  const late = items.filter((i) => i.isLate).length
  const inProgress = items.filter((i) => i.status === 'in_progress').length

  return (
    <div className="flex flex-wrap items-center gap-1" data-production-planning-order-status="">
      <span className="text-xs rounded-full border px-2 py-0.5 bg-muted/50 text-muted-foreground">
        Produkcja: {items.length}
      </span>
      {inProgress > 0 ? (
        <span className="text-xs rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-blue-800 dark:text-blue-200">
          W toku: {inProgress}
        </span>
      ) : null}
      {late > 0 ? (
        <span className="text-xs rounded-full border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-destructive">
          Opóźnione: {late}
        </span>
      ) : null}
      <Link
        href={PP_ROUTES.orders}
        className="text-xs underline text-muted-foreground hover:text-foreground"
      >
        Harmonogram
      </Link>
    </div>
  )
}
