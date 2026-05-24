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

type WorkOrdersResponse = {
  workOrders: WorkOrderCardItem[]
}

type ProgressResponse = {
  progress: {
    percentComplete: number
    totalOperations: number
    completedOperations: number
  }
}

type HostContext = {
  dealId?: string
  recordId?: string
  data?: { deal?: { id?: string } }
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

export default function DealWorkOrdersWidget({
  context,
  data,
}: InjectionWidgetComponentProps<HostContext, HostContext['data']>) {
  const t = useT()
  const dealId = readDealId(context, data)
  const [workOrders, setWorkOrders] = React.useState<WorkOrderCardItem[]>([])
  const [progress, setProgress] = React.useState<ProgressResponse['progress'] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [productCode, setProductCode] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')

  const { runMutation } = useGuardedMutation<{ resourceType: string; resourceId: string | null }>({
    contextId: `mes.deal-work-orders.${dealId ?? 'unknown'}`,
  })

  const loadWorkOrders = React.useCallback(async () => {
    if (!dealId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [woPayload, progressPayload] = await Promise.all([
        readApiResultOrThrow<WorkOrdersResponse>(
          `/api/mes/work-orders?dealId=${encodeURIComponent(dealId)}`,
        ),
        readApiResultOrThrow<ProgressResponse>(
          `/api/mes/deals/${encodeURIComponent(dealId)}/production-progress`,
        ).catch(() => null),
      ])
      setWorkOrders(Array.isArray(woPayload.workOrders) ? woPayload.workOrders : [])
      setProgress(progressPayload?.progress ?? null)
    } catch {
      setError(t('mes.dealWorkOrders.loadError', 'Failed to load work orders'))
    } finally {
      setLoading(false)
    }
  }, [dealId, t])

  React.useEffect(() => {
    void loadWorkOrders()
  }, [loadWorkOrders])

  const handleCreate = React.useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!dealId || !productCode.trim()) return

      const qty = Number.parseInt(quantity, 10)
      if (!Number.isFinite(qty) || qty < 1) return

      setError(null)
      await runMutation(async () => {
        const { result } = await apiCall<{ workOrder: WorkOrderCardItem }>('/api/mes/work-orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            dealId,
            productCode: productCode.trim(),
            quantity: qty,
          }),
        })

        if (result?.workOrder) {
          setWorkOrders((prev) => [result.workOrder, ...prev])
          flash(t('mes.dealWorkOrders.created', 'Work order created'), 'success')
        }
        setProductCode('')
        setQuantity('1')
        await loadWorkOrders()
      })
    },
    [dealId, loadWorkOrders, productCode, quantity, runMutation, t],
  )

  if (!dealId) {
    return (
      <div className="text-sm text-muted-foreground" data-mes-deal-work-orders="">
        {t('mes.dealWorkOrders.missingDeal', 'Open a deal to manage manufacturing work orders.')}
      </div>
    )
  }

  return (
    <div className="space-y-4" data-mes-deal-work-orders="">
      {progress && progress.totalOperations > 0 ? (
        <MesProgressBar
          percent={progress.percentComplete}
          label={t('mes.dealWorkOrders.progress', 'Shop-floor progress')}
        />
      ) : null}

      <form className="space-y-3 rounded-lg border bg-card p-4" onSubmit={handleCreate}>
        <div>
          <h3 className="text-sm font-medium">{t('mes.dealWorkOrders.createTitle', 'New work order')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('mes.dealWorkOrders.createHint', 'Link shop-floor production to this deal.')}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="mes-wo-product">{t('mes.dealWorkOrders.productCode', 'Product code')}</Label>
            <Input
              id="mes-wo-product"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="SKU-1001"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mes-wo-qty">{t('mes.dealWorkOrders.quantity', 'Quantity')}</Label>
            <Input
              id="mes-wo-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" disabled={!productCode.trim()}>
          {t('mes.dealWorkOrders.create', 'Create work order')}
        </Button>
      </form>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <MesListSkeleton />
      ) : workOrders.length === 0 ? (
        <MesEmptyState
          title={t('mes.dealWorkOrders.empty', 'No work orders yet.')}
          description={t('mes.dealWorkOrders.emptyHint', 'Create a work order and release routing to start production.')}
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
