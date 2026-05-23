"use client"

import * as React from 'react'
import Link from 'next/link'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { HELPDESK_ROUTES } from '../lib/helpdesk-routes'
import {
  formatRelativeTime,
  priorityBadgeClass,
  priorityStyles,
  slaBadgeClass,
  visibilityBadgeClass,
  type BoardTicket,
} from './ticket-ui'
import { slaRemainingLabel } from '../lib/sla'

type TicketCardProps = {
  ticket: BoardTicket
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  compact?: boolean
}

export function TicketCard({
  ticket,
  draggable = false,
  onDragStart,
  onDragEnd,
  compact = false,
}: TicketCardProps) {
  const t = useT()
  const slaState = slaRemainingLabel(ticket.slaDueAt)
  const slaClass = slaBadgeClass(ticket.slaDueAt)

  return (
    <article
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', ticket.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={onDragEnd}
      className={`group rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md ${priorityStyles(ticket.priority)} ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      data-helpdesk-ticket-card={ticket.id}
    >
      <Link href={HELPDESK_ROUTES.ticket(ticket.id)} className="block p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-mono text-muted-foreground">{ticket.ticketKey}</span>
          <span className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(ticket.updatedAt)}</span>
        </div>
        <h3 className={`font-medium leading-snug ${compact ? 'text-sm' : 'text-sm'}`}>{ticket.subject}</h3>
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[10px] uppercase tracking-wide rounded-full border px-1.5 py-0.5 ${priorityBadgeClass(ticket.priority)}`}>
            {ticket.priority}
          </span>
          <span className={`text-[10px] rounded-full border px-1.5 py-0.5 ${visibilityBadgeClass(ticket.visibility)}`}>
            {ticket.visibility === 'customer'
              ? t('helpdesk.visibility.customer', 'Customer')
              : t('helpdesk.visibility.internal', 'Internal')}
          </span>
          <span className="text-[10px] rounded-full border px-1.5 py-0.5 bg-muted/60 text-muted-foreground capitalize">
            {ticket.teamQueue}
          </span>
          {slaClass && slaState ? (
            <span className={`text-[10px] rounded-full border px-1.5 py-0.5 ${slaClass}`}>
              {slaState === 'breached'
                ? t('helpdesk.sla.breached', 'SLA breached')
                : slaState === 'due_soon'
                  ? t('helpdesk.sla.dueSoon', 'Due soon')
                  : t('helpdesk.sla.onTrack', 'On track')}
            </span>
          ) : null}
        </div>
        {!ticket.assigneeUserId ? (
          <p className="text-[10px] text-amber-700 dark:text-amber-300">
            {t('helpdesk.card.unassigned', 'Unassigned')}
          </p>
        ) : null}
      </Link>
    </article>
  )
}
