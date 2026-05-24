"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrmShell } from './CrmShell'

type CrmRedirectPageProps = {
  target: string
  label: string
}

export function CrmRedirectPage({ target, label }: CrmRedirectPageProps) {
  const router = useRouter()

  React.useEffect(() => {
    router.replace(target)
  }, [router, target])

  return (
    <Page>
      <CrmShell>
        <PageBody>
          <p className="text-sm text-muted-foreground">Opening {label}…</p>
        </PageBody>
      </CrmShell>
    </Page>
  )
}
