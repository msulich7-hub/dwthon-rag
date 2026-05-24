"use client"

import { operationStatusClass, workOrderStatusClass } from '../lib/status-styles'

type MesStatusBadgeProps = {
  status: string
  kind?: 'workOrder' | 'operation'
  label?: string
}

export function MesStatusBadge({ status, kind = 'workOrder', label }: MesStatusBadgeProps) {
  const tone = kind === 'operation' ? operationStatusClass(status) : workOrderStatusClass(status)
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label ?? status}
    </span>
  )
}
