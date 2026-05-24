"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@open-mercato/ui/primitives/button'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../../components/MesShell'
import { MesCameraScanner } from '../../../components/MesCameraScanner'
import { MesScanField } from '../../../components/MesScanField'
import { MES_ROUTES } from '../../../lib/mes-routes'

type LotRow = {
  id: string
  lotNumber: string
  productCode: string
  quantity: number
  status: string
  workOrderId: string | null
}

type RecallResult = {
  lot: LotRow
  consumptions: Array<{
    id: string
    orderNumber: string
    operationName: string
    quantity: number
    consumedAt: string
    workOrderId: string
  }>
}

export default function MesTracePage() {
  const t = useT()
  const [lots, setLots] = React.useState<LotRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [recallLot, setRecallLot] = React.useState('')
  const [recall, setRecall] = React.useState<RecallResult | null>(null)
  const [newLot, setNewLot] = React.useState({ lotNumber: '', productCode: '', quantity: '1' })

  const loadLots = React.useCallback(async () => {
    setLoading(true)
    try {
      const payload = await readApiResultOrThrow<{ lots: LotRow[] }>('/api/mes/lots?limit=100')
      setLots(payload.lots ?? [])
    } catch {
      flash(t('mes.trace.loadError', 'Failed to load lots'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    void loadLots()
  }, [loadLots])

  const handleRecall = async (lotNumber: string) => {
    const normalized = lotNumber.trim()
    if (!normalized) return
    setRecallLot(normalized)
    try {
      const payload = await readApiResultOrThrow<{ recall: RecallResult }>(
        `/api/mes/trace/recall?lotNumber=${encodeURIComponent(normalized)}`,
      )
      setRecall(payload.recall)
    } catch {
      setRecall(null)
      flash(t('mes.trace.recallNotFound', 'Lot not found'), 'error')
    }
  }

  const handleCreateLot = async () => {
    const qty = Number.parseInt(newLot.quantity, 10)
    if (!newLot.lotNumber.trim() || !newLot.productCode.trim() || !Number.isFinite(qty) || qty < 1) return
    const call = await apiCall('/api/mes/lots', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lotNumber: newLot.lotNumber.trim(),
        productCode: newLot.productCode.trim(),
        quantity: qty,
      }),
    })
    if (!call.ok) {
      flash(t('mes.trace.createError', 'Could not create lot'), 'error')
      return
    }
    flash(t('mes.trace.createSuccess', 'Lot created'), 'success')
    setNewLot({ lotNumber: '', productCode: '', quantity: '1' })
    await loadLots()
  }

  const columns = React.useMemo<ColumnDef<LotRow>[]>(
    () => [
      { accessorKey: 'lotNumber', header: t('mes.trace.columns.lot', 'Lot #') },
      { accessorKey: 'productCode', header: t('mes.trace.columns.product', 'Product') },
      { accessorKey: 'quantity', header: t('mes.trace.columns.qty', 'Qty') },
      { accessorKey: 'status', header: t('mes.trace.columns.status', 'Status') },
      {
        id: 'workOrder',
        header: t('mes.trace.columns.workOrder', 'Work order'),
        cell: ({ row }) =>
          row.original.workOrderId ? (
            <Link href={MES_ROUTES.workOrder(row.original.workOrderId)} className="text-primary hover:underline text-xs">
              {t('mes.trace.viewWo', 'View')}
            </Link>
          ) : (
            '—'
          ),
      },
    ],
    [t],
  )

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={t('mes.trace.title', 'Traceability')}
          description={t('mes.trace.description', 'Lots, material consumption, and recall search (Phase C foundation).')}
        />
        <PageBody className="space-y-8">
          <section className="space-y-4 rounded-lg border p-4">
            <h2 className="text-sm font-medium">{t('mes.trace.recallTitle', 'Recall search')}</h2>
            <MesScanField onScan={handleRecall} />
            <MesCameraScanner onScan={handleRecall} />
            {recall ? (
              <div className="rounded-md bg-muted/30 p-3 text-sm space-y-2">
                <div>
                  <span className="font-medium">{recall.lot.lotNumber}</span> · {recall.lot.productCode} ·{' '}
                  {recall.lot.status}
                </div>
                {recall.consumptions.length === 0 ? (
                  <p className="text-muted-foreground">{t('mes.trace.noConsumptions', 'No consumptions recorded.')}</p>
                ) : (
                  <ul className="space-y-1">
                    {recall.consumptions.map((row) => (
                      <li key={row.id}>
                        <Link href={MES_ROUTES.workOrder(row.workOrderId)} className="text-primary hover:underline">
                          {row.orderNumber}
                        </Link>
                        {' — '}
                        {row.operationName} × {row.quantity} ({new Date(row.consumedAt).toLocaleString()})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : recallLot ? (
              <p className="text-xs text-muted-foreground">{t('mes.trace.recallPending', 'Search for {lot}', { lot: recallLot })}</p>
            ) : null}
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <h2 className="text-sm font-medium">{t('mes.trace.createLotTitle', 'Register lot')}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="new-lot-num">{t('mes.trace.lotNumber', 'Lot number')}</Label>
                <Input id="new-lot-num" value={newLot.lotNumber} onChange={(e) => setNewLot((s) => ({ ...s, lotNumber: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-lot-product">{t('mes.trace.productCode', 'Product')}</Label>
                <Input id="new-lot-product" value={newLot.productCode} onChange={(e) => setNewLot((s) => ({ ...s, productCode: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-lot-qty">{t('mes.trace.quantity', 'Quantity')}</Label>
                <Input id="new-lot-qty" type="number" min={1} value={newLot.quantity} onChange={(e) => setNewLot((s) => ({ ...s, quantity: e.target.value }))} />
              </div>
            </div>
            <Button type="button" size="sm" onClick={() => void handleCreateLot()}>
              {t('mes.trace.createLot', 'Create lot')}
            </Button>
          </section>

          <DataTable
            title={t('mes.trace.lotsTitle', 'Lots')}
            columns={columns}
            data={lots}
            isLoading={loading}
            refreshButton={{ onRefresh: () => void loadLots(), label: t('mes.trace.refresh', 'Refresh') }}
          />
        </PageBody>
      </MesShell>
    </Page>
  )
}
