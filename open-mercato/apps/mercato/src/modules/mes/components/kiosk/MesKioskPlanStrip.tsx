"use client"

import { CalendarClock } from 'lucide-react'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { getTimelineForNest } from '../../lib/kiosk-planning-mock'

type MesKioskPlanStripProps = {
  nestCode: string
  horizonHours: 8 | 72
  onHorizonChange: (h: 8 | 72) => void
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
  const rangeEnd =
    timeline.length > 0
      ? Math.max(...timeline.map((s) => s.end.getTime()), rangeStart + horizonHours * 3_600_000)
      : rangeStart + horizonHours * 3_600_000
  const span = Math.max(rangeEnd - rangeStart, 1)
  const nowLinePct = Math.min(98, Math.max(2, ((nowMs - rangeStart) / span) * 100))

  return (
    <section className="space-y-2" data-testid="mes-kiosk-plan-strip">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4" aria-hidden />
          {t('mes.kiosk.planTitle', 'Planned on this nest')}
        </h2>
        <div className="flex gap-1">
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
      <div className="relative h-24 rounded-lg border bg-muted/20">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${nowLinePct}%` }}
          title={t('mes.kiosk.timelineNow', 'Now')}
        />
        {timeline.map((slot) => {
          const left = ((slot.start.getTime() - rangeStart) / span) * 100
          const width = Math.max(8, ((slot.end.getTime() - slot.start.getTime()) / span) * 100)
          const isNow = slot.operationId === nowOperationId
          return (
            <button
              key={slot.operationId}
              type="button"
              className={`absolute top-2 bottom-2 rounded border text-left px-1 overflow-hidden ${
                isNow ? 'border-red-500 bg-red-50 dark:bg-red-950/40 z-[2]' : 'bg-card hover:bg-muted/80'
              } ${highlightedId === slot.operationId ? 'ring-2 ring-primary' : ''}`}
              style={{ left: `${Math.min(92, left)}%`, width: `${Math.min(40, width)}%` }}
              onClick={() => onSelect(slot.operationId)}
            >
              <p className="text-[9px] truncate font-medium">{slot.operationName}</p>
              <p className="text-[8px] text-muted-foreground truncate">
                {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(slot.start)}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
