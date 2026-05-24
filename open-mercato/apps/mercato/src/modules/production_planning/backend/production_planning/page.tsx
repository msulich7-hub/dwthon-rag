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
          <Link href={PP_ROUTES.scenarios} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Scenario Lab (what-if)</div>
            <div className="text-xs text-muted-foreground mt-1">
              36 szablonów · bundle’e · compare KPI · turnieje
            </div>
          </Link>
          <Link href={PP_ROUTES.gantt} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Gantt (150 WC)</div>
            <div className="text-xs text-muted-foreground mt-1">Harmonogram skończonej mocy</div>
          </Link>
          <Link href={PP_ROUTES.controlTower} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Control tower</div>
            <div className="text-xs text-muted-foreground mt-1">
              Wyjątki · KPI · status CP-SAT
            </div>
          </Link>
          <Link href={PP_ROUTES.genesis} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Genesis & MRP</div>
            <div className="text-xs text-muted-foreground mt-1">
              Korzenie popytu · netting · IFS silver pilot
            </div>
          </Link>
          <Link href={PP_ROUTES.poolWorkbench} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Pool MO workbench</div>
            <div className="text-xs text-muted-foreground mt-1">Pegi · skonsolidowane zlecenia</div>
          </Link>
          <Link href={PP_ROUTES.hindsight} className="rounded-lg border p-4 hover:bg-muted/50">
            <div className="font-medium">Hindsight (chaos premium)</div>
            <div className="text-xs text-muted-foreground mt-1">
              Porównanie scenariuszy · PLN bez actuals IFS
            </div>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Integracja ze sprzedażą: zakładka „Produkcja” na szczegółach zamówienia oraz chipy statusu na pasku etapów.
        </p>
      </PageBody>
    </Page>
  )
}
