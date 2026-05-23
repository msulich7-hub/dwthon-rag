"use client"

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { ViewSwitcher } from '../../../components/ViewSwitcher'
import { CRM_ROUTES } from '../../../lib/crm-routes'

export default function Crm2027DealsShellPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = searchParams.get('view')

  React.useEffect(() => {
    if (view === 'kanban') {
      router.replace(CRM_ROUTES.dealsKanban)
      return
    }
    if (view !== 'table') {
      router.replace(`${CRM_ROUTES.dealsList}?from=crm_2027`)
    }
  }, [view, router])

  return (
    <Page>
      <PageHeader
        title="Deals"
        description="Switch between table and kanban — powered by Open Mercato customers module."
        actions={
          <ViewSwitcher
            basePath={CRM_ROUTES.dealsShell}
            tableHref={CRM_ROUTES.dealsList}
            kanbanHref={CRM_ROUTES.dealsKanban}
          />
        }
      />
      <PageBody>
        <p className="text-sm text-muted-foreground">Redirecting to deals view…</p>
      </PageBody>
    </Page>
  )
}
