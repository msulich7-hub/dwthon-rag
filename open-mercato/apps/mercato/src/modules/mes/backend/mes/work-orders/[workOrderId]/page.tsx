"use client"

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { canTransitionWorkOrderStatus } from '../../../../lib/work-order-status'
import type { MesWorkOrderStatus } from '../../../../data/entities'
import { MesShell } from '../../../../components/MesShell'
import { MesStatusBadge } from '../../../../components/MesStatusBadge'
import { MesOperationStepper, type MesOperationStep } from '../../../../components/MesOperationStepper'
import { MesProgressBar } from '../../../../components/MesProgressBar'
import { ReleaseRoutingPanel } from '../../../../components/ReleaseRoutingPanel'
import { MesListSkeleton } from '../../../../components/MesListSkeleton'
import { MES_ROUTES } from '../../../../lib/mes-routes'

type WorkOrderDetail = {
  id: string
  orderNumber: string
  productCode: string
  quantity: number
  status: MesWorkOrderStatus
  dealId: string | null
  salesOrderId: string | null
  notes: string | null
  updatedAt: string
}

type DetailResponse = {
  workOrder: WorkOrderDetail
  operations: MesOperationStep[]
}

const NEXT_STATUS: Partial<Record<MesWorkOrderStatus, MesWorkOrderStatus>> = {
  draft: 'planned',
  planned: 'in_progress',
  in_progress: 'completed',
}

export default function MesWorkOrderDetailPage() {
  const t = useT()
  const params = useParams()
  const workOrderId = typeof params?.workOrderId === 'string' ? params.workOrderId : ''

  const [detail, setDetail] = React.useState<DetailResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [transitioning, setTransitioning] = React.useState(false)
  const [lots, setLots] = React.useState<Array<{ id: string; lotNumber: string; productCode: string; quantity: number; status: string }>>([])

  const load = React.useCallback(async () => {
    if (!workOrderId) return
    setLoading(true)
    try {
      const payload = await readApiResultOrThrow<DetailResponse>(
        `/api/mes/work-orders/${encodeURIComponent(workOrderId)}`,
      )
      setDetail(payload)
      try {
        const lotsPayload = await readApiResultOrThrow<{
          lots: Array<{ id: string; lotNumber: string; productCode: string; quantity: number; status: string }>
        }>(`/api/mes/lots?workOrderId=${encodeURIComponent(workOrderId)}`)
        setLots(lotsPayload.lots ?? [])
      } catch {
        setLots([])
      }
    } catch {
      flash(t('mes.workOrderDetail.loadError', 'Failed to load work order'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t, workOrderId])

  React.useEffect(() => {
    void load()
  }, [load])

  const handleStatusAdvance = async () => {
    if (!detail) return
    const next = NEXT_STATUS[detail.workOrder.status]
    if (!next || !canTransitionWorkOrderStatus(detail.workOrder.status, next)) return

    setTransitioning(true)
    try {
      const call = await apiCall<{ workOrder: WorkOrderDetail }>(
        `/api/mes/work-orders/${encodeURIComponent(workOrderId)}/status`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: next }),
        },
      )
      if (!call.ok) {
        flash(t('mes.workOrderDetail.statusError', 'Could not update status'), 'error')
        return
      }
      flash(t('mes.workOrderDetail.statusSuccess', 'Status updated'), 'success')
      await load()
    } finally {
      setTransitioning(false)
    }
  }

  const completedOps = detail?.operations.filter((op) =>
    ['completed', 'skipped'].includes(op.status),
  ).length ?? 0
  const totalOps = detail?.operations.length ?? 0
  const progressPercent = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0

  const nextStatus = detail ? NEXT_STATUS[detail.workOrder.status] : undefined

  const lotColumns = React.useMemo<ColumnDef<(typeof lots)[number]>[]>(
    () => [
      { accessorKey: 'lotNumber', header: t('mes.trace.columns.lot', 'Lot #') },
      { accessorKey: 'productCode', header: t('mes.trace.columns.product', 'Product') },
      { accessorKey: 'quantity', header: t('mes.trace.columns.qty', 'Qty') },
      { accessorKey: 'status', header: t('mes.trace.columns.status', 'Status') },
    ],
    [t],
  )

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={detail?.workOrder.orderNumber ?? t('mes.workOrderDetail.title', 'Work order')}
          description={
            detail
              ? `${detail.workOrder.productCode} × ${detail.workOrder.quantity}`
              : t('mes.workOrderDetail.loadingTitle', 'Loading…')
          }
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href={MES_ROUTES.workOrders}>{t('mes.workOrderDetail.back', 'All work orders')}</Link>
            </Button>
          }
        />
        <PageBody className="space-y-6">
          {loading ? (
            <MesListSkeleton rows={3} />
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <MesStatusBadge
                  status={detail.workOrder.status}
                  label={t(`mes.status.workOrder.${detail.workOrder.status}`, detail.workOrder.status)}
                />
                {nextStatus ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={transitioning}
                    onClick={() => void handleStatusAdvance()}
                  >
                    {t('mes.workOrderDetail.advanceTo', 'Move to {status}', {
                      status: t(`mes.status.workOrder.${nextStatus}`, nextStatus),
                    })}
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={MES_ROUTES.operator}>{t('mes.workOrderDetail.operator', 'Operator queue')}</Link>
                </Button>
              </div>

              {totalOps > 0 ? (
                <MesProgressBar
                  percent={progressPercent}
                  label={t('mes.workOrderDetail.operationsProgress', 'Operations progress')}
                />
              ) : null}

              <section className="space-y-3">
                <h2 className="text-sm font-medium">{t('mes.workOrderDetail.routing', 'Routing')}</h2>
                <ReleaseRoutingPanel
                  workOrderId={detail.workOrder.id}
                  productCode={detail.workOrder.productCode}
                  onReleased={() => void load()}
                />
              </section>

              {totalOps > 0 ? (
                <section className="space-y-2">
                  <h2 className="text-sm font-medium">{t('mes.workOrderDetail.operations', 'Operations')}</h2>
                  <MesOperationStepper operations={detail.operations} />
                </section>
              ) : null}

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">{t('mes.workOrderDetail.lots', 'Lots')}</h2>
                  <Link href={MES_ROUTES.trace} className="text-xs text-primary hover:underline">
                    {t('mes.workOrderDetail.traceLink', 'Trace & recall')}
                  </Link>
                </div>
                {lots.length > 0 ? (
                  <DataTable columns={lotColumns} data={lots} isLoading={false} embedded />
                ) : (
                  <p className="text-xs text-muted-foreground">{t('mes.workOrderDetail.noLots', 'No lots linked.')}</p>
                )}
              </section>

              {detail.workOrder.notes ? (
                <section className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t('mes.workOrderDetail.notes', 'Notes')}
                  </div>
                  {detail.workOrder.notes}
                </section>
              ) : null}

              <div className="text-xs text-muted-foreground">
                {t('mes.workOrderDetail.updated', 'Updated {time}', {
                  time: new Date(detail.workOrder.updatedAt).toLocaleString(),
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('mes.workOrderDetail.notFound', 'Work order not found.')}
            </p>
          )}
        </PageBody>
      </MesShell>
    </Page>
  )
}
