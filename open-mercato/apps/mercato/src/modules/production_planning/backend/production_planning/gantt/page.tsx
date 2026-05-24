"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type GanttPayload = {
  planningStartAt: string
  planningEndAt: string
  workCenterCount: number
  operationCount: number
  source: string
  scenarioId?: string
  rows: Array<{
    workCenterCode: string
    department: string | null
    utilizationPct: number
    operations: Array<{
      operationId: string
      orderCode: string
      plannedStartAt: string
      plannedEndAt: string
      isLate: boolean
    }>
  }>
}

export default function ProductionGanttPage() {
  const [payload, setPayload] = React.useState<GanttPayload | null>(null)
  const [scenarioId, setScenarioId] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ horizonHours: '168', maxWorkCenters: '150' })
    if (scenarioId.trim()) qs.set('scenarioId', scenarioId.trim())
    void apiCall<GanttPayload>(`/api/production_planning/gantt?${qs}`)
      .then(({ result }) => setPayload(result ?? null))
      .catch(() => setPayload(null))
      .finally(() => setLoading(false))
  }, [scenarioId])

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromUrl = new URLSearchParams(window.location.search).get('scenarioId')
      if (fromUrl) setScenarioId(fromUrl)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const rangeStart = payload ? Date.parse(payload.planningStartAt) : 0
  const rangeEnd = payload ? Date.parse(payload.planningEndAt) : 1
  const rangeMs = Math.max(1, rangeEnd - rangeStart)

  return (
    <Page>
      <PageHeader
        title="Gantt — gniazda robocze"
        description="Widok skończonej mocy do 150 WC (parity Opcenter / Kinaxis)."
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="border rounded px-2 py-1 text-sm w-64"
              placeholder="ID scenariusza (opcjonalnie)"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            />
            <Button type="button" size="sm" onClick={() => load()}>
              Odśwież
            </Button>
            <Link href={PP_ROUTES.schedule} className="text-sm underline text-muted-foreground">
              Pojemność
            </Link>
          </div>
        }
      />
      <PageBody className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        ) : !payload ? (
          <p className="text-sm text-muted-foreground">Brak danych Gantt.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {payload.workCenterCount} gniazd · {payload.operationCount} operacji · źródło:{' '}
              {payload.source}
              {payload.scenarioId ? ` (${payload.scenarioId})` : ''}
            </p>
            <div className="rounded-lg border overflow-auto max-h-[70vh]">
              <div className="min-w-[900px]">
                {payload.rows.map((row) => (
                  <div
                    key={row.workCenterCode}
                    className="grid grid-cols-[140px_1fr] gap-2 border-b text-xs"
                  >
                    <div className="p-2 sticky left-0 bg-background z-10">
                      <div className="font-medium">{row.workCenterCode}</div>
                      <div className="text-muted-foreground">
                        {row.department ?? '—'} · {row.utilizationPct}%
                      </div>
                    </div>
                    <div className="relative h-10 my-1 mr-2 bg-muted/20 rounded">
                      {row.operations.map((op) => {
                        const left =
                          ((Date.parse(op.plannedStartAt) - rangeStart) / rangeMs) * 100
                        const width = Math.max(
                          0.5,
                          ((Date.parse(op.plannedEndAt) - Date.parse(op.plannedStartAt)) /
                            rangeMs) *
                            100,
                        )
                        return (
                          <div
                            key={op.operationId}
                            title={`${op.orderCode} ${op.plannedStartAt}`}
                            className={`absolute top-1 h-7 rounded px-1 truncate ${
                              op.isLate ? 'bg-destructive/80' : 'bg-primary/70'
                            }`}
                            style={{
                              left: `${Math.min(99, Math.max(0, left))}%`,
                              width: `${Math.min(100 - left, width)}%`,
                            }}
                          >
                            {op.orderCode}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </PageBody>
    </Page>
  )
}
