"use client"

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../../components/MesShell'
import { MesEmptyState } from '../../../components/MesEmptyState'
import { MesListSkeleton } from '../../../components/MesListSkeleton'
import { MesStatusBadge } from '../../../components/MesStatusBadge'
import { MesScanField } from '../../../components/MesScanField'
import { MES_ROUTES } from '../../../lib/mes-routes'

type DispatchQueueItem = {
  workOrderId: string
  orderNumber: string
  productCode: string
  operation: {
    id: string
    operationCode: string
    operationName: string
    status: string
    workCenterCode: string | null
    plannedQty: number
    completedQty: number
  }
}

type QueueResponse = { queue: DispatchQueueItem[] }

export default function MesOperatorPage() {
  const t = useT()
  const searchParams = useSearchParams()
  const kiosk = searchParams.get('kiosk') === '1'

  const [queue, setQueue] = React.useState<DispatchQueueItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [workCenter, setWorkCenter] = React.useState('')
  const [highlightedId, setHighlightedId] = React.useState<string | null>(null)
  const rowRefs = React.useRef<Record<string, HTMLLIElement | null>>({})

  const loadQueue = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (workCenter.trim()) params.set('workCenterCode', workCenter.trim())
      const qs = params.toString()
      const payload = await readApiResultOrThrow<QueueResponse>(
        `/api/mes/dispatch-queue${qs ? `?${qs}` : ''}`,
      )
      setQueue(payload.queue ?? [])
    } catch {
      setError(t('mes.operator.loadError', 'Failed to load dispatch queue'))
    } finally {
      setLoading(false)
    }
  }, [t, workCenter])

  React.useEffect(() => {
    void loadQueue()
    const timer = window.setInterval(() => void loadQueue(), 20_000)
    return () => window.clearInterval(timer)
  }, [loadQueue])

  const handleStart = async (item: DispatchQueueItem) => {
    if (item.operation.status !== 'ready') return
    setBusyId(item.operation.id)
    try {
      const call = await apiCall(
        `/api/mes/work-orders/${encodeURIComponent(item.workOrderId)}/operations/${encodeURIComponent(item.operation.id)}/confirm`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ confirmationType: 'start' }),
        },
      )
      if (!call.ok) {
        flash(t('mes.operator.startError', 'Could not start operation'), 'error')
        return
      }
      flash(t('mes.operator.startSuccess', 'Operation started'), 'success')
      await loadQueue()
    } catch {
      flash(t('mes.operator.startError', 'Could not start operation'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleScan = React.useCallback(
    (scan: string) => {
      const match = queue.find(
        (item) =>
          item.orderNumber.toUpperCase() === scan ||
          item.productCode.toUpperCase() === scan ||
          item.operation.operationCode.toUpperCase() === scan,
      )
      if (!match) {
        flash(t('mes.scan.notFound', 'No matching operation in queue'), 'error')
        setHighlightedId(null)
        return
      }
      setHighlightedId(match.operation.id)
      rowRefs.current[match.operation.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      flash(
        t('mes.scan.found', 'Found {order} — {operation}', {
          order: match.orderNumber,
          operation: match.operation.operationName,
        }),
        'success',
      )
    },
    [queue, t],
  )

  const handleComplete = async (item: DispatchQueueItem) => {
    if (item.operation.status !== 'in_progress') return
    setBusyId(item.operation.id)
    try {
      const remaining = item.operation.plannedQty - item.operation.completedQty
      const call = await apiCall(
        `/api/mes/work-orders/${encodeURIComponent(item.workOrderId)}/operations/${encodeURIComponent(item.operation.id)}/confirm`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            confirmationType: 'complete',
            goodQty: remaining > 0 ? remaining : item.operation.plannedQty,
          }),
        },
      )
      if (!call.ok) {
        flash(t('mes.operator.completeError', 'Could not complete operation'), 'error')
        return
      }
      flash(t('mes.operator.completeSuccess', 'Operation completed'), 'success')
      await loadQueue()
    } catch {
      flash(t('mes.operator.completeError', 'Could not complete operation'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const body = (
    <PageBody className={`space-y-4 ${kiosk ? 'max-w-3xl mx-auto' : ''}`}>
      <MesScanField kiosk={kiosk} autoFocus={kiosk} onScan={handleScan} />

      <div className={`flex flex-wrap gap-3 items-end ${kiosk ? 'text-lg' : ''}`}>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label htmlFor="mes-wc-filter">{t('mes.operator.workCenter', 'Work center')}</Label>
          <Input
            id="mes-wc-filter"
            value={workCenter}
            onChange={(e) => setWorkCenter(e.target.value)}
            placeholder={t('mes.operator.workCenterPlaceholder', 'e.g. WC-ASSY-01')}
            className={kiosk ? 'h-12 text-lg' : ''}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void loadQueue()} className={kiosk ? 'h-12 px-6' : ''}>
          {t('mes.operator.refresh', 'Refresh')}
        </Button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <MesListSkeleton rows={kiosk ? 2 : 4} />
      ) : queue.length === 0 ? (
        <MesEmptyState
          title={t('mes.operator.empty', 'No operations in queue.')}
          description={t('mes.operator.emptyHint', 'Release routing on work orders or adjust the work center filter.')}
        />
      ) : (
        <ul className={`space-y-3 ${kiosk ? 'space-y-4' : ''}`}>
          {queue.map((item) => (
            <li
              key={item.operation.id}
              ref={(el) => {
                rowRefs.current[item.operation.id] = el
              }}
              className={`rounded-lg border p-4 space-y-3 bg-card ${kiosk ? 'p-6 shadow-sm' : ''} ${
                highlightedId === item.operation.id ? 'ring-2 ring-primary border-primary' : ''
              }`}
            >
              <div>
                <div className={`font-medium ${kiosk ? 'text-xl' : ''}`}>{item.orderNumber}</div>
                <div className={`text-muted-foreground ${kiosk ? 'text-base' : 'text-xs'}`}>
                  {item.productCode} · {item.operation.operationName}
                  {item.operation.workCenterCode ? ` · ${item.operation.workCenterCode}` : ''}
                </div>
                <div className="mt-2">
                  <MesStatusBadge status={item.operation.status} kind="operation" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.operation.status === 'ready' ? (
                  <Button
                    size={kiosk ? 'lg' : 'default'}
                    className={kiosk ? 'min-h-16 min-w-40 text-lg flex-1' : 'min-h-12 min-w-32'}
                    disabled={busyId === item.operation.id}
                    onClick={() => void handleStart(item)}
                  >
                    {t('mes.operator.start', 'Start')}
                  </Button>
                ) : null}
                {item.operation.status === 'in_progress' ? (
                  <Button
                    size={kiosk ? 'lg' : 'default'}
                    className={kiosk ? 'min-h-16 min-w-40 text-lg flex-1' : 'min-h-12 min-w-32'}
                    disabled={busyId === item.operation.id}
                    onClick={() => void handleComplete(item)}
                  >
                    {t('mes.operator.complete', 'Complete')}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageBody>
  )

  if (kiosk) {
    return (
      <Page>
        <div className="min-h-screen bg-background p-4 md:p-8">
          <PageHeader
            title={t('mes.operator.kioskTitle', 'Shop floor')}
            description={t('mes.operator.kioskDescription', 'Tap Start or Complete for your work center.')}
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link href={MES_ROUTES.operator}>{t('mes.operator.exitKiosk', 'Exit kiosk')}</Link>
              </Button>
            }
          />
          {body}
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={t('mes.operator.title', 'Operator queue')}
          description={t('mes.operator.description', 'Shop-floor dispatch — start and complete operations.')}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href={MES_ROUTES.operatorKiosk}>{t('mes.operator.kiosk', 'Kiosk')}</Link>
            </Button>
          }
        />
        {body}
      </MesShell>
    </Page>
  )
}
