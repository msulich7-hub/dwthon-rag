"use client"

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Button } from '@open-mercato/ui/primitives/button'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'

type TicketDetail = {
  id: string
  ticketKey: string
  subject: string
  description: string
  status: string
  priority: string
  comments: Array<{ id: string; body: string; authorName: string | null; createdAt: string }>
}

export default function HelpdeskTicketDetailPage() {
  const t = useT()
  const params = useParams()
  const ticketId = typeof params?.id === 'string' ? params.id : ''
  const [ticket, setTicket] = React.useState<TicketDetail | null>(null)
  const [comment, setComment] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!ticketId) return
    void apiCall<{ ticket: TicketDetail }>(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}`)
      .then(({ result }) => setTicket(result?.ticket ?? null))
      .catch(() => setError(t('helpdesk.ticket.notFound', 'Ticket not found')))
  }, [ticketId, t])

  React.useEffect(() => {
    load()
  }, [load])

  const updateStatus = async (status: string) => {
    await apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const submitComment = async () => {
    if (!comment.trim()) return
    await apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: comment.trim() }),
    })
    setComment('')
    load()
  }

  if (!ticket) {
    return (
      <Page>
        <PageBody>
          <div className="text-sm text-muted-foreground">
            {error ?? t('helpdesk.ticket.notFound', 'Ticket not found')}
          </div>
        </PageBody>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader title={`${ticket.ticketKey} — ${ticket.subject}`} />
      <PageBody className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">{t('helpdesk.ticket.status', 'Status')}</span>
          <Select value={ticket.status} onValueChange={(value) => void updateStatus(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground capitalize">
            {t('helpdesk.ticket.priority', 'Priority')}: {ticket.priority}
          </span>
        </div>

        <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap">{ticket.description}</div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">{t('helpdesk.ticket.comments', 'Comments')}</h2>
          <ul className="space-y-2">
            {ticket.comments.map((item) => (
              <li key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">
                  {item.authorName ?? 'Agent'} · {new Date(item.createdAt).toLocaleString()}
                </div>
                {item.body}
              </li>
            ))}
          </ul>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          <Button type="button" onClick={() => void submitComment()} disabled={!comment.trim()}>
            {t('helpdesk.ticket.addComment', 'Add comment')}
          </Button>
        </section>
      </PageBody>
    </Page>
  )
}
