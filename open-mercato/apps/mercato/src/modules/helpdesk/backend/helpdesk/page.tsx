"use client"

import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { HELPDESK_ROUTES } from '../../lib/helpdesk-routes'

export default function HelpdeskHubPage() {
  const t = useT()

  return (
    <Page>
      <PageHeader
        title={t('helpdesk.hub.title', 'Service desk')}
        description={t(
          'helpdesk.hub.description',
          'Internal support for your team. Agents use the workspace; staff report issues; customers submit via email or integrations.',
        )}
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={HELPDESK_ROUTES.workspace}
            className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium">{t('helpdesk.hub.workspace', 'Agent workspace')}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('helpdesk.hub.workspaceDesc', 'Queues, assignment, internal notes')}
            </div>
          </Link>
          <Link
            href={HELPDESK_ROUTES.report}
            className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium">{t('helpdesk.hub.report', 'Report an issue')}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('helpdesk.hub.reportDesc', 'Internal request to IT, ops, or billing')}
            </div>
          </Link>
        </div>
        <section className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">{t('helpdesk.hub.channelsTitle', 'Channels')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>{t('helpdesk.hub.internalChannel', 'Internal')}</strong> —{' '}
              {t('helpdesk.hub.internalChannelDesc', 'staff requests via Report issue')}
            </li>
            <li>
              <strong>{t('helpdesk.hub.customerChannel', 'Customer')}</strong> —{' '}
              <code className="text-xs">POST /api/helpdesk/ingest</code>{' '}
              {t('helpdesk.hub.customerChannelDesc', '(email, portal, chat — no agent UI for requesters)')}
            </li>
          </ul>
        </section>
      </PageBody>
    </Page>
  )
}
