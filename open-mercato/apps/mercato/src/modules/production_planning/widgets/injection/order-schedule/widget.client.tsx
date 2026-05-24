"use client"

import * as React from 'react'
import type { InjectionWidgetComponentProps } from '@open-mercato/shared/modules/widgets/injection'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useGuardedMutation } from '@open-mercato/ui/backend/injection/useGuardedMutation'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'

type ProductionOrderItem = {
  id: string
  code: string
  title: string
  status: string
  isLate: boolean
  plannedStartAt: string | null
  plannedEndAt: string | null
}

type WidgetContext = {
  kind?: 'order' | 'quote'
  record?: { id?: string; number?: string | null }
}

function readSalesOrderId(context: WidgetContext | undefined): string | null {
  const id = context?.record?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

export default function OrderScheduleWidget({
  context,
}: InjectionWidgetComponentProps<WidgetContext>) {
  const t = useT()
  const salesOrderId = readSalesOrderId(context)
  const [items, setItems] = React.useState<ProductionOrderItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [title, setTitle] = React.useState('')

  const load = React.useCallback(async () => {
    if (!salesOrderId) return
    setLoading(true)
    try {
      const payload = await readApiResultOrThrow<{ items?: ProductionOrderItem[] }>(
        `/api/production_planning/sales-orders/${encodeURIComponent(salesOrderId)}/production`,
      )
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [salesOrderId])

  React.useEffect(() => {
    void load()
  }, [load])

  const createOrder = useGuardedMutation(async () => {
    if (!salesOrderId || !title.trim()) return
    await readApiResultOrThrow(
      '/api/production_planning/orders',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          salesOrderId,
        }),
      },
    )
    setTitle('')
    await load()
  })

  if (!salesOrderId) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('production_planning.orderSchedule.missingOrder', 'Brak identyfikatora zamówienia sprzedaży.')}
      </p>
    )
  }

  return (
    <div className="space-y-4" data-production-planning-order-schedule="">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px] space-y-1">
          <Label htmlFor="pp-new-order-title">
            {t('production_planning.orderSchedule.newTitle', 'Nowe zlecenie produkcyjne')}
          </Label>
          <Input
            id="pp-new-order-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('production_planning.orderSchedule.titlePlaceholder', 'Np. Montaż partii A')}
          />
        </div>
        <Button type="button" disabled={!title.trim()} onClick={() => void createOrder.mutate()}>
          {t('production_planning.orderSchedule.create', 'Utwórz zlecenie')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading', 'Ładowanie…')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('production_planning.orderSchedule.empty', 'Brak powiązanych zleceń produkcyjnych.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {item.code} — {item.title}
                </span>
                <span className="text-xs text-muted-foreground">{item.status}</span>
              </div>
              {item.isLate ? (
                <p className="text-xs text-destructive mt-1">
                  {t('production_planning.orderSchedule.late', 'Opóźnione względem terminu')}
                </p>
              ) : null}
              {item.plannedStartAt ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.plannedStartAt.slice(0, 10)}
                  {item.plannedEndAt ? ` → ${item.plannedEndAt.slice(0, 10)}` : ''}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
