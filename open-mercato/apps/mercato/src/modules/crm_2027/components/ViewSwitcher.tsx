"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@open-mercato/ui/primitives/button'
import { cn } from '@open-mercato/shared/lib/utils'

export type CrmViewMode = 'table' | 'kanban'

type ViewSwitcherProps = {
  basePath: string
  tableHref: string
  kanbanHref: string
  className?: string
}

export function ViewSwitcher({ basePath, tableHref, kanbanHref, className }: ViewSwitcherProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') as CrmViewMode | null) ?? 'table'
  const isKanban = view === 'kanban' || pathname.includes('/pipeline')

  return (
    <div className={cn('inline-flex rounded-lg border p-0.5', className)} role="tablist">
      <Button
        type="button"
        variant={!isKanban ? 'default' : 'ghost'}
        size="sm"
        asChild
      >
        <Link href={`${basePath}?view=table`}>Table</Link>
      </Button>
      <Button
        type="button"
        variant={isKanban ? 'default' : 'ghost'}
        size="sm"
        asChild
      >
        <Link href={kanbanHref}>Kanban</Link>
      </Button>
    </div>
  )
}
