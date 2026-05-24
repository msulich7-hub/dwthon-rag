"use client"

import { operationStatusClass } from '../lib/status-styles'
import { useT } from '@open-mercato/shared/lib/i18n/context'

export type MesOperationStep = {
  id: string
  sequence: number
  operationName: string
  status: string
}

type MesOperationStepperProps = {
  operations: MesOperationStep[]
  compact?: boolean
}

function stepState(status: string): 'done' | 'current' | 'upcoming' {
  if (status === 'completed' || status === 'skipped') return 'done'
  if (status === 'in_progress' || status === 'ready') return 'current'
  return 'upcoming'
}

export function MesOperationStepper({ operations, compact = false }: MesOperationStepperProps) {
  const t = useT()

  if (operations.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('mes.stepper.noOperations', 'No operations — release routing to start production.')}
      </p>
    )
  }

  const sorted = [...operations].sort((a, b) => a.sequence - b.sequence)

  return (
    <ol className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-2'}`} aria-label={t('mes.stepper.label', 'Operations')}>
      {sorted.map((op, index) => {
        const state = stepState(op.status)
        const connector =
          index < sorted.length - 1 ? (
            <span className="hidden sm:inline text-muted-foreground/50 px-0.5" aria-hidden>
              →
            </span>
          ) : null

        return (
          <li key={op.id} className="flex items-center gap-1">
            <span
              className={`inline-flex max-w-[140px] truncate items-center rounded-full border px-2 py-0.5 text-[11px] ${operationStatusClass(op.status)} ${
                state === 'current' ? 'ring-2 ring-primary/30' : ''
              }`}
              title={`${op.sequence}. ${op.operationName} (${op.status})`}
            >
              <span className="font-mono mr-1 opacity-70">{op.sequence}</span>
              {op.operationName}
            </span>
            {connector}
          </li>
        )
      })}
    </ol>
  )
}
