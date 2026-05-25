"use client"

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mic, Package } from 'lucide-react'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { Label } from '@open-mercato/ui/primitives/label'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../../../components/MesShell'
import { MesListSkeleton } from '../../../../components/MesListSkeleton'
import { placeholderBomForProduct } from '../../../../lib/raw-materials-placeholders'
import { MES_ROUTES } from '../../../../lib/mes-routes'

type DispatchQueueItem = {
  workOrderId: string
  orderNumber: string
  productCode: string
}

type QueueResponse = { queue: DispatchQueueItem[] }

const ORDER_COUNT_OPTIONS = [1, 2, 3, 5, 10] as const

function uniqueWorkOrders(queue: DispatchQueueItem[]): DispatchQueueItem[] {
  const seen = new Set<string>()
  const out: DispatchQueueItem[] = []
  for (const item of queue) {
    if (seen.has(item.workOrderId)) continue
    seen.add(item.workOrderId)
    out.push(item)
  }
  return out
}

export default function MesOperatorRawMaterialsPage() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const kiosk = searchParams.get('kiosk') === '1'
  const initialWorkOrderId = searchParams.get('workOrderId') ?? ''

  const [queue, setQueue] = React.useState<DispatchQueueItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [workOrderId, setWorkOrderId] = React.useState(initialWorkOrderId)
  const [orderCount, setOrderCount] = React.useState<number>(1)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const payload = await readApiResultOrThrow<QueueResponse>('/api/mes/dispatch-queue')
        setQueue(payload.queue ?? [])
      } catch {
        setQueue([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const workOrders = React.useMemo(() => uniqueWorkOrders(queue), [queue])
  const selected = workOrders.find((wo) => wo.workOrderId === workOrderId) ?? workOrders[0]
  const bomLines = selected ? placeholderBomForProduct(selected.productCode) : []

  React.useEffect(() => {
    if (!workOrderId && workOrders[0]) {
      setWorkOrderId(workOrders[0].workOrderId)
    }
  }, [workOrderId, workOrders])

  const handleSubmit = React.useCallback(() => {
    if (!selected) {
      flash(t('mes.rawMaterials.noWorkOrder', 'Select a work order first'), 'error')
      return
    }
    setSubmitting(true)
    window.setTimeout(() => {
      setSubmitting(false)
      flash(
        t('mes.rawMaterials.submitSuccess', 'Replenishment request recorded ({count}× for {order})', {
          count: String(orderCount),
          order: selected.orderNumber,
        }),
        'success',
      )
      router.push(MES_ROUTES.operatorKiosk)
    }, 400)
  }, [orderCount, router, selected, t])

  const form = (
    <PageBody className={`space-y-6 ${kiosk ? 'max-w-3xl mx-auto' : 'max-w-2xl'}`}>
      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t(
          'mes.rawMaterials.formatNote',
          'Format preview — quantities and voice calculation come in a later phase.',
        )}
      </div>

      {loading ? (
        <MesListSkeleton rows={2} />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="mes-rm-wo" className={kiosk ? 'text-lg' : ''}>
              {t('mes.rawMaterials.workOrder', 'Work order')}
            </Label>
            <select
              id="mes-rm-wo"
              className={`flex w-full rounded-md border border-input bg-background px-3 py-2 ${kiosk ? 'h-12 text-lg' : ''}`}
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              disabled={workOrders.length === 0}
            >
              {workOrders.length === 0 ? (
                <option value="">{t('mes.rawMaterials.noQueue', 'No work orders in queue')}</option>
              ) : (
                workOrders.map((wo) => (
                  <option key={wo.workOrderId} value={wo.workOrderId}>
                    {wo.orderNumber} · {wo.productCode}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-3">
            <Label className={kiosk ? 'text-lg' : ''}>
              {t('mes.rawMaterials.orderCount', 'How many replenishment orders?')}
            </Label>
            <div className="flex flex-wrap gap-2">
              {ORDER_COUNT_OPTIONS.map((n) => (
                <Button
                  key={n}
                  type="button"
                  size={kiosk ? 'lg' : 'default'}
                  variant={orderCount === n ? 'default' : 'outline'}
                  className={kiosk ? 'min-h-14 min-w-14 text-xl' : 'min-w-12'}
                  onClick={() => setOrderCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('mes.rawMaterials.orderCountHint', 'Same material list will be requested this many times.')}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className={`font-medium flex items-center gap-2 ${kiosk ? 'text-lg' : ''}`}>
              <Package className="h-5 w-5" aria-hidden />
              {t('mes.rawMaterials.linesTitle', 'Materials for this order')}
            </h3>
            {selected ? (
              <ul className="rounded-lg border divide-y bg-card">
                {bomLines.map((line) => (
                  <li
                    key={line.code}
                    className={`flex items-center justify-between gap-4 px-4 ${kiosk ? 'py-4 text-base' : 'py-3 text-sm'}`}
                  >
                    <div>
                      <div className="font-medium">{line.code}</div>
                      <div className="text-muted-foreground">{line.name}</div>
                    </div>
                    <span className="text-muted-foreground tabular-nums">
                      {t('mes.rawMaterials.qtyLater', 'Qty — auto')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('mes.rawMaterials.linesEmpty', 'Pick a work order to see the material list.')}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-dashed p-4 space-y-2 opacity-80">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mic className="h-5 w-5" aria-hidden />
              <span className="font-medium">{t('mes.rawMaterials.voiceTitle', 'Voice order (soon)')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                'mes.rawMaterials.voiceHint',
                'Example: “Raw materials for the next 8 hours, up to 6 pallets” — the system will calculate quantities.',
              )}
            </p>
            <Button type="button" variant="secondary" disabled className={kiosk ? 'min-h-12' : ''}>
              {t('mes.rawMaterials.voiceCta', 'Hold to speak')}
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              size={kiosk ? 'lg' : 'default'}
              className={kiosk ? 'min-h-16 flex-1 text-lg' : ''}
              disabled={!selected || submitting}
              onClick={() => handleSubmit()}
            >
              {t('mes.rawMaterials.submit', 'Place replenishment request')}
            </Button>
            <Button type="button" variant="outline" size={kiosk ? 'lg' : 'default'} asChild>
              <Link href={kiosk ? MES_ROUTES.operatorKiosk : MES_ROUTES.operator}>
                {t('mes.rawMaterials.cancel', 'Back to queue')}
              </Link>
            </Button>
          </div>
        </>
      )}
    </PageBody>
  )

  if (kiosk) {
    return (
      <Page>
        <div className="min-h-screen bg-background p-4 md:p-8">
          <PageHeader
            title={t('mes.rawMaterials.kioskTitle', 'Raw materials')}
            description={t('mes.rawMaterials.kioskDescription', 'Request components for the selected work order.')}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href={MES_ROUTES.operatorKiosk}>{t('mes.rawMaterials.backKiosk', 'Shop floor')}</Link>
              </Button>
            }
          />
          {form}
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={t('mes.rawMaterials.title', 'Raw material request')}
          description={t('mes.rawMaterials.description', 'Shop-floor replenishment form (format preview).')}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href={MES_ROUTES.operatorKiosk}>{t('mes.operator.kiosk', 'Kiosk')}</Link>
            </Button>
          }
        />
        {form}
      </MesShell>
    </Page>
  )
}
