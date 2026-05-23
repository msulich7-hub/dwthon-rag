"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { PP_ROUTES } from '../../lib/routes'

export default function ProductionPlanningHubPage() {
  return (
    <Page>
      <PageHeader
        title="Planowanie produkcji"
        description="Moduł rozszerzeń Open Mercato — zlecenia, operacje i obciążenie gniazd produkcyjnych."
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={PP_ROUTES.orders} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Zlecenia produkcyjne</div>
            <div className="text-xs text-muted-foreground mt-1">Lista i tworzenie zleceń</div>
          </Link>
          <Link href={PP_ROUTES.schedule} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Harmonogram i pojemność</div>
            <div className="text-xs text-muted-foreground mt-1">Obciążenie gniazd roboczych</div>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Integracja ze sprzedażą: zakładka „Produkcja” na szczegółach zamówienia oraz chipy statusu na pasku etapów.
        </p>
      </PageBody>
    </Page>
  )
}
