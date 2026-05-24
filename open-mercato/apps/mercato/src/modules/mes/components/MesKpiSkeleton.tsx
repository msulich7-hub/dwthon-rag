"use client"

import { Skeleton } from '@open-mercato/ui/primitives/skeleton'

export function MesKpiSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="status" aria-busy="true" aria-label="Loading KPIs">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}
