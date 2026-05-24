"use client"

import * as React from 'react'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { DataTable } from '@open-mercato/ui/backend/DataTable'
import type { FilterDef, FilterValues } from '@open-mercato/ui/backend/FilterBar'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../../components/MesShell'
import { MesStatusBadge } from '../../../components/MesStatusBadge'
import { MES_ROUTES } from '../../../lib/mes-routes'

type WorkOrderRow = {
  id: string
  orderNumber: string
  productCode: string
  quantity: number
  status: string
  dealId: string | null
  salesOrderId: string | null
  updatedAt: string
}

type WorkOrdersResponse = {
  workOrders: WorkOrderRow[]
}

const STATUS_OPTIONS = ['draft', 'planned', 'in_progress', 'completed', 'cancelled'] as const

export default function MesWorkOrdersPage() {
  const t = useT()
  const [rows, setRows] = React.useState<WorkOrderRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [filterValues, setFilterValues] = React.useState<FilterValues>({})
  const [reloadToken, setReloadToken] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('limit', '200')
        if (typeof filterValues.status === 'string' && filterValues.status) {
          params.set('status', filterValues.status)
        }
        const call = await apiCall<WorkOrdersResponse>(`/api/mes/work-orders?${params.toString()}`, undefined, {
          fallback: { workOrders: [] },
        })
        if (!call.ok) {
          flash(t('mes.workOrders.loadError', 'Failed to load work orders'), 'error')
          return
        }
        let list = call.result?.workOrders ?? []
        if (typeof filterValues.link === 'string') {
          if (filterValues.link === 'deal') list = list.filter((wo) => wo.dealId)
          if (filterValues.link === 'sales') list = list.filter((wo) => wo.salesOrderId)
          if (filterValues.link === 'none') list = list.filter((wo) => !wo.dealId && !wo.salesOrderId)
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          list = list.filter(
            (wo) =>
              wo.orderNumber.toLowerCase().includes(q) ||
              wo.productCode.toLowerCase().includes(q),
          )
        }
        if (!cancelled) setRows(list)
      } catch {
        if (!cancelled) flash(t('mes.workOrders.loadError', 'Failed to load work orders'), 'error')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [filterValues.link, filterValues.status, reloadToken, search, t])

  const filters = React.useMemo<FilterDef[]>(
    () => [
      {
        id: 'status',
        label: t('mes.workOrders.filters.status', 'Status'),
        type: 'select',
        options: STATUS_OPTIONS.map((value) => ({
          value,
          label: t(`mes.status.workOrder.${value}`, value),
        })),
      },
      {
        id: 'link',
        label: t('mes.workOrders.filters.link', 'Link'),
        type: 'select',
        options: [
          { value: 'deal', label: t('mes.workOrders.filters.deal', 'CRM deal') },
          { value: 'sales', label: t('mes.workOrders.filters.sales', 'Sales order') },
          { value: 'none', label: t('mes.workOrders.filters.standalone', 'Standalone') },
        ],
      },
    ],
    [t],
  )

  const columns = React.useMemo<ColumnDef<WorkOrderRow>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: t('mes.workOrders.columns.orderNumber', 'Order #'),
        cell: ({ row }) => <span className="font-medium">{row.original.orderNumber}</span>,
      },
      {
        accessorKey: 'productCode',
        header: t('mes.workOrders.columns.product', 'Product'),
      },
      {
        accessorKey: 'quantity',
        header: t('mes.workOrders.columns.qty', 'Qty'),
      },
      {
        accessorKey: 'status',
        header: t('mes.workOrders.columns.status', 'Status'),
        cell: ({ row }) => (
          <MesStatusBadge
            status={row.original.status}
            label={t(`mes.status.workOrder.${row.original.status}`, row.original.status)}
          />
        ),
      },
      {
        id: 'links',
        header: t('mes.workOrders.columns.links', 'Links'),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {row.original.dealId ? (
              <span>{t('mes.workOrders.linkedDeal', 'Deal')}</span>
            ) : null}
            {row.original.salesOrderId ? (
              <Link href={MES_ROUTES.salesOrders} className="text-primary hover:underline">
                {t('mes.workOrders.linkedSales', 'Sales order')}
              </Link>
            ) : null}
            {!row.original.dealId && !row.original.salesOrderId ? '—' : null}
          </div>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: t('mes.workOrders.columns.updated', 'Updated'),
        cell: ({ row }) => {
          try {
            return new Date(row.original.updatedAt).toLocaleString()
          } catch {
            return '—'
          }
        },
      },
    ],
    [t],
  )

  return (
    <Page>
      <MesShell>
        <PageBody className="space-y-4">
          <DataTable
            title={t('mes.workOrders.title', 'Work orders')}
            columns={columns}
            data={rows}
            isLoading={isLoading}
            searchValue={search}
            onSearchChange={setSearch}
            filters={filters}
            filterValues={filterValues}
            onFiltersApply={setFilterValues}
            onFiltersClear={() => setFilterValues({})}
            perspective={{ tableId: 'mes.workOrders.list' }}
            refreshButton={{
              onRefresh: () => setReloadToken((token) => token + 1),
              label: t('mes.workOrders.refresh', 'Refresh'),
            }}
            emptyState={
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('mes.workOrders.empty', 'No work orders match your filters.')}
              </p>
            }
          />
        </PageBody>
      </MesShell>
    </Page>
  )
}
