"use client"

import * as React from 'react'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useGuardedMutation } from '@open-mercato/ui/backend/injection/useGuardedMutation'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { MesEmptyState } from '../../../components/MesEmptyState'
import { MesListSkeleton } from '../../../components/MesListSkeleton'
import { MesProgressBar } from '../../../components/MesProgressBar'
import { WorkOrderCard, type WorkOrderCardItem } from '../../../components/WorkOrderCard'

type SalesOrderWorkOrdersResponse = {
  salesOrderId: string
  orderNumber: string | null
  workOrders: WorkOrderCardItem[]
}

type ProgressResponse = {
  progress: {
    percentComplete: number
    totalOperations: number
    completedOperations: number
  }
}

type SalesOrderHostContext = {
  kind?: 'order' | 'quote'
  resourceId?: string
  record?: { id?: string; orderNumber?: string }
}

type SalesOrderRecord = {
  id?: string
  orderNumber?: string
}

function readSalesOrderId(
  context: SalesOrderHostContext | undefined,
  data: SalesOrderRecord | undefined,
): string | null {
  if (context?.kind && context.kind !== 'order') return null
  const record = (data ?? context?.record) as SalesOrderRecord | undefined
  const id =
    (typeof context?.resourceId === 'string' && context.resourceId) ||
    (typeof record?.id === 'string' && record.id) ||
    null
  return id && id.length > 0 ? id : null
}

export default function OrderWorkOrdersWidget({
  context,
  data,
}: InjectionWidgetComponentProps<SalesOrderHostContext, SalesOrderRecord>) {
  const t = useT()
  const salesOrderId = readSalesOrderId(context, data)
  const [workOrders, setWorkOrders] = React.useState<WorkOrderCardItem[]>([])
  const [orderNumber, setOrderNumber] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState<ProgressResponse['progress'] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [productCode, setProductCode] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')

  const { runMutation } = useGuardedMutation<{ resourceType: string; resourceId: string | null }>({
    contextId: `mes.order-work-orders.${salesOrderId ?? 'unknown'}`,
  })

  const loadWorkOrders = React.useCallback(async () => {
    if (!salesOrderId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [woPayload, progressPayload] = await Promise.all([
        readApiResultOrThrow<SalesOrderWorkOrdersResponse>(
          `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/work-orders`,
        ),
        readApiResultOrThrow<ProgressResponse>(
          `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/production-progress`,
        ).catch(() => null),
      ])
      setWorkOrders(Array.isArray(woPayload.workOrders) ? woPayload.workOrders : [])
      setOrderNumber(woPayload.orderNumber ?? null)
      setProgress(progressPayload?.progress ?? null)
    } catch {
      setError(t('mes.orderWorkOrders.loadError', 'Failed to load work orders'))
    } finally {
      setLoading(false)
    }
  }, [salesOrderId, t])

  React.useEffect(() => {
    void loadWorkOrders()
  }, [loadWorkOrders])

  const handleImportLines = React.useCallback(async () => {
    if (!salesOrderId) return
    setError(null)
    await runMutation(async () => {
      const call = await apiCall(
        `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/work-orders`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ skipExistingProductCodes: true }),
        },
      )
      if (!call.ok) {
        flash(t('mes.orderWorkOrders.importError', 'Import failed'), 'error')
        return
      }
      flash(t('mes.orderWorkOrders.importSuccess', 'Work orders created from lines'), 'success')
      await loadWorkOrders()
    })
  }, [loadWorkOrders, runMutation, salesOrderId, t])

  const handleCreate = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!salesOrderId || !productCode.trim()) return

      const qty = Number.parseInt(quantity, 10)
      if (!Number.isFinite(qty) || qty < 1) return

      setError(null)
      await runMutation(async () => {
        const { result } = await apiCall<{ workOrder: WorkOrderCardItem }>('/api/mes/work-orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            salesOrderId,
            productCode: productCode.trim(),
            quantity: qty,
          }),
        })

        if (result?.workOrder) {
          setWorkOrders((prev) => [result.workOrder, ...prev])
          flash(t('mes.orderWorkOrders.created', 'Work order created'), 'success')
        }
        setProductCode('')
        setQuantity('1')
        await loadWorkOrders()
      })
    },
    [loadWorkOrders, productCode, quantity, runMutation, salesOrderId, t],
  )

  if (!salesOrderId) {
    return (
      <div className="text-sm text-muted-foreground" data-mes-order-work-orders="">
        {t('mes.orderWorkOrders.missingOrder', 'Open a sales order to manage production work orders.')}
      </div>
    )
  }

  return (
    <div className="space-y-4" data-mes-order-work-orders="">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {orderNumber
            ? t('mes.orderWorkOrders.linkedTo', 'Linked to order {number}', { number: orderNumber })
            : null}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleImportLines()}>
          {t('mes.orderWorkOrders.importLines', 'Create from line items')}
        </Button>
      </div>

      {progress && progress.totalOperations > 0 ? (
        <MesProgressBar
          percent={progress.percentComplete}
          label={t('mes.orderWorkOrders.progress', 'Order production progress')}
        />
      ) : null}

      <form className="space-y-3 rounded-lg border bg-card p-4" onSubmit={handleCreate}>
        <div>
          <h3 className="text-sm font-medium">{t('mes.orderWorkOrders.createTitle', 'New work order')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('mes.orderWorkOrders.createHint', 'Production linked to this sales order.')}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="mes-so-wo-product">{t('mes.orderWorkOrders.productCode', 'Product code')}</Label>
            <Input
              id="mes-so-wo-product"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="SKU-1001"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mes-so-wo-qty">{t('mes.orderWorkOrders.quantity', 'Quantity')}</Label>
            <Input
              id="mes-so-wo-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" disabled={!productCode.trim()}>
          {t('mes.orderWorkOrders.create', 'Create work order')}
        </Button>
      </form>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <MesListSkeleton />
      ) : workOrders.length === 0 ? (
        <MesEmptyState
          title={t('mes.orderWorkOrders.empty', 'No work orders yet.')}
          description={t(
            'mes.orderWorkOrders.emptyHint',
            'Import from order lines or create a work order, then release routing.',
          )}
        />
      ) : (
        <ul className="space-y-2">
          {workOrders.map((wo) => (
            <WorkOrderCard key={wo.id} workOrder={wo} onRoutingReleased={() => void loadWorkOrders()} />
          ))}
        </ul>
      )}
    </div>
  )
}
