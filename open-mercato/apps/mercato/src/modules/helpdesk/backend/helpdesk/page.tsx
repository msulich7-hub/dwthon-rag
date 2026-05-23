"use client"

import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { HELPDESK_ROUTES } from '../../lib/helpdesk-routes'

export default function HelpdeskHubPage() {
  return (
    <Page>
      <PageHeader
        title="Helpdesk"
        description="Jira-style support tickets on Open Mercato (app module — composes customers, no core patches)."
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={HELPDESK_ROUTES.tickets} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <div className="font-medium">Ticket queue</div>
            <div className="text-xs text-muted-foreground mt-1">Open, in progress, waiting, resolved</div>
          </Link>
        </div>
        <section className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">Integrations</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code className="text-xs">POST /api/helpdesk/ingest</code> — email or webhook ticket creation
            </li>
            <li>Customer detail → <strong>Support</strong> tab on companies and people</li>
          </ul>
        </section>
      </PageBody>
    </Page>
  )
}
