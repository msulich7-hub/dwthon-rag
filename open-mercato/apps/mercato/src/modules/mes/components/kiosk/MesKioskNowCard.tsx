"use client"

import { CalendarClock, ArrowRight } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { MesStatusBadge } from '../MesStatusBadge'
import { getRoutingHintAfter, type KioskOperationView } from '../../lib/kiosk-planning-view-model'

type MesKioskNowCardProps = {
  op: KioskOperationView
  locale: string
  busyId: string | null
  onStart: () => void
  onComplete: () => void
  onAndon: () => void
}

function formatTimeRange(startIso: string, endIso: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`
}

export function MesKioskNowCard({ op, locale, busyId, onStart, onComplete, onAndon }: MesKioskNowCardProps) {
  const t = useT()
  const routingHint = getRoutingHintAfter(op.id)

  return (
    <section className="rounded-2xl border-4 border-foreground/80 bg-white dark:bg-zinc-950 p-6 md:p-8 shadow-xl space-y-5 min-h-[min(52vh,520px)] flex flex-col justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-foreground">
          {t('mes.kiosk.doNow', 'Do this now')}
        </p>
        <p className="text-3xl md:text-4xl font-bold mt-3 leading-tight text-foreground">{op.operationName}</p>
        <p className="text-xl text-muted-foreground mt-2">
          {op.orderNumber} · {op.productCode}
        </p>
        <p className="text-lg font-mono text-muted-foreground mt-1">
          {t('mes.kiosk.step', 'Step')} #{op.sequence}
        </p>
        <p className="text-base text-muted-foreground mt-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 shrink-0" aria-hidden />
          {formatTimeRange(op.scheduledStart, op.scheduledEnd, locale)}
        </p>
        <div className="mt-4">
          <MesStatusBadge status={op.displayStatus} kind="operation" />
        </div>
      </div>

      <div>
        <p className="text-base font-semibold mb-2">{t('mes.kiosk.materialsNeeded', 'Raw materials for this step')}</p>
        <ul className="rounded-xl border-2 divide-y-2 bg-zinc-50 dark:bg-zinc-900">
          {op.materials.map((m) => (
            <li key={m.code} className="px-4 py-4 flex justify-between gap-3 text-lg">
              <span>
                <span className="font-bold">{m.code}</span>
                <span className="text-muted-foreground"> — {m.name}</span>
              </span>
              <span className="text-muted-foreground shrink-0">{m.hint ?? t('mes.kiosk.unitPcs', 'pcs')}</span>
            </li>
          ))}
        </ul>
      </div>

      {routingHint ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          {t('mes.kiosk.nextRouting', 'After this: {op} @ {nest}', {
            op: routingHint.operationName,
            nest: routingHint.nestName,
          })}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-2">
        {op.canStart ? (
          <Button
            size="lg"
            className="min-h-20 w-full text-2xl font-bold"
            disabled={busyId === op.id}
            onClick={onStart}
          >
            {t('mes.kiosk.startDemo', 'Start (demo)')}
          </Button>
        ) : null}
        {op.canComplete ? (
          <Button
            size="lg"
            className="min-h-20 w-full text-2xl font-bold"
            disabled={busyId === op.id}
            onClick={onComplete}
          >
            {t('mes.kiosk.completeDemo', 'Complete (demo)')}
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="min-h-14 w-full text-lg" onClick={onAndon}>
          {t('mes.kiosk.andon', 'Report issue / missing material')}
        </Button>
      </div>
    </section>
  )
}
