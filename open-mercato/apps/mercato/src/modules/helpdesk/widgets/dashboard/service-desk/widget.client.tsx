"use client"

import * as React from 'react'
import Link from 'next/link'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import type { DashboardWidgetComponentProps } from '@open-mercato/shared/modules/dashboard/widgets'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'
import type { ServiceDeskWidgetSettings } from './config'
import type { WorkspaceStatsPayload } from '../../../components/WorkspaceStatsBar'

export default function ServiceDeskDashboardWidget(_props: DashboardWidgetComponentProps<ServiceDeskWidgetSettings>) {
  const t = useT()
  const [stats, setStats] = React.useState<WorkspaceStatsPayload | null>(null)

  React.useEffect(() => {
    void apiCall<{ stats: WorkspaceStatsPayload }>('/api/helpdesk/agent/dashboard')
      .then(({ result }) => setStats(result?.stats ?? null))
      .catch(() => setStats(null))
  }, [])

  return (
    <div className="space-y-4 p-1" data-helpdesk-dashboard-widget="">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 bg-gradient-to-br from-sky-500/10 to-card">
          <div className="text-2xl font-semibold tabular-nums">{stats?.open ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{t('helpdesk.stats.open', 'Open')}</div>
        </div>
        <div className="rounded-lg border p-3 bg-gradient-to-br from-destructive/10 to-card">
          <div className="text-2xl font-semibold tabular-nums text-destructive">{stats?.slaBreached ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{t('helpdesk.stats.slaBreached', 'SLA breached')}</div>
        </div>
      </div>
      <Link
        href={HELPDESK_ROUTES.kanban}
        className="block text-center text-sm font-medium rounded-lg border py-2 hover:bg-muted/50 transition-colors"
      >
        {t('helpdesk.widget.openBoard', 'Open Kanban board →')}
      </Link>
    </div>
  )
}
