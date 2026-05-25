"use client"

import * as React from 'react'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MES_ROUTES } from '../../lib/mes-routes'
import type { KioskNest } from '../../lib/kiosk-planning-mock'

type MesKioskTerminalHeaderProps = {
  nestName: string
  nestCode: string
  line: string
  planBatchId: string
  planPublishedAt: string
  nests: KioskNest[]
  currentNestCode: string
  onSelectNest: (code: string) => void
  showServiceLinks: boolean
}

export function MesKioskTerminalHeader({
  nestName,
  nestCode,
  line,
  planBatchId,
  planPublishedAt,
  nests,
  currentNestCode,
  onSelectNest,
  showServiceLinks,
}: MesKioskTerminalHeaderProps) {
  const t = useT()
  const [changeOpen, setChangeOpen] = React.useState(false)
  const published = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(planPublishedAt))

  return (
    <header className="border-b bg-card px-4 py-4 md:px-8">
      <div className="max-w-4xl mx-auto flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{line}</p>
          <h1 className="text-3xl font-bold tracking-tight">{nestName}</h1>
          <p className="text-base text-muted-foreground mt-1 font-mono">{nestCode}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {t('mes.kiosk.planMeta', 'Plan {id} · published {at}', { id: planBatchId, at: published })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="mes-kiosk-change-nest"
            onClick={() => setChangeOpen((v) => !v)}
          >
            <Settings2 className="h-4 w-4 mr-1" aria-hidden />
            {t('mes.kiosk.changeNest', 'Change nest')}
          </Button>
          {showServiceLinks ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${MES_ROUTES.operator}?kiosk=1&live=1`}>{t('mes.kiosk.liveQueue', 'Live API queue')}</Link>
            </Button>
          ) : null}
        </div>
      </div>
      {changeOpen ? (
        <div className="max-w-4xl mx-auto mt-4 p-3 rounded-lg border bg-muted/30 space-y-2">
          <p className="text-xs text-muted-foreground">{t('mes.kiosk.changeNestHint', 'Service action — not for daily operator use.')}</p>
          <div className="flex flex-wrap gap-2">
            {nests.map((n) => (
              <Button
                key={n.code}
                type="button"
                variant={n.code === currentNestCode ? 'default' : 'outline'}
                data-testid={`mes-kiosk-nest-${n.code}`}
                onClick={() => {
                  onSelectNest(n.code)
                  setChangeOpen(false)
                }}
              >
                {n.name} ({n.code})
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  )
}
