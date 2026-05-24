"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type WhatIfTemplate = {
  id: string
  namePl: string
  nameEn: string
  tier: string
  dimensions: string[]
  audience: string
}

type WhatIfBundle = {
  id: string
  namePl: string
  mode: string
  steps: string[]
}

type PlanScenario = {
  id: string
  scenarioLabel: string
  templateId: string | null
  status: string
  objectiveValue: number | null
  wallMs: number | null
  rankInTournament: number | null
  kpiSnapshot: {
    lateOrderCount: number
    maxLatenessMinutes: number
    operationCount: number
  } | null
}

type CompareResult = {
  baseline: PlanScenario
  scenarios: Array<{
    scenarioId: string
    label: string
    deltaVsBaseline: { lateOrderCount: number; maxLatenessMinutes: number }
  }>
  rankedByLateOrders: string[]
}

export default function ProductionScenariosPage() {
  const [templates, setTemplates] = React.useState<WhatIfTemplate[]>([])
  const [bundles, setBundles] = React.useState<WhatIfBundle[]>([])
  const [recent, setRecent] = React.useState<PlanScenario[]>([])
  const [selectedTemplate, setSelectedTemplate] = React.useState('WIF-01')
  const [selectedBundle, setSelectedBundle] = React.useState('BND-TOURNAMENT-RUSH')
  const [baselineId, setBaselineId] = React.useState('')
  const [compareA, setCompareA] = React.useState('')
  const [compareB, setCompareB] = React.useState('')
  const [compareResult, setCompareResult] = React.useState<CompareResult | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const loadCatalog = React.useCallback(() => {
    void apiCall<{ templates: WhatIfTemplate[] }>('/api/production_planning/scenarios/templates')
      .then(({ result }) => setTemplates(result?.templates ?? []))
      .catch(() => setTemplates([]))
    void apiCall<{ bundles: WhatIfBundle[] }>('/api/production_planning/scenarios/bundles')
      .then(({ result }) => setBundles(result?.bundles ?? []))
      .catch(() => setBundles([]))
  }, [])

  const loadRecent = React.useCallback(() => {
    void apiCall<{ scenarios: PlanScenario[] }>('/api/production_planning/scenarios?limit=20')
      .then(({ result }) => setRecent(result?.scenarios ?? []))
      .catch(() => setRecent([]))
  }, [])

  React.useEffect(() => {
    loadCatalog()
    loadRecent()
  }, [loadCatalog, loadRecent])

  const runTemplate = React.useCallback(async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { result } = await apiCall<{ scenario: PlanScenario; wallMs: number }>(
        '/api/production_planning/scenarios/runs',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: selectedTemplate, dryRun: true, proposeOnly: true }),
        },
      )
      setMessage(
        `Scenariusz ${result?.scenario.scenarioLabel ?? selectedTemplate}: ${result?.scenario.status} · ${result?.scenario.kpiSnapshot?.lateOrderCount ?? '?'} spóźnionych · ${result?.wallMs ?? '?'} ms`,
      )
      if (result?.scenario.id && !baselineId) setBaselineId(result.scenario.id)
      loadRecent()
    } catch {
      setMessage('Uruchomienie scenariusza nie powiodło się.')
    } finally {
      setBusy(false)
    }
  }, [selectedTemplate, baselineId, loadRecent])

  const runBundle = React.useCallback(async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { result } = await apiCall<{
        bundleId: string
        scenarios: PlanScenario[]
        tournamentRanking?: string[]
      }>(`/api/production_planning/scenarios/bundles/${selectedBundle}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baselineScenarioId: baselineId || null,
        }),
      })
      const count = result?.scenarios.length ?? 0
      const winner = result?.tournamentRanking?.[0]
      setMessage(
        `Bundle ${result?.bundleId}: ${count} scenariuszy${winner ? ` · lider: ${winner.slice(0, 8)}…` : ''}`,
      )
      if (result?.scenarios[0]?.id && !baselineId) setBaselineId(result.scenarios[0].id)
      loadRecent()
    } catch {
      setMessage('Uruchomienie bundle nie powiodło się.')
    } finally {
      setBusy(false)
    }
  }, [selectedBundle, baselineId, loadRecent])

  const runCompare = React.useCallback(async () => {
    if (!baselineId || !compareA) return
    setBusy(true)
    setMessage(null)
    try {
      const params = new URLSearchParams({ baseline: baselineId, a: compareA })
      if (compareB) params.set('b', compareB)
      const { result } = await apiCall<CompareResult>(
        `/api/production_planning/scenarios/compare?${params.toString()}`,
      )
      setCompareResult(result ?? null)
      setMessage('Porównanie KPI zaktualizowane.')
    } catch {
      setMessage('Compare wymaga ukończonych scenariuszy z KPI.')
      setCompareResult(null)
    } finally {
      setBusy(false)
    }
  }, [baselineId, compareA, compareB])

  return (
    <Page>
      <PageHeader
        title="Scenario Lab — what-if"
        description="Katalog 36 scenariuszy i 10 bundle’ów · porównanie z baseline · propose-only (bez zapisu na live plan)."
        actions={
          <Link href={PP_ROUTES.hub} className="text-sm underline text-muted-foreground">
            Powrót
          </Link>
        }
      />
      <PageBody className="space-y-6">
        {message ? (
          <p className="text-sm rounded-lg border bg-muted/30 p-3 text-muted-foreground">{message}</p>
        ) : null}

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium text-sm">Pojedynczy scenariusz</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs flex flex-col gap-1">
              Szablon
              <select
                className="border rounded px-2 py-1 text-sm min-w-[220px]"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} — {t.namePl}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" size="sm" disabled={busy} onClick={() => void runTemplate()}>
              Uruchom
            </Button>
          </div>
        </section>

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium text-sm">Bundle (cascade / turniej)</h2>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs flex flex-col gap-1">
              Bundle
              <select
                className="border rounded px-2 py-1 text-sm min-w-[220px]"
                value={selectedBundle}
                onChange={(e) => setSelectedBundle(e.target.value)}
              >
                {bundles.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} — {b.namePl} ({b.mode})
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" size="sm" disabled={busy} onClick={() => void runBundle()}>
              Uruchom bundle
            </Button>
          </div>
        </section>

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-medium text-sm">Compare KPI (baseline vs A / B)</h2>
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <label className="flex flex-col gap-1">
              Baseline ID
              <input
                className="border rounded px-2 py-1 font-mono"
                value={baselineId}
                onChange={(e) => setBaselineId(e.target.value)}
                placeholder="uuid scenariusza WIF-01"
              />
            </label>
            <label className="flex flex-col gap-1">
              Scenariusz A
              <input
                className="border rounded px-2 py-1 font-mono"
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Scenariusz B (opc.)
              <input
                className="border rounded px-2 py-1 font-mono"
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
              />
            </label>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void runCompare()}>
            Porównaj
          </Button>
          {compareResult ? (
            <ul className="text-xs space-y-1 mt-2">
              {compareResult.scenarios.map((row) => (
                <li key={row.scenarioId} className="font-mono">
                  {row.label}: Δ late {row.deltaVsBaseline.lateOrderCount}, Δ max tardiness{' '}
                  {row.deltaVsBaseline.maxLatenessMinutes} min
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium text-sm">Ostatnie scenariusze</h2>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">Brak uruchomień — zacznij od WIF-01 baseline.</p>
          ) : (
            <ul className="text-xs space-y-2 max-h-64 overflow-y-auto">
              {recent.map((s) => (
                <li key={s.id} className="border rounded p-2 flex justify-between gap-2">
                  <span>
                    <span className="font-medium">{s.scenarioLabel}</span>
                    <span className="text-muted-foreground"> · {s.status}</span>
                    {s.rankInTournament != null ? (
                      <span className="text-muted-foreground"> · #{s.rankInTournament} turniej</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="underline text-muted-foreground shrink-0"
                    onClick={() => {
                      setCompareA(s.id)
                      if (!baselineId) setBaselineId(s.id)
                    }}
                  >
                    użyj w compare
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </Page>
  )
}
