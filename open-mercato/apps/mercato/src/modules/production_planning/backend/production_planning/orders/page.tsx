"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type OrderItem = {
  id: string
  code: string
  title: string
  status: string
  isLate: boolean
  salesOrderId: string | null
}

export default function ProductionOrdersPage() {
  const [items, setItems] = React.useState<OrderItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    void apiCall<{ items?: OrderItem[] }>('/api/production_planning/orders')
      .then(({ result }) => setItems(result?.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Page>
      <PageHeader
        title="Zlecenia produkcyjne"
        description="Zlecenia powiązane z zamówieniami sprzedaży i operacjami routingu."
        actions={
          <Link href={PP_ROUTES.hub} className="text-sm underline text-muted-foreground">
            Powrót
          </Link>
        }
      />
      <PageBody>
        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak zleceń — utwórz zlecenie z zakładki Produkcja na zamówieniu.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border p-3 text-sm flex flex-wrap justify-between gap-2">
                <span>
                  <span className="font-medium">{item.code}</span> — {item.title}
                  {item.isLate ? (
                    <span className="ml-2 text-xs text-destructive">(opóźnione)</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">{item.status}</span>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </Page>
  )
}
