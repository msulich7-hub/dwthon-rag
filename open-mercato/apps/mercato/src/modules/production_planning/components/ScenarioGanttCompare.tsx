"use client"

import * as React from 'react'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'

type GanttCompareBar = {
  operationId: string
  orderCode: string
  plannedStartAt: string
  plannedEndAt: string
  isLate: boolean
  diffKind: 'unchanged' | 'moved' | 'new' | 'removed'
}

type GanttCompareRow = {
  workCenterCode: string
  department: string | null
  baselineOperations: GanttCompareBar[]
  scenarioOperations: GanttCompareBar[]
}

type GanttDualComparePayload = {
  planningStartAt: string
  planningEndAt: string
  workCenterCount: number
  rows: GanttCompareRow[]
}

const DIFF_CLASS: Record<GanttCompareBar['diffKind'], string> = {
  unchanged: 'bg-primary/70',
  moved: 'bg-amber-500/80',
  new: 'bg-emerald-600/80',
  removed: 'bg-muted-foreground/50 line-through',
}

type ScenarioGanttCompareProps = {
  baselineScenarioId: string
  scenarioId: string
  horizonHours?: number
  maxWorkCenters?: number
}

function GanttTrack({
  operations,
  rangeStart,
  rangeMs,
}: {
  operations: GanttCompareBar[]
  rangeStart: number
  rangeMs: number
}) {
  return (
    <div className="relative h-9 my-0.5 bg-muted/20 rounded min-w-[240px]">
      {operations.map((op) => {
        const left = ((Date.parse(op.plannedStartAt) - rangeStart) / rangeMs) * 100
        const width = Math.max(
          0.5,
          ((Date.parse(op.plannedEndAt) - Date.parse(op.plannedStartAt)) / rangeMs) * 100,
        )
        return (
          <div
            key={op.operationId}
            title={`${op.orderCode} · ${op.diffKind}${op.isLate ? ' · late' : ''}`}
            className={`absolute top-0.5 h-7 rounded px-0.5 truncate text-[10px] text-primary-foreground ${DIFF_CLASS[op.diffKind]} ${op.isLate ? 'ring-1 ring-destructive' : ''}`}
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
  )
}

export function ScenarioGanttCompare({
  baselineScenarioId,
  scenarioId,
  horizonHours = 72,
  maxWorkCenters = 50,
}: ScenarioGanttCompareProps) {
  const [payload, setPayload] = React.useState<GanttDualComparePayload | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const wcScrollRef = React.useRef<HTMLDivElement>(null)
  const bodyScrollRef = React.useRef<HTMLDivElement>(null)
  const syncingScroll = React.useRef(false)

  const syncScrollTop = React.useCallback((source: HTMLDivElement, target: HTMLDivElement | null) => {
    if (!target || syncingScroll.current) return
    syncingScroll.current = true
    target.scrollTop = source.scrollTop
    requestAnimationFrame(() => {
      syncingScroll.current = false
    })
  }, [])

  React.useEffect(() => {
    if (!baselineScenarioId || !scenarioId) return
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({
      baselineScenarioId,
      scenarioId,
      horizonHours: String(horizonHours),
      maxWorkCenters: String(maxWorkCenters),
    })
    void apiCall<GanttDualComparePayload>(`/api/production_planning/gantt/compare?${qs}`)
      .then(({ result }) => setPayload(result ?? null))
      .catch(() => {
        setPayload(null)
        setError('Nie udało się załadować porównania Gantt.')
      })
      .finally(() => setLoading(false))
  }, [baselineScenarioId, scenarioId, horizonHours, maxWorkCenters])

  const rangeStart = payload ? Date.parse(payload.planningStartAt) : 0
  const rangeEnd = payload ? Date.parse(payload.planningEndAt) : 1
  const rangeMs = Math.max(1, rangeEnd - rangeStart)

  if (!baselineScenarioId || !scenarioId) return null

  return (
    <div className="rounded-lg border p-3 space-y-2 mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-sm">Dual Gantt — baseline vs scenariusz A</h3>
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-primary/70" /> bez zmian
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-amber-500/80" /> przesunięte
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-emerald-600/80" /> nowe
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-muted-foreground/50" /> usunięte w A
          </span>
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Ładowanie dual Gantt…</p>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : !payload ? (
        <p className="text-xs text-muted-foreground">Brak danych porównania.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {payload.workCenterCount} gniazd · horyzont {horizonHours}h · wspólna oś od{' '}
            {new Date(payload.planningStartAt).toLocaleString()}
          </p>
          <div className="flex rounded border max-h-[50vh] overflow-hidden">
            <div
              ref={wcScrollRef}
              className="w-[120px] shrink-0 overflow-y-auto overflow-x-hidden border-r bg-background"
              onScroll={(e) => syncScrollTop(e.currentTarget, bodyScrollRef.current)}
            >
              <div className="h-7 border-b bg-muted/30 text-[10px] font-medium flex items-center px-1 sticky top-0 z-10">
                Gniazdo
              </div>
              {payload.rows.map((row) => (
                <div key={row.workCenterCode} className="h-10 px-1 py-1 border-b text-xs">
                  <div className="font-medium truncate">{row.workCenterCode}</div>
                  <div className="text-muted-foreground truncate">{row.department ?? '—'}</div>
                </div>
              ))}
            </div>
            <div
              ref={bodyScrollRef}
              className="flex-1 overflow-auto"
              onScroll={(e) => syncScrollTop(e.currentTarget, wcScrollRef.current)}
            >
              <div className="min-w-[560px]">
                <div className="grid grid-cols-2 gap-1 h-7 border-b bg-muted/30 text-[10px] font-medium sticky top-0 z-10 px-1 items-center">
                  <span>Baseline</span>
                  <span>Scenariusz A</span>
                </div>
                {payload.rows.map((row) => (
                  <div
                    key={row.workCenterCode}
                    className="grid grid-cols-2 gap-1 border-b items-center h-10 px-1"
                  >
                    <GanttTrack
                      operations={row.baselineOperations}
                      rangeStart={rangeStart}
                      rangeMs={rangeMs}
                    />
                    <GanttTrack
                      operations={row.scenarioOperations}
                      rangeStart={rangeStart}
                      rangeMs={rangeMs}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
