"use client"

import * as React from 'react'
import { Factory } from 'lucide-react'

type MesEmptyStateProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

export function MesEmptyState({ title, description, action }: MesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Factory className="mb-3 size-10 text-muted-foreground/70" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
