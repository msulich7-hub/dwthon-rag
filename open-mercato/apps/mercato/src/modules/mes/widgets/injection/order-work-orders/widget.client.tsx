"use client"

import * as React from 'react'
import Link from 'next/link'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useGuardedMutation } from '@open-mercato/ui/backend/injection/useGuardedMutation'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'

type WorkOrderItem = {
  id: string
  orderNumber: string
  productCode: string
  quantity: number
  status: string
  salesOrderId: string | null
  dealId: string | null
  updatedAt: string
}

type SalesOrderWorkOrdersResponse = {
  salesOrderId: string
  orderNumber: string | null
  workOrders: WorkOrderItem[]
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

function statusTone(status: string): string {
  if (status === 'in_progress') return 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100'
  if (status === 'completed') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
  if (status === 'cancelled') return 'border-muted bg-muted/40 text-muted-foreground'
  return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100'
}

export default function OrderWorkOrdersWidget({
  context,
  data,
}: InjectionWidgetComponentProps<SalesOrderHostContext, SalesOrderRecord>) {
  const t = useT()
  const salesOrderId = readSalesOrderId(context, data)
  const [workOrders, setWorkOrders] = React.useState<WorkOrderItem[]>([])
  const [orderNumber, setOrderNumber] = React.useState<string | null>(null)
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
      const payload = await readApiResultOrThrow<SalesOrderWorkOrdersResponse>(
        `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/work-orders`,
      )
      setWorkOrders(Array.isArray(payload.workOrders) ? payload.workOrders : [])
      setOrderNumber(payload.orderNumber ?? null)
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
      await apiCall(
        `/api/mes/sales-orders/${encodeURIComponent(salesOrderId)}/work-orders`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ skipExistingProductCodes: true }),
        },
      )
      await loadWorkOrders()
    })
  }, [loadWorkOrders, runMutation, salesOrderId])

  const handleCreate = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!salesOrderId || !productCode.trim()) return

      const qty = Number.parseInt(quantity, 10)
      if (!Number.isFinite(qty) || qty < 1) return

      setError(null)
      await runMutation(async () => {
        const { result } = await apiCall<{ workOrder: WorkOrderItem }>('/api/mes/work-orders', {
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
        }
        setProductCode('')
        setQuantity('1')
      })
    },
    [productCode, quantity, runMutation, salesOrderId],
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
        <div className="text-sm text-muted-foreground">{t('mes.orderWorkOrders.loading', 'Loading…')}</div>
      ) : workOrders.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('mes.orderWorkOrders.empty', 'No work orders yet.')}</div>
      ) : (
        <ul className="space-y-2">
          {workOrders.map((wo) => (
            <li key={wo.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">{wo.orderNumber}</div>
                <div className="text-xs text-muted-foreground">
                  {wo.productCode} × {wo.quantity}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs rounded-full border px-2 py-0.5 ${statusTone(wo.status)}`}>
                  {wo.status}
                </span>
                <Link
                  href="/backend/mes/operator"
                  className="text-xs text-primary hover:underline"
                >
                  {t('mes.orderWorkOrders.operator', 'Operator')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
