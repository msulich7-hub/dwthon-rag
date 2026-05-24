"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MES_ROUTES } from '../../../lib/mes-routes'

type DispatchQueueItem = {
  workOrderId: string
  orderNumber: string
  productCode: string
  operation: { id: string; operationName: string; status: string; plannedQty: number; completedQty: number }
}

type QueueResponse = { queue: DispatchQueueItem[] }

export default function MesOperatorPage() {
  const t = useT()
  const [queue, setQueue] = React.useState<DispatchQueueItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const loadQueue = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await readApiResultOrThrow<QueueResponse>('/api/mes/dispatch-queue')
      setQueue(payload.queue ?? [])
    } catch {
      setError(t('mes.operator.loadError', 'Failed to load dispatch queue'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const handleStart = async (item: DispatchQueueItem) => {
    if (item.operation.status !== 'ready') return
    setBusyId(item.operation.id)
    try {
      await apiCall(
        `/api/mes/work-orders/${encodeURIComponent(item.workOrderId)}/operations/${encodeURIComponent(item.operation.id)}/confirm`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ confirmationType: 'start' }),
        },
      )
      await loadQueue()
    } finally {
      setBusyId(null)
    }
  }

  const handleComplete = async (item: DispatchQueueItem) => {
    if (item.operation.status !== 'in_progress') return
    setBusyId(item.operation.id)
    try {
      const remaining = item.operation.plannedQty - item.operation.completedQty
      await apiCall(
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
      await loadQueue()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Page>
      <PageHeader
        title={t('mes.operator.title', 'Operator queue')}
        description={t('mes.operator.description', 'Shop-floor dispatch — start and complete operations.')}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={MES_ROUTES.hub}>{t('mes.operator.backHub', 'MES hub')}</Link>
          </Button>
        }
      />
      <PageBody className="space-y-4">
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {loading ? (
          <div className="text-sm text-muted-foreground">{t('mes.operator.loading', 'Loading queue…')}</div>
        ) : queue.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('mes.operator.empty', 'No operations in queue.')}</div>
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => (
              <li key={item.operation.id} className="rounded-lg border p-4 space-y-3">
                <div>
                  <div className="font-medium">{item.orderNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.productCode} · {item.operation.operationName} ({item.operation.status})
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.operation.status === 'ready' ? (
                    <Button
                      size="lg"
                      className="min-h-12 min-w-32"
                      disabled={busyId === item.operation.id}
                      onClick={() => void handleStart(item)}
                    >
                      {t('mes.operator.start', 'Start')}
                    </Button>
                  ) : null}
                  {item.operation.status === 'in_progress' ? (
                    <Button
                      size="lg"
                      className="min-h-12 min-w-32"
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
    </Page>
  )
}
