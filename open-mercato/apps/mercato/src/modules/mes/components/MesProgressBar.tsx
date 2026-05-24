"use client"

import { useT } from '@open-mercato/shared/lib/i18n/context'

type MesProgressBarProps = {
  percent: number
  label?: string
  showPercent?: boolean
}

export function MesProgressBar({ percent, label, showPercent = true }: MesProgressBarProps) {
  const t = useT()
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {label ? <span>{label}</span> : <span />}
          {showPercent ? (
            <span>
              {t('mes.progress.percent', '{percent}% complete', { percent: clamped })}
            </span>
          ) : null}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? t('mes.progress.aria', 'Production progress')}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
