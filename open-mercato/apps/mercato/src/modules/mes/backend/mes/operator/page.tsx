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
import { MesCameraScanner } from '../../../components/MesCameraScanner'
import { MesOperatorLotField } from '../../../components/MesOperatorLotField'
import { MesKioskRawMaterialsHero } from '../../../components/MesKioskRawMaterialsHero'
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
  const [workCenterOptions, setWorkCenterOptions] = React.useState<string[]>([])
  const [consumeLot, setConsumeLot] = React.useState('')
  const [consumeQty, setConsumeQty] = React.useState('1')
  const [cameraOn, setCameraOn] = React.useState(false)
  const rowRefs = React.useRef<Record<string, HTMLLIElement | null>>({})

  React.useEffect(() => {
    void (async () => {
      try {
        const payload = await readApiResultOrThrow<{ workCenters: string[] }>('/api/mes/work-centers')
        setWorkCenterOptions(payload.workCenters ?? [])
      } catch {
        setWorkCenterOptions([])
      }
    })()
  }, [])

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

  const handleStart = React.useCallback(
    async (item: DispatchQueueItem) => {
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
    },
    [loadQueue, t],
  )

  const handleComplete = React.useCallback(
    async (item: DispatchQueueItem) => {
      if (item.operation.status !== 'in_progress') return
      setBusyId(item.operation.id)
      try {
        const remaining = item.operation.plannedQty - item.operation.completedQty
        const parsedConsumeQty = Number.parseInt(consumeQty, 10)
        const call = await apiCall(
          `/api/mes/work-orders/${encodeURIComponent(item.workOrderId)}/operations/${encodeURIComponent(item.operation.id)}/confirm`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              confirmationType: 'complete',
              goodQty: remaining > 0 ? remaining : item.operation.plannedQty,
              lotNumber: consumeLot.trim() || undefined,
              consumeQty: Number.isFinite(parsedConsumeQty) && parsedConsumeQty > 0 ? parsedConsumeQty : undefined,
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
    },
    [consumeLot, consumeQty, loadQueue, t],
  )

  const handleScan = React.useCallback(
    (scan: string) => {
      const match = queue.find(
        (item) =>
          item.orderNumber.toUpperCase() === scan ||
          item.productCode.toUpperCase() === scan ||
          item.operation.operationCode.toUpperCase() === scan,
      )
      if (!match) {
        if (scan.startsWith('LOT-') || scan.includes('-')) {
          setConsumeLot(scan)
          flash(t('mes.scan.lotCaptured', 'Lot captured for next completion'), 'success')
          return
        }
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
      if (kiosk) {
        if (match.operation.status === 'ready') void handleStart(match)
        else if (match.operation.status === 'in_progress') void handleComplete(match)
      }
    },
    [handleComplete, handleStart, kiosk, queue, t],
  )

  const body = (
    <PageBody className={`space-y-4 ${kiosk ? 'max-w-3xl mx-auto' : ''}`}>
      {kiosk ? <MesKioskRawMaterialsHero workOrderId={highlightedId ? queue.find((q) => q.operation.id === highlightedId)?.workOrderId : null} /> : null}
      <MesScanField kiosk={kiosk} autoFocus={kiosk} onScan={handleScan} />
      {cameraOn || kiosk ? <MesCameraScanner onScan={handleScan} active /> : null}
      {!kiosk ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setCameraOn((v) => !v)}>
          {cameraOn ? t('mes.camera.hide', 'Hide camera') : t('mes.camera.show', 'Use camera scanner')}
        </Button>
      ) : null}

      <MesOperatorLotField
        kiosk={kiosk}
        lotNumber={consumeLot}
        consumeQty={consumeQty}
        onLotNumberChange={setConsumeLot}
        onConsumeQtyChange={setConsumeQty}
      />

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

      {workCenterOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={workCenter === '' ? 'secondary' : 'outline'}
            onClick={() => setWorkCenter('')}
          >
            {t('mes.operator.allWorkCenters', 'All')}
          </Button>
          {workCenterOptions.map((code) => (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={workCenter === code ? 'secondary' : 'outline'}
              onClick={() => setWorkCenter(code)}
            >
              {code}
            </Button>
          ))}
        </div>
      ) : null}

      {kiosk ? (
        <p className="text-xs text-muted-foreground">{t('mes.operator.kioskScanHint', 'Scan auto-starts or completes the matched operation.')}</p>
      ) : null}

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
                <Link
                  href={MES_ROUTES.workOrder(item.workOrderId)}
                  className={`font-medium text-primary hover:underline ${kiosk ? 'text-xl' : ''}`}
                >
                  {item.orderNumber}
                </Link>
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
            description={t('mes.operator.kioskDescription', 'Scan barcodes — camera, lot capture, auto start/complete.')}
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
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={MES_ROUTES.operatorRawMaterials}>{t('mes.operator.rawMaterials', 'Raw materials')}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={MES_ROUTES.operatorKiosk}>{t('mes.operator.kiosk', 'Kiosk')}</Link>
              </Button>
            </>
          }
        />
        {body}
      </MesShell>
    </Page>
  )
}
