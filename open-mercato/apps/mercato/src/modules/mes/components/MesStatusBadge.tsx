"use client"

import { operationStatusClass, workOrderStatusClass } from '../lib/status-styles'
import { useT } from '@open-mercato/shared/lib/i18n/context'

const OPERATION_LABEL_KEYS: Record<string, string> = {
  upcoming: 'mes.status.operation.upcoming',
  ready: 'mes.status.operation.ready',
  in_progress: 'mes.status.operation.in_progress',
  completed: 'mes.status.operation.completed',
  skipped: 'mes.status.operation.skipped',
  cancelled: 'mes.status.operation.cancelled',
  blocked: 'mes.status.operation.blocked',
}

type MesStatusBadgeProps = {
  status: string
  kind?: 'workOrder' | 'operation'
  label?: string
}

export function MesStatusBadge({ status, kind = 'workOrder', label }: MesStatusBadgeProps) {
  const t = useT()
  const tone = kind === 'operation' ? operationStatusClass(status) : workOrderStatusClass(status)
  let text = label ?? status
  if (!label && kind === 'operation') {
    const key = OPERATION_LABEL_KEYS[status]
    if (key) {
      const fallbacks: Record<string, string> = {
        upcoming: 'Upcoming',
        ready: 'Ready',
        in_progress: 'In progress',
        completed: 'Completed',
        skipped: 'Skipped',
        cancelled: 'Cancelled',
        blocked: 'Blocked',
      }
      text = t(key, fallbacks[status] ?? status)
    }
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {text}
    </span>
  )
}
