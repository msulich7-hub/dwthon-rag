"use client"

import Link from 'next/link'
import { CalendarClock, ArrowRight, Package, ClipboardCheck, PackagePlus } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesStatusBadge } from '../MesStatusBadge'
import {
  formatMaterialQty,
  getRoutingHintAfter,
  type KioskOperationView,
} from '../../lib/kiosk-planning-view-model'

type MesKioskNowCardProps = {
  op: KioskOperationView
  locale: string
  busyId: string | null
  rawMaterialsHref: string
  onStart: () => void
  onRequestComplete: () => void
  onReportOperation: () => void
  onAcceptProduct: () => void
  onAndon: () => void
}

function formatTimeRange(startIso: string, endIso: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`
}

export function MesKioskNowCard({
  op,
  locale,
  busyId,
  rawMaterialsHref,
  onStart,
  onRequestComplete,
  onReportOperation,
  onAcceptProduct,
  onAndon,
}: MesKioskNowCardProps) {
  const t = useT()
  const routingHint = getRoutingHintAfter(op.id)

  return (
    <section
      data-testid="mes-kiosk-now-card"
      className="rounded-2xl border-4 border-foreground bg-white dark:bg-zinc-950 p-4 md:p-5 shadow-xl space-y-3"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-widest">{t('mes.kiosk.doNow', 'Do this now')}</p>
        <p className="text-2xl md:text-3xl font-bold mt-2 leading-tight">{op.operationName}</p>
        <p className="text-base text-muted-foreground mt-1">
          {op.orderNumber} · {op.productCode} · #{op.sequence}
        </p>
        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
          {formatTimeRange(op.scheduledStart, op.scheduledEnd, locale)}
        </p>
        <div className="mt-2">
          <MesStatusBadge status={op.displayStatus} kind="operation" />
        </div>
      </div>

      <ul className="rounded-lg border divide-y text-sm max-h-[7.5rem] overflow-y-auto">
        {op.materials.map((m) => (
          <li key={m.code} className="px-3 py-2 flex justify-between gap-2">
            <span className="truncate">
              <span className="font-semibold">{m.code}</span>
              <span className="text-muted-foreground"> {m.name}</span>
            </span>
            <span className="tabular-nums shrink-0 font-medium">{formatMaterialQty(m)}</span>
          </li>
        ))}
      </ul>

      {routingHint ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          {t('mes.kiosk.nextRouting', 'After this: {op} @ {nest}', {
            op: routingHint.operationName,
            nest: routingHint.nestName,
          })}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {op.canStart ? (
          <Button
            size="lg"
            className="min-h-[4.25rem] w-full text-xl font-bold"
            disabled={busyId === op.id}
            onClick={onStart}
            data-testid="mes-kiosk-start-demo"
          >
            {t('mes.kiosk.startDemo', 'Start (demo)')}
          </Button>
        ) : null}
        {op.canComplete ? (
          <Button
            size="lg"
            className="min-h-[4.25rem] w-full text-xl font-bold"
            disabled={busyId === op.id}
            onClick={onRequestComplete}
            data-testid="mes-kiosk-complete-demo"
          >
            {t('mes.kiosk.completeDemo', 'Complete (demo)')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full text-base font-semibold"
          disabled={busyId === op.id}
          onClick={onAcceptProduct}
          data-testid="mes-kiosk-accept-product"
        >
          <PackagePlus className="h-5 w-5 mr-2 inline shrink-0" aria-hidden />
          {t('mes.kiosk.acceptProduct', 'Accept product')}
        </Button>
        {(op.status === 'in_progress' || op.canComplete) ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full text-base font-semibold"
            disabled={busyId === op.id}
            onClick={onReportOperation}
            data-testid="mes-kiosk-report-operation"
          >
            <ClipboardCheck className="h-5 w-5 mr-2 inline shrink-0" aria-hidden />
            {t('mes.kiosk.reportOperation', 'Report operation')}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" className="min-h-12 w-full text-base" asChild>
          <Link href={rawMaterialsHref} data-testid="mes-kiosk-order-materials">
            <Package className="h-5 w-5 mr-2 inline" aria-hidden />
            {t('mes.kiosk.orderMaterials', 'Order raw materials')}
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onAndon}
          data-testid="mes-kiosk-andon-short"
        >
          {t('mes.kiosk.andonShort', 'Report issue…')}
        </Button>
      </div>
    </section>
  )
}
