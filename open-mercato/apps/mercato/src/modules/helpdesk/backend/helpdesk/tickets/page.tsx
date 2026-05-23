"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'

type TicketRow = {
  id: string
  ticketKey: string
  subject: string
  status: string
  priority: string
  updatedAt: string
}

export default function HelpdeskTicketsPage() {
  const t = useT()
  const [tickets, setTickets] = React.useState<TicketRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void apiCall<{ tickets: TicketRow[] }>('/api/helpdesk/tickets')
      .then(({ result }) => setTickets(Array.isArray(result?.tickets) ? result.tickets : []))
      .catch(() => setError(t('helpdesk.tickets.loadError', 'Failed to load tickets')))
  }, [t])

  return (
    <Page>
      <PageHeader title={t('helpdesk.tickets.title', 'Tickets')} />
      <PageBody>
        {error ? <div className="text-sm text-destructive mb-4">{error}</div> : null}
        {tickets.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('helpdesk.tickets.empty', 'No tickets in this queue.')}</div>
        ) : (
          <ul className="space-y-2">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={HELPDESK_ROUTES.ticket(ticket.id)}
                  className="block rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="font-medium">
                    {ticket.ticketKey} — {ticket.subject}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {ticket.status.replace('_', ' ')} · {ticket.priority}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </Page>
  )
}
