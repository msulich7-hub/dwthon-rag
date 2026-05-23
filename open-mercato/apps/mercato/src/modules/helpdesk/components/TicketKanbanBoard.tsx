"use client"

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { TicketCard } from './TicketCard'
import type { BoardTicket } from './ticket-ui'

export type KanbanColumnPayload = {
  status: string
  labelKey: string
  accentClass: string
  tickets: BoardTicket[]
}

type TicketKanbanBoardProps = {
  queue: string
  search: string
  includeClosed: boolean
  onTicketMoved?: () => void
}

export function TicketKanbanBoard({
  queue,
  search,
  includeClosed,
  onTicketMoved,
}: TicketKanbanBoardProps) {
  const t = useT()
  const [columns, setColumns] = React.useState<KanbanColumnPayload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)

  const loadBoard = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        queue,
        includeClosed: String(includeClosed),
      })
      if (search.trim()) params.set('search', search.trim())
      const { result } = await apiCall<{ columns: KanbanColumnPayload[] }>(
        `/api/helpdesk/agent/board?${params.toString()}`,
      )
      setColumns(Array.isArray(result?.columns) ? result.columns : [])
    } catch {
      setColumns([])
    } finally {
      setLoading(false)
    }
  }, [queue, search, includeClosed])

  React.useEffect(() => {
    void loadBoard()
  }, [loadBoard])

  const moveTicket = async (ticketId: string, status: string) => {
    await apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadBoard()
    onTicketMoved?.()
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-72 shrink-0 h-64 rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]"
      data-helpdesk-kanban=""
    >
      {columns.map((column) => (
        <section
          key={column.status}
          className={`w-72 shrink-0 flex flex-col rounded-xl border ${dropTarget === column.status ? 'ring-2 ring-primary' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setDropTarget(column.status)
          }}
          onDragLeave={() => setDropTarget((prev) => (prev === column.status ? null : prev))}
          onDrop={(e) => {
            e.preventDefault()
            const ticketId = e.dataTransfer.getData('text/plain') || draggingId
            setDropTarget(null)
            setDraggingId(null)
            if (ticketId) void moveTicket(ticketId, column.status)
          }}
        >
          <header className="flex items-center gap-2 px-3 py-2.5 border-b bg-muted/20 rounded-t-xl">
            <span className={`h-2 w-2 rounded-full ${column.accentClass ?? 'bg-primary'}`} />
            <h2 className="text-sm font-semibold flex-1">{t(column.labelKey, column.status)}</h2>
            <span className="text-xs tabular-nums text-muted-foreground bg-background border rounded-full px-2 py-0.5">
              {column.tickets.length}
            </span>
          </header>
          <div className="flex-1 space-y-2 p-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {column.tickets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-2">
                {t('helpdesk.kanban.dropHere', 'Drop tickets here')}
              </p>
            ) : (
              column.tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  draggable
                  onDragStart={() => setDraggingId(ticket.id)}
                  onDragEnd={() => setDraggingId(null)}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
