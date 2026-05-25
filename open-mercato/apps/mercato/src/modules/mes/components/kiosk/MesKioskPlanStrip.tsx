"use client"

import { CalendarClock } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { getTimelineForNest } from '../../lib/kiosk-planning-mock'
import type { KioskOperationView } from '../../lib/kiosk-planning-view-model'

type MesKioskPlanStripProps = {
  nestCode: string
  horizonHours: 8 | 72
  onHorizonChange: (h: 8 | 72) => void
  operations: KioskOperationView[]
  highlightedId: string | null
  onSelect: (id: string) => void
  nowOperationId: string | null
  locale: string
}

export function MesKioskPlanStrip({
  nestCode,
  horizonHours,
  onHorizonChange,
  highlightedId,
  onSelect,
  nowOperationId,
  locale,
}: MesKioskPlanStripProps) {
  const t = useT()
  const timeline = getTimelineForNest(nestCode, horizonHours)
  const nowMs = Date.now()
  const rangeStart = timeline[0]?.start.getTime() ?? nowMs
  const rangeEnd = rangeStart + horizonHours * 3_600_000
  const nowLinePct =
    timeline.length === 0
      ? 50
      : Math.min(98, Math.max(2, ((nowMs - rangeStart) / (rangeEnd - rangeStart)) * 100))

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4" aria-hidden />
          {t('mes.kiosk.planTitle', 'Planned on this nest')}
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={horizonHours === 8 ? 'secondary' : 'ghost'}
            onClick={() => onHorizonChange(8)}
          >
            {t('mes.kiosk.horizon8h', 'Next 8 h')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={horizonHours === 72 ? 'secondary' : 'ghost'}
            onClick={() => onHorizonChange(72)}
          >
            {t('mes.kiosk.horizon3d', '3 days')}
          </Button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary/30 -translate-y-1/2 pointer-events-none" />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
          style={{ left: `${nowLinePct}%` }}
          aria-hidden
        />
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x relative z-[1]">
          {timeline.map((slot) => {
            const isNow = slot.operationId === nowOperationId
            return (
              <button
                key={slot.operationId}
                type="button"
                className={`snap-start shrink-0 min-w-[9rem] rounded-lg border px-3 py-2 text-left transition-colors ${
                  isNow ? 'border-red-500 ring-2 ring-red-500/40 bg-red-50 dark:bg-red-950/30' : ''
                } ${highlightedId === slot.operationId ? 'border-primary ring-2 ring-primary' : 'bg-card hover:bg-muted/50'}`}
                onClick={() => onSelect(slot.operationId)}
              >
                <p className="text-[10px] uppercase text-muted-foreground">
                  {isNow ? t('mes.kiosk.timelineNow', 'Now') : ''}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(
                    slot.start,
                  )}
                </p>
                <p className="font-medium text-sm mt-0.5 line-clamp-2">{slot.operationName}</p>
                <p className="text-xs text-muted-foreground">{slot.orderNumber}</p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
