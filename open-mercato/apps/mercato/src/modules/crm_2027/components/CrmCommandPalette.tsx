"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@open-mercato/ui/primitives/dialog'
import { Input } from '@open-mercato/ui/primitives/input'
import { filterCrmCommands, type CrmCommandItem } from '../lib/crm-commands'

type CrmCommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Module-local Cmd+K palette — does not modify platform AppShell. */
export function CrmCommandPalette({ open, onOpenChange }: CrmCommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [index, setIndex] = React.useState(0)

  const items = React.useMemo(() => filterCrmCommands(query), [query])

  React.useEffect(() => {
    setIndex(0)
  }, [query])

  const run = React.useCallback(
    (item: CrmCommandItem) => {
      if (item.href) {
        router.push(item.href)
        onOpenChange(false)
        setQuery('')
      }
    },
    [router, onOpenChange],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-3">
        <DialogHeader>
          <DialogTitle>CRM 2027</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search commands…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((i) => Math.min(i + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter' && items[index]) {
              e.preventDefault()
              run(items[index])
            }
          }}
        />
        <ul className="max-h-72 overflow-y-auto text-sm divide-y">
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full px-2 py-2 text-left hover:bg-muted/60 ${i === index ? 'bg-muted' : ''}`}
                onClick={() => run(item)}
              >
                <span className="font-medium">{item.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.group}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
