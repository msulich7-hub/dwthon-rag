'use client'

import * as React from 'react'
import Link from 'next/link'
import { KioskShell } from '../../../components/kiosk/KioskShell'
import { kiosk } from '../../../components/kiosk/kiosk-styles'

type Card = {
  id: string
  ifsRef: string
  recipientName: string | null
  addressLine: string | null
  complementStatus: string | null
}

export default function FormatAQueuePage() {
  const [cards, setCards] = React.useState<Card[]>([])

  React.useEffect(() => {
    void fetch('/api/transport_dispatch/format-a/queue')
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
  }, [])

  return (
    <KioskShell
      title="Format A"
      subtitle="Uzupełnij paczki i palety"
      progress={`${cards.length} w kolejce`}
      backHref="/backend/transport_dispatch"
    >
      {cards.length === 0 ? (
        <p className="text-center text-lg text-muted-foreground py-20">Kolejka pusta — pobierz dane z IFS</p>
      ) : (
        <ul className="space-y-4">
          {cards.map((c, i) => (
            <li key={c.id}>
              <Link
                href={`/backend/transport_dispatch/format-a/${c.id}?index=${i}&total=${cards.length}`}
                className={kiosk.card}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-xl font-bold font-mono">{c.ifsRef}</p>
                    <p className="text-sm text-muted-foreground">{c.recipientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.addressLine}</p>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </KioskShell>
  )
}
