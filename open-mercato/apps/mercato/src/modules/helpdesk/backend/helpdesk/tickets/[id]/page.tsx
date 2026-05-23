"use client"

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Button } from '@open-mercato/ui/primitives/button'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import { Label } from '@open-mercato/ui/primitives/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'
import { HelpdeskShell } from '../../../../components/HelpdeskShell'
import { priorityBadgeClass, slaBadgeClass, visibilityBadgeClass } from '../../../../components/ticket-ui'
import { slaRemainingLabel } from '../../../../lib/sla'

type TicketDetail = {
  id: string
  ticketKey: string
  subject: string
  description: string
  status: string
  priority: string
  visibility: string
  requesterType: string
  teamQueue: string
  slaDueAt: string | null
  firstRespondedAt: string | null
  reporterName: string | null
  reporterEmail: string | null
  comments: Array<{
    id: string
    body: string
    authorName: string | null
    isInternal: boolean
    createdAt: string
  }>
}

export default function HelpdeskTicketDetailPage() {
  const t = useT()
  const params = useParams()
  const ticketId = typeof params?.id === 'string' ? params.id : ''
  const [ticket, setTicket] = React.useState<TicketDetail | null>(null)
  const [publicReply, setPublicReply] = React.useState('')
  const [internalNote, setInternalNote] = React.useState('')
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

  const postComment = async (body: string, isInternal: boolean) => {
    await apiCall(`/api/helpdesk/tickets/${encodeURIComponent(ticketId)}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body, isInternal }),
    })
    if (isInternal) setInternalNote('')
    else setPublicReply('')
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

  const publicComments = ticket.comments.filter((c) => !c.isInternal)
  const internalComments = ticket.comments.filter((c) => c.isInternal)

  const slaState = slaRemainingLabel(ticket.slaDueAt)
  const slaClass = slaBadgeClass(ticket.slaDueAt)

  return (
    <Page>
      <PageHeader
        title={`${ticket.ticketKey} — ${ticket.subject}`}
        description={`${ticket.visibility === 'customer' ? t('helpdesk.visibility.customer', 'Customer') : t('helpdesk.visibility.internal', 'Internal')} · ${ticket.teamQueue}`}
      />
      <PageBody>
        <HelpdeskShell>
        <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs rounded-full border px-2 py-0.5 ${priorityBadgeClass(ticket.priority)}`}>
            {ticket.priority}
          </span>
          <span className={`text-xs rounded-full border px-2 py-0.5 ${visibilityBadgeClass(ticket.visibility)}`}>
            {ticket.visibility}
          </span>
          {slaClass && slaState ? (
            <span className={`text-xs rounded-full border px-2 py-0.5 ${slaClass}`}>
              {slaState === 'breached'
                ? t('helpdesk.sla.breached', 'SLA breached')
                : slaState === 'due_soon'
                  ? t('helpdesk.sla.dueSoon', 'Due soon')
                  : t('helpdesk.sla.onTrack', 'On track')}
              {ticket.slaDueAt ? ` · ${new Date(ticket.slaDueAt).toLocaleString()}` : ''}
            </span>
          ) : null}
        </div>
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
          {(ticket.reporterName || ticket.reporterEmail) && (
            <span className="text-sm text-muted-foreground">
              {t('helpdesk.ticket.requester', 'Requester')}: {ticket.reporterName ?? ticket.reporterEmail}
            </span>
          )}
        </div>

        <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap">{ticket.description}</div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">
            {t('helpdesk.ticket.publicThread', 'Replies to requester')}
          </h2>
          <ul className="space-y-2">
            {publicComments.map((item) => (
              <li key={item.id} className="rounded-lg border p-3 text-sm bg-card">
                <div className="text-xs text-muted-foreground mb-1">
                  {item.authorName ?? 'Agent'} · {new Date(item.createdAt).toLocaleString()}
                </div>
                {item.body}
              </li>
            ))}
          </ul>
          <div className="space-y-1">
            <Label>{t('helpdesk.ticket.replyToRequester', 'Reply to requester')}</Label>
            <Textarea value={publicReply} onChange={(e) => setPublicReply(e.target.value)} rows={3} />
            <Button
              type="button"
              variant="default"
              disabled={!publicReply.trim()}
              onClick={() => void postComment(publicReply, false)}
            >
              {t('helpdesk.ticket.sendReply', 'Send reply')}
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-dashed p-4 bg-muted/20">
          <h2 className="text-sm font-medium">{t('helpdesk.ticket.internalNotes', 'Internal notes')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('helpdesk.ticket.internalNotesHint', 'Not visible to customers (JSM internal comment).')}
          </p>
          <ul className="space-y-2">
            {internalComments.map((item) => (
              <li key={item.id} className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">
                  {item.authorName ?? 'Agent'} · {new Date(item.createdAt).toLocaleString()}
                </div>
                {item.body}
              </li>
            ))}
          </ul>
          <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} rows={3} />
          <Button
            type="button"
            variant="secondary"
            disabled={!internalNote.trim()}
            onClick={() => void postComment(internalNote, true)}
          >
            {t('helpdesk.ticket.addInternalNote', 'Add internal note')}
          </Button>
        </section>
        </div>
        </HelpdeskShell>
      </PageBody>
    </Page>
  )
}
