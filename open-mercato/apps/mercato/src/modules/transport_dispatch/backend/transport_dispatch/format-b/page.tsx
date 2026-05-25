'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { KioskShell } from '../../../components/kiosk/KioskShell'
import { kiosk } from '../../../components/kiosk/kiosk-styles'

type Card = {
  id: string
  ifsRef: string
  recipientName: string | null
  isMixed: boolean
  packageCount: number
  palletCount: number
}

export default function FormatBQueuePage() {
  const search = useSearchParams()
  const [stats, setStats] = React.useState({ total: 0, mixed: 0 })
  const [cards, setCards] = React.useState<Card[]>([])

  React.useEffect(() => {
    void fetch('/api/transport_dispatch/format-b/queue')
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? { total: 0, mixed: 0 })
        setCards(d.cards ?? [])
      })
  }, [])

  return (
    <KioskShell
      title="Format B"
      subtitle="Rozdziel paczki i palety"
      backHref="/backend/transport_dispatch"
    >
      {search.get('done') ? (
        <p className="text-center text-2xl font-bold text-emerald-600 py-8">Listy wygenerowane ✓</p>
      ) : null}

      <div className={`${kiosk.grid2} mb-8`}>
        <div className="text-center p-6 rounded-2xl bg-white dark:bg-slate-900 border-2">
          <p className={kiosk.statBig}>{stats.total}</p>
          <p className={kiosk.statLabel}>nieprzetworzone</p>
        </div>
        <div className="text-center p-6 rounded-2xl bg-amber-50 border-2 border-amber-200">
          <p className={`${kiosk.statBig} text-amber-800`}>{stats.mixed}</p>
          <p className={kiosk.statLabel}>mieszane</p>
        </div>
      </div>

      <ul className="space-y-4">
        {cards.map((c) => (
          <li key={c.id}>
            <Link href={`/backend/transport_dispatch/format-b/${c.id}`} className={kiosk.card}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {c.isMixed ? <span className={kiosk.badgeMixed}>Mieszane</span> : null}
                <span className="text-sm font-medium">
                  {c.packageCount} pacz. · {c.palletCount} pal.
                </span>
              </div>
              <p className="text-xl font-bold font-mono">{c.ifsRef}</p>
              <p className="text-sm text-muted-foreground">{c.recipientName}</p>
            </Link>
          </li>
        ))}
      </ul>
    </KioskShell>
  )
}
