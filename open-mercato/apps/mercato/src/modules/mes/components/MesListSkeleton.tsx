"use client"

import { Skeleton } from '@open-mercato/ui/primitives/skeleton'

type MesListSkeletonProps = {
  rows?: number
}

export function MesListSkeleton({ rows = 3 }: MesListSkeletonProps) {
  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
