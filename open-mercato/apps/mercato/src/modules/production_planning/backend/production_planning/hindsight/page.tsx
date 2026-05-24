"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type HindsightOverview = {
  baselineScenarioId: string | null
  baselineLabel: string | null
  totalChaosPremiumPln: number
  scenarios: Array<{
    scenarioId: string
    scenarioLabel: string
    templateId: string | null
    kpis: { lateOrderCount: number; maxLatenessMinutes: number }
    chaosPremium: {
      chaosPremiumPln: number
      chaosPremiumPct: number
      extraLateOrders: number
    } | null
  }>
}

export default function ProductionHindsightPage() {
  const [data, setData] = React.useState<HindsightOverview | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(() => {
    setLoading(true)
    void apiCall<HindsightOverview>('/api/production_planning/hindsight/overview?limit=30')
      .then(({ result }) => setData(result ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <Page>
      <PageHeader
        title="Hindsight — chaos premium"
        description="Porównanie ukończonych scenariuszy Mercato (bez actuals IFS). Szacunek kosztu degradacji planu w PLN."
        actions={
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => load()}>
              Odśwież
            </Button>
            <Link href={PP_ROUTES.scenarios} className="text-sm underline text-muted-foreground self-center">
              Scenario Lab
            </Link>
          </div>
        }
      />
      <PageBody className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            Brak danych — uruchom scenariusze what-if w Scenario Lab.
          </p>
        ) : (
          <>
            <div className="rounded-lg border p-4 grid gap-2 sm:grid-cols-3 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Baseline</div>
                <div className="font-medium">{data.baselineLabel ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Scenariusze</div>
                <div className="font-medium">{data.scenarios.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Suma chaos premium</div>
                <div className="font-medium text-lg">
                  {data.totalChaosPremiumPln.toLocaleString('pl-PL')} PLN
                </div>
              </div>
            </div>
            <div className="rounded-lg border overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2">Scenariusz</th>
                    <th className="text-right p-2">Spóźnione</th>
                    <th className="text-right p-2">Max tardiness</th>
                    <th className="text-right p-2">Chaos PLN</th>
                    <th className="text-right p-2">% przych.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.scenarios.map((row) => (
                    <tr key={row.scenarioId} className="border-t">
                      <td className="p-2">
                        <div className="font-medium">{row.scenarioLabel}</div>
                        <div className="text-muted-foreground font-mono">{row.templateId ?? '—'}</div>
                      </td>
                      <td className="p-2 text-right">{row.kpis.lateOrderCount}</td>
                      <td className="p-2 text-right">{row.kpis.maxLatenessMinutes} min</td>
                      <td className="p-2 text-right font-medium">
                        {row.chaosPremium?.chaosPremiumPln.toLocaleString('pl-PL') ?? '—'}
                      </td>
                      <td className="p-2 text-right">{row.chaosPremium?.chaosPremiumPct ?? '—'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PageBody>
    </Page>
  )
}
