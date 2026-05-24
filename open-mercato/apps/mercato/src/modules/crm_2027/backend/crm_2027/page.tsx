"use client"

import * as React from 'react'
import Link from 'next/link'
import { CrmShell } from '../../components/CrmShell'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { CRM_OBJECTS, CRM_ROUTES } from '../../lib/crm-routes'

export default function Crm2027HubPage() {
  return (
    <Page>
      <CrmShell>
        <PageHeader
          title="CRM 2027"
          description="CRM workspace on Open Mercato (app module — composes customers, no core patches)."
        />
        <PageBody className="space-y-8">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Objects</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CRM_OBJECTS.map((obj) => (
                <Link
                  key={obj.id}
                  href={obj.href}
                  className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="font-medium">{obj.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">Open list</div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Tools</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={CRM_ROUTES.search} className="rounded-lg border p-4 hover:bg-muted/50">
                <div className="font-medium">Search</div>
                <div className="text-xs text-muted-foreground">People, companies, deals</div>
              </Link>
              <Link href={CRM_ROUTES.atRisk} className="rounded-lg border p-4 hover:bg-muted/50">
                <div className="font-medium">At-risk deals</div>
                <div className="text-xs text-muted-foreground">Sentiment + stalled pipeline</div>
              </Link>
              <Link href={CRM_ROUTES.dashboard} className="rounded-lg border p-4 hover:bg-muted/50">
                <div className="font-medium">Dashboard</div>
                <div className="text-xs text-muted-foreground">KPI overview</div>
              </Link>
            </div>
          </section>

          <section className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Shortcuts (module-local)</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <kbd className="rounded border px-1">⌘K</kbd> / <kbd className="rounded border px-1">Ctrl+K</kbd> — CRM command palette on these pages
              </li>
              <li>
                <kbd className="rounded border px-1">⌘J</kbd> — platform AI assistant (unchanged)
              </li>
            </ul>
          </section>
        </PageBody>
      </CrmShell>
    </Page>
  )
}
