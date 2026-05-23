"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { HELPDESK_ROUTES } from '../../../lib/helpdesk-routes'

type QueueMeta = {
  id: string
  labelKey: string
  descriptionKey: string
  count: number
}

type TicketRow = {
  id: string
  ticketKey: string
  subject: string
  status: string
  priority: string
  visibility: string
  teamQueue: string
  updatedAt: string
}

export default function HelpdeskWorkspacePage() {
  const t = useT()
  const [queues, setQueues] = React.useState<QueueMeta[]>([])
  const [activeQueue, setActiveQueue] = React.useState('all')
  const [tickets, setTickets] = React.useState<TicketRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    void apiCall<{ queues: QueueMeta[] }>('/api/helpdesk/agent/queues')
      .then(({ result }) => setQueues(Array.isArray(result?.queues) ? result.queues : []))
      .catch(() => setError(t('helpdesk.tickets.loadError', 'Failed to load tickets')))
  }, [t])

  React.useEffect(() => {
    setError(null)
    void apiCall<{ tickets: TicketRow[] }>(`/api/helpdesk/tickets?queue=${encodeURIComponent(activeQueue)}`)
      .then(({ result }) => setTickets(Array.isArray(result?.tickets) ? result.tickets : []))
      .catch(() => setError(t('helpdesk.tickets.loadError', 'Failed to load tickets')))
  }, [activeQueue, t])

  return (
    <Page>
      <PageHeader
        title={t('helpdesk.workspace.title', 'Agent workspace')}
        description={t(
          'helpdesk.workspace.description',
          'Internal service desk — triage like Jira Service Management or Zammad agent view.',
        )}
      />
      <PageBody>
        <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="lg:w-56 shrink-0 space-y-1">
            {queues.map((queue) => (
              <button
                key={queue.id}
                type="button"
                onClick={() => setActiveQueue(queue.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                  activeQueue === queue.id ? 'bg-muted border-foreground/20' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{t(queue.labelKey, queue.id)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{queue.count}</span>
                </div>
              </button>
            ))}
          </nav>
          <div className="flex-1 min-w-0">
            {error ? <div className="text-sm text-destructive mb-4">{error}</div> : null}
            {tickets.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t('helpdesk.tickets.empty', 'No tickets in this queue.')}
              </div>
            ) : (
              <ul className="space-y-2">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={HELPDESK_ROUTES.ticket(ticket.id)}
                      className="block rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {ticket.ticketKey} — {ticket.subject}
                        </span>
                        <span className="text-xs rounded-full border px-2 py-0.5 capitalize">
                          {ticket.visibility === 'customer'
                            ? t('helpdesk.visibility.customer', 'Customer')
                            : t('helpdesk.visibility.internal', 'Internal')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize mt-1">
                        {ticket.status.replace('_', ' ')} · {ticket.priority} · {ticket.teamQueue}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PageBody>
    </Page>
  )
}
