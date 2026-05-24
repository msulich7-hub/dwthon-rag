"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { CrmShell } from '../../../components/CrmShell'
import { CRM_ROUTES } from '../../../lib/crm-routes'

type DashboardData = {
  atRiskTotal: number
  atRiskHigh: number
  atRiskMedium: number
  topAtRisk: Array<{ dealId: string; title: string; riskLevel: string }>
}

type ForecastData = {
  openDeals: number
  weightedForecast: number
  atRiskWeighted: number
  currency: string | null
}

export default function Crm2027DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [forecast, setForecast] = React.useState<ForecastData | null>(null)

  React.useEffect(() => {
    void apiCall<DashboardData>('/api/crm_2027/dashboard').then(setData).catch(() => setData(null))
    void apiCall<ForecastData>('/api/crm_2027/forecast')
      .then(setForecast)
      .catch(() => setForecast(null))
  }, [])

  return (
    <Page>
      <CrmShell>
        <PageHeader title="CRM 2027 Dashboard" description="Pipeline health at a glance." />
        <PageBody className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold">{data?.atRiskTotal ?? '—'}</div>
              <div className="text-sm text-muted-foreground">At-risk deals</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold text-destructive">{data?.atRiskHigh ?? '—'}</div>
              <div className="text-sm text-muted-foreground">High risk</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold">{data?.atRiskMedium ?? '—'}</div>
              <div className="text-sm text-muted-foreground">Medium risk</div>
            </div>
          </div>
          {forecast ? (
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-semibold">{forecast.openDeals}</div>
                <div className="text-sm text-muted-foreground">Open deals in forecast</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-semibold">
                  {forecast.weightedForecast.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  {forecast.currency ? ` ${forecast.currency}` : ''}
                </div>
                <div className="text-sm text-muted-foreground">Weighted forecast</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-2xl font-semibold text-amber-700">
                  {forecast.atRiskWeighted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-muted-foreground">At-risk weighted value</div>
              </div>
            </section>
          ) : null}
          {data?.topAtRisk?.length ? (
            <section>
              <h2 className="text-sm font-medium mb-2">Top at-risk</h2>
              <ul className="rounded-lg border divide-y">
                {data.topAtRisk.map((d) => (
                  <li key={d.dealId} className="px-4 py-2 flex justify-between">
                    <Link className="underline" href={CRM_ROUTES.dealDetail(d.dealId)}>
                      {d.title}
                    </Link>
                    <span className="text-xs text-muted-foreground">{d.riskLevel}</span>
                  </li>
                ))}
              </ul>
              <Link className="text-sm underline mt-2 inline-block" href={CRM_ROUTES.atRisk}>
                View all
              </Link>
            </section>
          ) : null}
        </PageBody>
      </CrmShell>
    </Page>
  )
}
