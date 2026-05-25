'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { KioskShell } from './KioskShell'
import { StepperTile } from './StepperTile'
import { kiosk } from './kiosk-styles'

type CatalogItem = { code: string; labelPl: string; icon: string }

type Props = {
  consignmentId: string
  ifsRef: string
  recipientName: string | null
  addressLine: string | null
  complementStatus: string | null
  index: number
  total: number
  packages: CatalogItem[]
  pallets: CatalogItem[]
}

type Counts = Record<string, number>

function initCounts(items: CatalogItem[]): Counts {
  return Object.fromEntries(items.map((i) => [i.code, 0]))
}

export function FormatADetail(props: Props) {
  const router = useRouter()
  const [complement, setComplement] = React.useState<'yes' | 'no' | null>(
    props.complementStatus === 'yes' || props.complementStatus === 'no'
      ? props.complementStatus
      : null,
  )
  const [pkgCounts, setPkgCounts] = React.useState(() => initCounts(props.packages))
  const [pltCounts, setPltCounts] = React.useState(() => initCounts(props.pallets))
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState<{ manifests: unknown[] } | null>(null)

  const totalUnits =
    Object.values(pkgCounts).reduce((a, b) => a + b, 0) +
    Object.values(pltCounts).reduce((a, b) => a + b, 0)

  const hasPackages = Object.values(pkgCounts).some((n) => n > 0)
  const hasPallets = Object.values(pltCounts).some((n) => n > 0)
  const autoSplit = hasPackages && hasPallets

  async function submit() {
    if (totalUnits === 0) return
    setBusy(true)
    try {
      const lines = [
        ...props.packages.map((p) => ({
          kind: 'package' as const,
          typeCode: p.code,
          quantity: pkgCounts[p.code] ?? 0,
        })),
        ...props.pallets.map((p) => ({
          kind: 'pallet' as const,
          typeCode: p.code,
          quantity: pltCounts[p.code] ?? 0,
        })),
      ]
      const res = await fetch(`/api/transport_dispatch/format-a/${props.consignmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complementStatus: complement ?? undefined,
          lines,
          splitLists: autoSplit,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Błąd zapisu')
      setDone(json)
      setTimeout(() => router.push('/backend/transport_dispatch/format-a'), 1200)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Błąd')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const count = (done.manifests as unknown[])?.length ?? 0
    return (
      <KioskShell title="Gotowe!" subtitle={props.ifsRef} progress={`${props.index + 1} / ${props.total}`}>
        <div className="text-center py-16">
          <p className="text-6xl mb-4">✓</p>
          <p className="text-2xl font-bold">
            Utworzono {count} {count === 1 ? 'listę' : 'listy'} transportową
          </p>
        </div>
      </KioskShell>
    )
  }

  return (
    <KioskShell
      title={props.ifsRef}
      subtitle={[props.recipientName, props.addressLine].filter(Boolean).join(' · ')}
      progress={`${props.index + 1} / ${props.total}`}
      backHref="/backend/transport_dispatch/format-a"
      footer={
        <>
          <button type="button" className={kiosk.btnSecondary} onClick={() => router.back()}>
            Pomiń
          </button>
          <button
            type="button"
            className={kiosk.btnPrimary}
            disabled={busy || totalUnits === 0}
            onClick={() => void submit()}
          >
            {busy ? '…' : autoSplit ? 'Generuj 2 listy' : 'Generuj listę'}
          </button>
        </>
      }
    >
      {complement === null ? (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">Uzupełnienie?</h2>
          <div className={kiosk.grid2}>
            <button
              type="button"
              className={`${kiosk.yesNo} ${complement === 'yes' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white'}`}
              onClick={() => setComplement('yes')}
            >
              TAK
            </button>
            <button
              type="button"
              className={`${kiosk.yesNo} ${complement === 'no' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white'}`}
              onClick={() => setComplement('no')}
            >
              NIE
            </button>
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">Paczki</h2>
        <div className={kiosk.grid3}>
          {props.packages.map((p) => (
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

      <section>
        <h2 className="text-lg font-bold mb-3">Palety</h2>
        <div className={`${kiosk.grid3} max-h-[50vh] overflow-y-auto pr-1`}>
          {props.pallets.map((p) => (
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

      {autoSplit ? (
        <p className="mt-6 text-center text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl py-3">
          Paczki i palety → dwie osobne listy transportowe
        </p>
      ) : null}
    </KioskShell>
  )
}
