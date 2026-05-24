"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type PoolRow = {
  poolOrderId: string
  poolOrderCode: string
  productSku: string | null
  quantity: number
  dueAt: string | null
  memberCount: number
  peggingLinks: Array<{
    genesisRootId: string
    demandSku: string
    quantity: number
    demandSourceId: string
  }>
}

export default function PoolWorkbenchPage() {
  const [rows, setRows] = React.useState<PoolRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expanded, setExpanded] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    setLoading(true)
    void apiCall<{ poolOrders: PoolRow[] }>('/api/production_planning/mrp/pool-orders?limit=100')
      .then(({ result }) => setRows(result?.poolOrders ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <Page>
      <PageHeader
        title="Pool MO workbench"
        description="Skonsolidowane zlecenia z nettingu i pegi do korzeni genesis (Mercato, bez IFS)."
        actions={
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => load()}>
              Odśwież
            </Button>
            <Link href={PP_ROUTES.genesis} className="text-sm underline text-muted-foreground self-center">
              Genesis
            </Link>
          </div>
        }
      />
      <PageBody>
        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak pool MO — uruchom netting na seedzie fabryki.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((row) => (
              <li key={row.poolOrderId} className="border rounded-lg p-3">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() =>
                    setExpanded(expanded === row.poolOrderId ? null : row.poolOrderId)
                  }
                >
                  <div className="font-medium font-mono">{row.poolOrderCode}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.productSku} · qty {row.quantity} · {row.memberCount} pegów
                    {row.dueAt ? ` · due ${new Date(row.dueAt).toLocaleDateString()}` : ''}
                  </div>
                </button>
                {expanded === row.poolOrderId ? (
                  <ul className="mt-2 text-xs space-y-1 border-t pt-2">
                    {row.peggingLinks.map((p) => (
                      <li key={p.genesisRootId} className="font-mono text-muted-foreground">
                        {p.demandSku} ×{p.quantity} · {p.demandSourceId.slice(0, 48)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </Page>
  )
}
