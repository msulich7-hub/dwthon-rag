"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { HelpdeskShell } from '../../components/HelpdeskShell'
import { WorkspaceStatsBar, type WorkspaceStatsPayload } from '../../components/WorkspaceStatsBar'
import { HELPDESK_ROUTES } from '../../lib/helpdesk-routes'

type DashboardPayload = {
  stats: WorkspaceStatsPayload
  recent: Array<{
    id: string
    ticketKey: string
    subject: string
    status: string
    priority: string
    visibility: string
  }>
}

export default function HelpdeskHubPage() {
  const t = useT()
  const [data, setData] = React.useState<DashboardPayload | null>(null)

  React.useEffect(() => {
    void apiCall<DashboardPayload>('/api/helpdesk/agent/dashboard')
      .then(({ result }) => setData(result ?? null))
      .catch(() => setData(null))
  }, [])

  return (
    <Page>
      <PageHeader
        title={t('helpdesk.hub.title', 'Service desk')}
        description={t(
          'helpdesk.hub.description',
          'Internal support for your team. Drag tickets on the Kanban board, triage by queue, and keep SLAs green.',
        )}
      />
      <PageBody>
        <HelpdeskShell>
          <WorkspaceStatsBar stats={data?.stats ?? null} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={HELPDESK_ROUTES.kanban}
              className="group relative overflow-hidden rounded-xl border p-5 hover:shadow-lg transition-all bg-gradient-to-br from-violet-500/10 via-card to-sky-500/10"
            >
              <div className="text-lg font-semibold">{t('helpdesk.hub.kanban', 'Kanban board')}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('helpdesk.hub.kanbanDesc', 'Drag & drop across Open → In progress → Waiting → Resolved')}
              </p>
            </Link>
            <Link
              href={HELPDESK_ROUTES.workspace}
              className="rounded-xl border p-5 hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium">{t('helpdesk.hub.workspace', 'Agent workspace')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('helpdesk.hub.workspaceDesc', 'Board + list views with queue filters')}
              </p>
            </Link>
            <Link
              href={HELPDESK_ROUTES.report}
              className="rounded-xl border p-5 hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium">{t('helpdesk.hub.report', 'Report an issue')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('helpdesk.hub.reportDesc', 'Internal staff request')}
              </p>
            </Link>
          </div>

          {data?.recent?.length ? (
            <section className="rounded-xl border">
              <div className="px-4 py-3 border-b bg-muted/20">
                <h2 className="text-sm font-medium">{t('helpdesk.hub.recent', 'Recent active tickets')}</h2>
              </div>
              <ul className="divide-y">
                {data.recent.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={HELPDESK_ROUTES.ticket(ticket.id)}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/30 text-sm"
                    >
                      <span>
                        <span className="font-mono text-xs text-muted-foreground mr-2">{ticket.ticketKey}</span>
                        {ticket.subject}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize shrink-0">
                        {ticket.priority} · {ticket.status.replace('_', ' ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </HelpdeskShell>
      </PageBody>
    </Page>
  )
}
