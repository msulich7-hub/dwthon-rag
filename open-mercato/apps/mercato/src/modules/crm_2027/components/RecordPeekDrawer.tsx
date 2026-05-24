"use client"

import * as React from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@open-mercato/ui/primitives/dialog'
import { Button } from '@open-mercato/ui/primitives/button'
import { cn } from '@open-mercato/shared/lib/utils'

export type RecordPeekData = {
  dealId: string
  title: string
  riskLevel?: string
  reasons?: string[]
  sentimentLabel?: string | null
  daysSinceLastActivity?: number | null
}

type RecordPeekDrawerProps = {
  record: RecordPeekData | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Twenty-style side panel peek — opens deal context without leaving the list. */
export function RecordPeekDrawer({ record, open, onOpenChange }: RecordPeekDrawerProps) {
  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-md sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:translate-x-0 sm:translate-y-0',
          'sm:h-screen sm:max-h-screen sm:rounded-none sm:rounded-l-2xl',
        )}
      >
        <DialogHeader>
          <DialogTitle>{record.title}</DialogTitle>
          <DialogDescription>Deal preview — CRM 2027</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3 text-sm">
          {record.riskLevel ? (
            <p>
              <span className="text-muted-foreground">Risk:</span>{' '}
              <strong>{record.riskLevel}</strong>
            </p>
          ) : null}
          {record.sentimentLabel ? (
            <p>
              <span className="text-muted-foreground">Sentiment:</span> {record.sentimentLabel}
            </p>
          ) : null}
          {record.daysSinceLastActivity != null ? (
            <p>
              <span className="text-muted-foreground">Idle days:</span>{' '}
              {record.daysSinceLastActivity}
            </p>
          ) : null}
          {record.reasons?.length ? (
            <p className="text-muted-foreground">{record.reasons.join(' · ')}</p>
          ) : null}
        </div>
        <div className="mt-6 flex gap-2">
          <Button type="button" asChild>
            <Link href={`/backend/customers/deals/${record.dealId}`}>Open full record</Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
