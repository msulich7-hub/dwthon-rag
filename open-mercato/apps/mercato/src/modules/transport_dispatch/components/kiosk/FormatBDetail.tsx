'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { KioskShell } from './KioskShell'
import { StepperTile } from './StepperTile'
import { kiosk } from './kiosk-styles'

type CatalogItem = { code: string; labelPl: string; icon: string }
type Line = { kind: 'package' | 'pallet'; typeCode: string; quantity: number }

type Props = {
  consignmentId: string
  ifsRef: string
  recipientName: string | null
  addressLine: string | null
  initialPackageLines: Line[]
  initialPalletLines: Line[]
  expeditions: Array<{ code: string; labelPl: string }>
}

function linesToCounts(items: CatalogItem[], lines: Line[]): Record<string, number> {
  const base = Object.fromEntries(items.map((i) => [i.code, 0]))
  for (const line of lines) {
    if (line.typeCode in base) base[line.typeCode] = line.quantity
  }
  return base
}

export function FormatBDetail(props: Props) {
  const router = useRouter()
  const [pkgExp, setPkgExp] = React.useState('X')
  const [pltExp, setPltExp] = React.useState('Y')
  const [pkgCounts, setPkgCounts] = React.useState<Record<string, number>>({})
  const [pltCounts, setPltCounts] = React.useState<Record<string, number>>({})
  const [packages, setPackages] = React.useState<CatalogItem[]>([])
  const [pallets, setPallets] = React.useState<CatalogItem[]>([])
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    void fetch('/api/transport_dispatch/format-b/queue')
      .then((r) => r.json())
      .then((data) => {
        setPackages(data.catalog?.packages ?? [])
        setPallets(data.catalog?.pallets ?? [])
        setPkgCounts(
          linesToCounts(data.catalog?.packages ?? [], props.initialPackageLines),
        )
        setPltCounts(
          linesToCounts(data.catalog?.pallets ?? [], props.initialPalletLines),
        )
      })
  }, [props.initialPackageLines, props.initialPalletLines])

  async function submit() {
    setBusy(true)
    try {
      const packageLines = packages.map((p) => ({
        kind: 'package' as const,
        typeCode: p.code,
        quantity: pkgCounts[p.code] ?? 0,
      }))
      const palletLines = pallets.map((p) => ({
        kind: 'pallet' as const,
        typeCode: p.code,
        quantity: pltCounts[p.code] ?? 0,
      }))
      const res = await fetch(`/api/transport_dispatch/format-b/${props.consignmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageExpedition: pkgExp,
          palletExpedition: pltExp,
          packageLines,
          palletLines,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Błąd')
      router.push('/backend/transport_dispatch/format-b?done=1')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KioskShell
      title={props.ifsRef}
      subtitle={[props.recipientName, props.addressLine].filter(Boolean).join(' · ')}
      backHref="/backend/transport_dispatch/format-b"
      footer={
        <button
          type="button"
          className={kiosk.btnPrimary}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? '…' : 'Generuj listy'}
        </button>
      }
    >
      <div className={kiosk.grid2}>
        <section className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 p-4">
          <h2 className="font-bold text-lg mb-2">Paczki →</h2>
          <div className="flex gap-2 mb-4">
            {props.expeditions.map((e) => (
              <button
                key={`pkg-${e.code}`}
                type="button"
                className={`flex-1 min-h-[48px] rounded-xl font-bold text-lg ${
                  pkgExp === e.code ? 'bg-blue-600 text-white' : 'bg-white border-2'
                }`}
                onClick={() => setPkgExp(e.code)}
              >
                {e.code}
              </button>
            ))}
          </div>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto">
            {packages.map((p) => (
              <StepperTile
                key={p.code}
                icon={p.icon}
                label={p.labelPl}
                count={pkgCounts[p.code] ?? 0}
                onChange={(n) => setPkgCounts((c) => ({ ...c, [p.code]: n }))}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/30 p-4">
          <h2 className="font-bold text-lg mb-2">Palety →</h2>
          <div className="flex gap-2 mb-4">
            {props.expeditions.map((e) => (
              <button
                key={`plt-${e.code}`}
                type="button"
                className={`flex-1 min-h-[48px] rounded-xl font-bold text-lg ${
                  pltExp === e.code ? 'bg-amber-600 text-white' : 'bg-white border-2'
                }`}
                onClick={() => setPltExp(e.code)}
              >
                {e.code}
              </button>
            ))}
          </div>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto">
            {pallets.map((p) => (
              <StepperTile
                key={p.code}
                icon={p.icon}
                label={p.labelPl}
                count={pltCounts[p.code] ?? 0}
                onChange={(n) => setPltCounts((c) => ({ ...c, [p.code]: n }))}
              />
            ))}
          </div>
        </section>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Np. lista 1: 3× Paleta A + 1× Paleta B · lista 2: 2× paczki niestandardowe
      </p>
    </KioskShell>
  )
}
