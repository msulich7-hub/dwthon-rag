"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesShell } from '../../components/MesShell'
import { MesKpiSkeleton } from '../../components/MesKpiSkeleton'
import { MesHubAndonStrip } from '../../components/MesHubAndonStrip'
import { MES_ROUTES } from '../../lib/mes-routes'

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
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const payload = await readApiResultOrThrow<DashboardResponse>('/api/mes/dashboard')
        setDashboard(payload.dashboard)
        setError(null)
      } catch {
        setError(t('mes.hub.loadError', 'Failed to load MES dashboard'))
      } finally {
        setLoading(false)
      }
    })()
  }, [t])

  return (
    <Page>
      <MesShell>
        <PageHeader
          title={t('mes.hub.title', 'MES')}
          description={t(
            'mes.hub.description',
            'Manufacturing execution on Open Mercato — work orders linked to CRM deals and sales orders.',
          )}
        />
        <PageBody className="space-y-6">
          <MesHubAndonStrip />
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          {loading ? (
            <MesKpiSkeleton />
          ) : dashboard ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href={MES_ROUTES.workOrders} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <div className="text-2xl font-semibold">{dashboard.total}</div>
                <div className="text-xs text-muted-foreground">{t('mes.hub.kpi.total', 'Total work orders')}</div>
              </Link>
              <div className="rounded-lg border p-4 border-sky-500/30 bg-sky-500/5">
                <div className="text-2xl font-semibold">{dashboard.active}</div>
                <div className="text-xs text-muted-foreground">
                  {t('mes.hub.kpi.active', 'Active (planned + in progress)')}
                </div>
              </div>
              <div className="rounded-lg border p-4 border-emerald-500/30 bg-emerald-500/5">
                <div className="text-2xl font-semibold">{dashboard.completed}</div>
                <div className="text-xs text-muted-foreground">{t('mes.hub.kpi.completed', 'Completed')}</div>
              </div>
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href={MES_ROUTES.workOrders} className="rounded-lg border p-4 hover:bg-muted/50">
              <div className="font-medium">{t('mes.hub.workOrdersLink', 'Work orders')}</div>
              <div className="text-xs text-muted-foreground">{t('mes.hub.workOrdersHint', 'List, filter, and track')}</div>
            </Link>
            <Link href={MES_ROUTES.operator} className="rounded-lg border p-4 hover:bg-muted/50">
              <div className="font-medium">{t('mes.hub.operatorLink', 'Operator queue')}</div>
              <div className="text-xs text-muted-foreground">
                {t('mes.hub.operatorHint', 'Start and complete shop-floor operations')}
              </div>
            </Link>
            <Link href={MES_ROUTES.pulse} className="rounded-lg border p-4 hover:bg-muted/50">
              <div className="font-medium">{t('mes.hub.pulseLink', 'Pulse board')}</div>
              <div className="text-xs text-muted-foreground">{t('mes.hub.pulseHint', 'Andon and live KPIs')}</div>
            </Link>
            <Link href={MES_ROUTES.routing} className="rounded-lg border p-4 hover:bg-muted/50">
              <div className="font-medium">{t('mes.hub.routingLink', 'Routing')}</div>
              <div className="text-xs text-muted-foreground">{t('mes.hub.routingHint', 'Templates and steps')}</div>
            </Link>
          </section>

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
              <li>
                <Link href={MES_ROUTES.salesOrders} className="underline">
                  {t('mes.hub.linkSalesOrders', 'Sales orders')}
                </Link>
                {' — '}
                {t('mes.hub.linkSalesOrdersHint', 'Production tab and summary on order detail')}
              </li>
            </ul>
          </section>
        </PageBody>
      </MesShell>
    </Page>
  )
}
