"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type WorkCenterLoad = {
  workCenterCode: string
  scheduledMinutes: number
  operationCount: number
  utilizationPct: number
  calendarCapacityMinutes?: number
  calendarId?: string
}

type Snapshot = {
  horizonHours: number
  openOrders: number
  lateOrders: number
  workCenters: WorkCenterLoad[]
}

export default function ProductionSchedulePage() {
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [optimizing, setOptimizing] = React.useState(false)
  const [replanning, setReplanning] = React.useState(false)
  const [optimizeMessage, setOptimizeMessage] = React.useState<string | null>(null)

  const loadCapacity = React.useCallback(() => {
    setLoading(true)
    void apiCall<Snapshot>('/api/production_planning/capacity')
      .then(({ result }) => setSnapshot(result ?? null))
      .catch(() => setSnapshot(null))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    loadCapacity()
  }, [loadCapacity])

  const runCpsatOptimize = React.useCallback(async () => {
    setOptimizing(true)
    setOptimizeMessage(null)
    try {
      const { result } = await apiCall<{
        optimization?: { message?: string; status?: string }
        apply?: { applied?: number }
        cpsatConfigured?: boolean
      }>('/api/production_planning/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: 'minimize_lateness', applySync: true }),
      })
      const applied = result?.apply?.applied ?? 0
      const msg = result?.optimization?.message ?? result?.optimization?.status ?? 'OK'
      setOptimizeMessage(
        result?.cpsatConfigured
          ? `CP-SAT: ${msg}${applied > 0 ? ` · zastosowano ${applied} operacji` : ''}`
          : `${msg} (ustaw ORTOOLS_BRIDGE_URL na services/ortools-scheduler)`,
      )
      loadCapacity()
    } catch {
      setOptimizeMessage('Optymalizacja CP-SAT nie powiodła się.')
    } finally {
      setOptimizing(false)
    }
  }, [loadCapacity])

  const runDeltaReplan = React.useCallback(async () => {
    setReplanning(true)
    setOptimizeMessage(null)
    try {
      const { result } = await apiCall<{
        netting: { rootsProcessed: number; consolidationPct: number }
        optimize?: { applied: number; status: string }
        antiFantasy: { passed: boolean; violationCount: number }
        wallMs: number
      }>('/api/production_planning/delta-replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runOptimize: true }),
      })
      setOptimizeMessage(
        `Delta replan ${result?.wallMs ?? '?'} ms · netting ${result?.netting.rootsProcessed ?? 0} roots · CP-SAT ${result?.optimize?.applied ?? 0} ops · AF ${result?.antiFantasy.passed ? 'OK' : `${result?.antiFantasy.violationCount} violations`}`,
      )
      loadCapacity()
    } catch {
      setOptimizeMessage('Delta replan nie powiódł się.')
    } finally {
      setReplanning(false)
    }
  }, [loadCapacity])

  return (
    <Page>
      <PageHeader
        title="Harmonogram — pojemność"
        description="Wykorzystanie gniazd (kalendarze Mercato 1–3 zmiany) + CP-SAT + delta replan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={optimizing} onClick={() => void runCpsatOptimize()}>
              {optimizing ? 'Optymalizuję…' : 'Optymalizuj CP-SAT'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={replanning || optimizing}
              onClick={() => void runDeltaReplan()}
            >
              {replanning ? 'Replan…' : 'Delta replan'}
            </Button>
            <Link href={PP_ROUTES.hub} className="text-sm underline text-muted-foreground">
              Powrót
            </Link>
          </div>
        }
      />
      <PageBody className="space-y-4">
        {optimizeMessage ? (
          <p className="text-sm rounded-lg border bg-muted/30 p-3 text-muted-foreground">{optimizeMessage}</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        ) : !snapshot ? (
          <p className="text-sm text-muted-foreground">Nie udało się wczytać danych pojemności.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Otwarte zlecenia</div>
                <div className="text-2xl font-semibold">{snapshot.openOrders}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Opóźnione</div>
                <div className="text-2xl font-semibold text-destructive">{snapshot.lateOrders}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Horyzont (h)</div>
                <div className="text-2xl font-semibold">{snapshot.horizonHours}</div>
              </div>
            </div>
            {snapshot.workCenters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak zaplanowanych operacji.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.workCenters.map((wc) => (
                  <li key={wc.workCenterCode} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{wc.workCenterCode}</span>
                      <span>{wc.utilizationPct}% obciążenia</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {wc.operationCount} operacji · {wc.scheduledMinutes} min /{' '}
                      {wc.calendarCapacityMinutes ?? '—'} min pojemności kalendarza
                      {wc.calendarId ? ` · ${wc.calendarId}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </PageBody>
    </Page>
  )
}
