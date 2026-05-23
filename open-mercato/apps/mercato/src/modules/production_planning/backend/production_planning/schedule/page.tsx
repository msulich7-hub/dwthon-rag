"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { PP_ROUTES } from '../../../lib/routes'

type WorkCenterLoad = {
  workCenterCode: string
  scheduledMinutes: number
  operationCount: number
  utilizationPct: number
}

type Snapshot = {
  horizonHours: number
  openOrders: number
  lateOrders: number
  workCenters: WorkCenterLoad[]
}

export default function ProductionSchedulePage() {
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    void apiCall<Snapshot>('/api/production_planning/capacity')
      .then(({ result }) => setSnapshot(result ?? null))
      .catch(() => setSnapshot(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Page>
      <PageHeader
        title="Harmonogram — pojemność"
        description="Wykorzystanie gniazd roboczych w horyzoncie planowania."
        actions={
          <Link href={PP_ROUTES.hub} className="text-sm underline text-muted-foreground">
            Powrót
          </Link>
        }
      />
      <PageBody className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        ) : !snapshot ? (
          <p className="text-sm text-muted-foreground">Nie udało się wczytać danych pojemności.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Otwarte zlecenia</div>
                <div className="text-2xl font-semibold">{snapshot.openOrders}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Opóźnione</div>
                <div className="text-2xl font-semibold text-destructive">{snapshot.lateOrders}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground">Horyzont (h)</div>
                <div className="text-2xl font-semibold">{snapshot.horizonHours}</div>
              </div>
            </div>
            {snapshot.workCenters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak zaplanowanych operacji.</p>
            ) : (
              <ul className="space-y-2">
                {snapshot.workCenters.map((wc) => (
                  <li key={wc.workCenterCode} className="rounded-lg border p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{wc.workCenterCode}</span>
                      <span>{wc.utilizationPct}% obciążenia</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {wc.operationCount} operacji · {wc.scheduledMinutes} min zaplanowanych
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </PageBody>
    </Page>
  )
}
