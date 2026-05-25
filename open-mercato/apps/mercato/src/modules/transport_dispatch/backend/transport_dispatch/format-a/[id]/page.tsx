'use client'

import * as React from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { FormatADetail } from '../../../../components/kiosk/FormatADetail'

export default function FormatADetailPage() {
  const params = useParams()
  const search = useSearchParams()
  const id = String(params.id)
  const index = Number.parseInt(search.get('index') ?? '0', 10)
  const total = Number.parseInt(search.get('total') ?? '1', 10)
  const [ready, setReady] = React.useState(false)
  const [data, setData] = React.useState<{
    card: {
      ifsRef: string
      recipientName: string | null
      addressLine: string | null
      complementStatus: string | null
    }
    catalog: { packages: Array<{ code: string; labelPl: string; icon: string }>; pallets: Array<{ code: string; labelPl: string; icon: string }> }
  } | null>(null)

  React.useEffect(() => {
    void fetch('/api/transport_dispatch/format-a/queue')
      .then((r) => r.json())
      .then((d) => {
        const card = (d.cards ?? []).find((c: { id: string }) => c.id === id)
        if (card) {
          setData({ card, catalog: d.catalog })
        }
        setReady(true)
      })
  }, [id])

  if (!ready || !data) {
    return <div className="p-8 text-center">Ładowanie…</div>
  }

  return (
    <FormatADetail
      consignmentId={id}
      ifsRef={data.card.ifsRef}
      recipientName={data.card.recipientName}
      addressLine={data.card.addressLine}
      complementStatus={data.card.complementStatus}
      index={index}
      total={total}
      packages={data.catalog.packages}
      pallets={data.catalog.pallets}
    />
  )
}
