"use client"

import * as React from 'react'
import Link from 'next/link'
import { MesStatusBadge } from './MesStatusBadge'
import { ReleaseRoutingPanel } from './ReleaseRoutingPanel'
import { MES_ROUTES } from '../lib/mes-routes'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export type WorkOrderCardItem = {
  id: string
  orderNumber: string
  productCode: string
  quantity: number
  status: string
}

type WorkOrderCardProps = {
  workOrder: WorkOrderCardItem
  showRouting?: boolean
  onRoutingReleased?: () => void
}

export function WorkOrderCard({ workOrder, showRouting = true, onRoutingReleased }: WorkOrderCardProps) {
  const t = useT()
  const [expanded, setExpanded] = React.useState(false)

  return (
    <li className="rounded-lg border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="text-left flex-1 min-w-0">
          <Link
            href={MES_ROUTES.workOrder(workOrder.id)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {workOrder.orderNumber}
          </Link>
          <button
            type="button"
            className="block text-xs text-muted-foreground hover:underline mt-0.5"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded
              ? t('mes.workOrderCard.hideRouting', 'Hide routing')
              : t('mes.workOrderCard.showRouting', 'Routing & operations')}
          </button>
          <div className="text-xs text-muted-foreground">
            {workOrder.productCode} × {workOrder.quantity}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MesStatusBadge
            status={workOrder.status}
            label={t(`mes.status.workOrder.${workOrder.status}`, workOrder.status)}
          />
          <Link href={MES_ROUTES.operator} className="text-xs text-primary hover:underline">
            {t('mes.workOrderCard.operator', 'Operator')}
          </Link>
        </div>
      </div>
      {expanded && showRouting ? (
        <div className="border-t px-3 py-3 bg-muted/10">
          <ReleaseRoutingPanel
            workOrderId={workOrder.id}
            productCode={workOrder.productCode}
            onReleased={onRoutingReleased}
          />
        </div>
      ) : null}
    </li>
  )
}
