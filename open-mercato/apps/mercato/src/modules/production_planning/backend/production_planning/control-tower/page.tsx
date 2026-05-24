"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { PP_ROUTES } from '../../../lib/routes'

type Overview = {
  horizonHours: number
  openOrders: number
  lateOrders: number
  openExceptions: number
  criticalExceptions: number
  workCenterCount: number
  maxUtilizationPct: number
  openOptimizeJobs: number
  failedScenarios24h: number
  cpsatBridgeConfigured: boolean
  generatedAt: string
}

type ExceptionRow = {
  id: string
  severity: string
  category: string
  title: string
  message: string
  ageMinutes: number
  drillPath: string | null
}

export default function ControlTowerPage() {
  const [overview, setOverview] = React.useState<Overview | null>(null)
  const [exceptions, setExceptions] = React.useState<ExceptionRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setError(null)
    try {
      const [ovRes, exRes] = await Promise.all([
        fetch('/api/production_planning/control-tower/overview?horizonHours=168'),
        fetch('/api/production_planning/control-tower/exceptions?limit=50'),
      ])
      if (!ovRes.ok || !exRes.ok) {
        throw new Error('Failed to load control tower data')
      }
      const ov = (await ovRes.json()) as Overview
      const exBody = (await exRes.json()) as { items: ExceptionRow[] }
      setOverview(ov)
      setExceptions(exBody.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  return (
    <Page>
      <PageHeader
        title="Control tower"
        description="Wyjątki planowania, KPI i status mostu CP-SAT (parity o9 / Kinaxis)."
        actions={
          <button type="button" className="text-sm underline" onClick={() => void load()}>
            Odśwież
          </button>
        }
      />
      <PageBody className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {overview ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Spóźnione MO" value={String(overview.lateOrders)} />
            <KpiCard label="Wyjątki" value={String(overview.openExceptions)} />
            <KpiCard label="Krytyczne" value={String(overview.criticalExceptions)} />
            <KpiCard
              label="CP-SAT bridge"
              value={overview.cpsatBridgeConfigured ? 'OK' : 'Brak URL'}
            />
            <KpiCard label="Max obciążenie WC" value={`${overview.maxUtilizationPct}%`} />
            <KpiCard label="Otwarte joby" value={String(overview.openOptimizeJobs)} />
            <KpiCard label="Failed scenariusze 24h" value={String(overview.failedScenarios24h)} />
            <KpiCard label="Gniazda" value={String(overview.workCenterCount)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        )}

        <section>
          <h2 className="text-sm font-medium mb-2">Kolejka wyjątków</h2>
          <div className="rounded-lg border divide-y">
            {exceptions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Brak wyjątków.</p>
            ) : (
              exceptions.map((row) => (
                <div key={row.id} className="p-3 text-sm flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={row.severity} />
                    <span className="font-medium">{row.title}</span>
                  </div>
                  <p className="text-muted-foreground">{row.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.category} · {row.ageMinutes} min
                    {row.drillPath ? (
                      <>
                        {' · '}
                        <Link href={row.drillPath} className="underline">
                          Szczegóły
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          <Link href={PP_ROUTES.hub} className="underline">
            ← Hub planowania
          </Link>
        </p>
      </PageBody>
    </Page>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'critical'
      ? 'bg-red-500/15 text-red-800 dark:text-red-200'
      : severity === 'high'
        ? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
        : 'bg-slate-500/15 text-slate-800 dark:text-slate-200'
  return (
    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${cls}`}>{severity}</span>
  )
}
