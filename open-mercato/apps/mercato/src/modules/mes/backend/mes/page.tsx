"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type DashboardResponse = {
  dashboard: {
    total: number
    active: number
    completed: number
    byStatus: Record<string, number>
  }
}

export default function MesHubPage() {
  const t = useT()
  const [dashboard, setDashboard] = React.useState<DashboardResponse['dashboard'] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void (async () => {
      try {
        const payload = await readApiResultOrThrow<DashboardResponse>('/api/mes/dashboard')
        setDashboard(payload.dashboard)
      } catch {
        setError(t('mes.hub.loadError', 'Failed to load MES dashboard'))
      }
    })()
  }, [t])

  return (
    <Page>
      <PageHeader
        title={t('mes.hub.title', 'MES')}
        description={t(
          'mes.hub.description',
          'Manufacturing execution on Open Mercato — work orders linked to CRM deals.',
        )}
      />
      <PageBody className="space-y-6">
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {dashboard ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold">{dashboard.total}</div>
              <div className="text-xs text-muted-foreground">{t('mes.hub.kpi.total', 'Total work orders')}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold">{dashboard.active}</div>
              <div className="text-xs text-muted-foreground">{t('mes.hub.kpi.active', 'Active (planned + in progress)')}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-semibold">{dashboard.completed}</div>
              <div className="text-xs text-muted-foreground">{t('mes.hub.kpi.completed', 'Completed')}</div>
            </div>
          </div>
        ) : null}

        <section className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">{t('mes.hub.integrationsTitle', 'Integrations')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <Link href="/backend/customers/deals" className="underline">
                {t('mes.hub.linkDeals', 'CRM deals')}
              </Link>
              {' — '}
              {t('mes.hub.linkDealsHint', 'work orders tab and production chip on deal detail')}
            </li>
          </ul>
        </section>
      </PageBody>
    </Page>
  )
}
