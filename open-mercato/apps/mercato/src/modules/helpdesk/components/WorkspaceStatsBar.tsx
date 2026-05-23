"use client"

import { useT } from '@open-mercato/shared/lib/i18n/context'

export type WorkspaceStatsPayload = {
  total: number
  open: number
  inProgress: number
  waiting: number
  unassigned: number
  urgent: number
  slaBreached: number
}

type WorkspaceStatsBarProps = {
  stats: WorkspaceStatsPayload | null
}

export function WorkspaceStatsBar({ stats }: WorkspaceStatsBarProps) {
  const t = useT()
  if (!stats) return null

  const items = [
    { label: t('helpdesk.stats.open', 'Open'), value: stats.open, tone: 'text-sky-600' },
    { label: t('helpdesk.stats.inProgress', 'In progress'), value: stats.inProgress, tone: 'text-violet-600' },
    { label: t('helpdesk.stats.unassigned', 'Unassigned'), value: stats.unassigned, tone: 'text-amber-600' },
    { label: t('helpdesk.stats.urgent', 'Urgent'), value: stats.urgent, tone: 'text-destructive' },
    { label: t('helpdesk.stats.slaBreached', 'SLA breached'), value: stats.slaBreached, tone: 'text-destructive' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-helpdesk-stats="">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border bg-gradient-to-br from-card to-muted/30 px-4 py-3 shadow-sm"
        >
          <div className={`text-2xl font-semibold tabular-nums ${item.tone}`}>{item.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
