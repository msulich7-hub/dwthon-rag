'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { FormatBDetail } from '../../../../components/kiosk/FormatBDetail'
import { EXPEDITION_CODES } from '../../../../lib/catalog'

export default function FormatBDetailPage() {
  const params = useParams()
  const id = String(params.id)
  const [detail, setDetail] = React.useState<{
    consignment: {
      ifsRef: string
      recipientName: string | null
      addressLine: string | null
    }
    lines: Array<{ kind: 'package' | 'pallet'; typeCode: string; quantity: number }>
  } | null>(null)

  React.useEffect(() => {
    void fetch(`/api/transport_dispatch/format-b/${id}/complete`)
      .then((r) => r.json())
      .then(setDetail)
  }, [id])

  if (!detail) {
    return <div className="p-8 text-center text-lg">Ładowanie…</div>
  }

  const packageLines = detail.lines.filter((l) => l.kind === 'package')
  const palletLines = detail.lines.filter((l) => l.kind === 'pallet')

  return (
    <FormatBDetail
      consignmentId={id}
      ifsRef={detail.consignment.ifsRef}
      recipientName={detail.consignment.recipientName}
      addressLine={detail.consignment.addressLine}
      initialPackageLines={packageLines}
      initialPalletLines={palletLines}
      expeditions={EXPEDITION_CODES.filter((e) => e.code === 'X' || e.code === 'Y')}
    />
  )
}
