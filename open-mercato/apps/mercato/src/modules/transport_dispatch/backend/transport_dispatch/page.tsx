'use client'

import * as React from 'react'
import Link from 'next/link'
import { kiosk } from '../../components/kiosk/kiosk-styles'

export default function TransportDispatchHubPage() {
  const [stats, setStats] = React.useState({ formatA: 0, formatB: 0, mixed: 0 })

  React.useEffect(() => {
    void Promise.all([
      fetch('/api/transport_dispatch/format-a/queue').then((r) => r.json()),
      fetch('/api/transport_dispatch/format-b/queue').then((r) => r.json()),
    ]).then(([a, b]) => {
      setStats({
        formatA: a.count ?? 0,
        formatB: b.stats?.total ?? 0,
        mixed: b.stats?.mixed ?? 0,
      })
    })
  }, [])

  async function pullIfs() {
    const res = await fetch('/api/transport_dispatch/ifs/pull', { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      window.location.reload()
    } else {
      alert(json.error ?? 'Import failed')
    }
  }

  return (
    <div className={kiosk.shell}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-black mb-2">Dyspozycja transportowa</h1>
        <p className="text-muted-foreground mb-8">Wybierz format — ok. 10 sekund na przesyłkę</p>

        <button
          type="button"
          onClick={() => void pullIfs()}
          className="mb-8 w-full min-h-[52px] rounded-2xl border-2 border-dashed font-semibold text-lg hover:bg-white dark:hover:bg-slate-900 transition"
        >
          Pobierz z IFS (próbka)
        </button>

        <div className="grid sm:grid-cols-2 gap-6">
          <Link href="/backend/transport_dispatch/format-a" className={`${kiosk.card} border-emerald-300`}>
            <span className="text-4xl mb-3 block">📦</span>
            <h2 className="text-2xl font-bold mb-1">Format A</h2>
            <p className="text-muted-foreground text-sm mb-4">Brak paczek w IFS — uzupełnij kafelkami</p>
            <p className={kiosk.statBig}>{stats.formatA}</p>
            <p className={kiosk.statLabel}>oczekuje</p>
          </Link>

          <Link href="/backend/transport_dispatch/format-b" className={`${kiosk.card} border-amber-300`}>
            <span className="text-4xl mb-3 block">🔀</span>
            <h2 className="text-2xl font-bold mb-1">Format B</h2>
            <p className="text-muted-foreground text-sm mb-4">Paczki + palety — rozdziel na ekspedycje</p>
            <p className={kiosk.statBig}>{stats.formatB}</p>
            <p className={kiosk.statLabel}>
              nieprzetworzone · <span className="text-amber-700">{stats.mixed} mieszanych</span>
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
